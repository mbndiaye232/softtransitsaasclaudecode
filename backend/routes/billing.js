const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, tenantMiddleware, checkCreditAccess, requireSuperAdmin } = require('../middleware/auth');
const { checkCreditAlerts, resetAlertFlags, sendPurchaseReceipt } = require('../services/alertService');
const auditService = require('../services/auditService');

router.use(authMiddleware);
router.use(tenantMiddleware);

// ─── STATUT BILLING ──────────────────────────────────────────────────────────

/**
 * GET /api/billing/status
 * Retourne l'état complet de la facturation pour l'entreprise courante
 */
router.get('/status', async (req, res) => {
    try {
        // Étape 1 : colonnes de base (toujours présentes depuis migration 001)
        const [base] = await pool.query(
            `SELECT IDSociete, NomSociete,
                    COALESCE(credit_balance, 0) as credit_balance
             FROM structur WHERE IDSociete = ?`,
            [req.structur_id]
        );
        if (!base.length) return res.status(404).json({ error: 'Structure introuvable' });

        const s = { ...base[0] };

        // Étape 2 : colonnes billing (migration 022) — optionnelles
        try {
            const [ext] = await pool.query(
                `SELECT billing_mode, forfait_type, forfait_expires_at,
                        credit_alert_email,
                        alert_threshold_1, alert_threshold_2, alert_threshold_3,
                        alert_sent_1, alert_sent_2, alert_sent_3
                 FROM structur WHERE IDSociete = ?`,
                [req.structur_id]
            );
            if (ext.length) Object.assign(s, ext[0]);
        } catch (_) {
            // Colonnes billing absentes (migration 022 non appliquée) — valeurs par défaut
            s.billing_mode      = 'credits';
            s.forfait_type      = null;
            s.forfait_expires_at = null;
            s.credit_alert_email = null;
            s.alert_threshold_1 = 100;
            s.alert_threshold_2 = 50;
            s.alert_threshold_3 = 20;
            s.alert_sent_1 = 0;
            s.alert_sent_2 = 0;
            s.alert_sent_3 = 0;
        }

        // Étape 3 : consommation (table transactions)
        let consumptionRows = [{ total_consumed: 0, operation_count: 0 }];
        let recentPurchases = [];
        try {
            const [cr] = await pool.query(
                `SELECT SUM(ABS(credits)) as total_consumed, COUNT(*) as operation_count
                 FROM transactions
                 WHERE structur_id = ? AND type = 'USAGE'
                   AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
                [req.structur_id]
            );
            consumptionRows = cr;

            const [rp] = await pool.query(
                `SELECT id, credits,
                        COALESCE(amount_eur, 0) as amount_eur,
                        COALESCE(amount_cfa, 0) as amount_cfa,
                        COALESCE(payment_provider, '') as payment_provider,
                        status, created_at
                 FROM transactions
                 WHERE structur_id = ? AND type = 'PURCHASE' AND status = 'COMPLETED'
                 ORDER BY created_at DESC LIMIT 5`,
                [req.structur_id]
            );
            recentPurchases = rp;
        } catch (_) {
            // Table transactions ou colonnes absentes — on continue sans analytics
        }

        const avgDaily = consumptionRows[0]?.total_consumed
            ? consumptionRows[0].total_consumed / 30
            : null;
        const daysRemaining = avgDaily && s.credit_balance > 0
            ? Math.floor(s.credit_balance / avgDaily)
            : null;

        const forfaitExpired = s.forfait_type === 'annuel' && s.forfait_expires_at
            ? new Date(s.forfait_expires_at) < new Date()
            : false;

        res.json({
            billing_mode:       s.billing_mode      || 'credits',
            forfait_type:       s.forfait_type       || null,
            forfait_expires_at: s.forfait_expires_at || null,
            forfait_expired:    forfaitExpired,
            credit_balance:     parseFloat(s.credit_balance) || 0,
            credit_alert_email: s.credit_alert_email || null,
            thresholds: {
                level_1: s.alert_threshold_1 || 100,
                level_2: s.alert_threshold_2 || 50,
                level_3: s.alert_threshold_3 || 20,
            },
            alerts_sent: {
                level_1: !!s.alert_sent_1,
                level_2: !!s.alert_sent_2,
                level_3: !!s.alert_sent_3,
            },
            analytics: {
                consumed_30d:   parseFloat(consumptionRows[0]?.total_consumed || 0),
                operations_30d: parseInt(consumptionRows[0]?.operation_count  || 0),
                avg_daily:      avgDaily ? Math.round(avgDaily * 10) / 10 : null,
                days_remaining: daysRemaining,
            },
            recent_purchases: recentPurchases,
        });
    } catch (err) {
        console.error('Billing status error:', err);
        res.status(500).json({ error: 'Erreur serveur', details: err.message });
    }
});

// ─── CONSOMMATION (GRAPHIQUE) ────────────────────────────────────────────────

/**
 * GET /api/billing/consumption?period=30
 * Retourne la consommation journalière pour le graphique
 */
router.get('/consumption', async (req, res) => {
    const days = Math.min(parseInt(req.query.period) || 30, 365);
    try {
        const [rows] = await pool.query(
            `SELECT
               DATE(created_at) as date,
               SUM(ABS(credits)) as credits_used,
               COUNT(*) as operations
             FROM transactions
             WHERE structur_id = ?
               AND type = 'USAGE'
               AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY DATE(created_at)
             ORDER BY date ASC`,
            [req.structur_id, days]
        );

        const [byType] = await pool.query(
            `SELECT
               COALESCE(payment_provider, 'system') as operation_type,
               COUNT(*) as count,
               SUM(ABS(credits)) as total_credits
             FROM transactions
             WHERE structur_id = ?
               AND type = 'USAGE'
               AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY operation_type`,
            [req.structur_id, days]
        );

        res.json({ daily: rows, by_type: byType });
    } catch (err) {
        console.error('Consumption error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ─── TARIFS ──────────────────────────────────────────────────────────────────

/**
 * GET /api/billing/tarifs
 * Retourne la grille tarifaire (credit_rules) + consommation réelle par opération
 */
router.get('/tarifs', async (req, res) => {
    const days = Math.min(parseInt(req.query.period) || 30, 365);

    try {
        // Grille tarifaire
        let rules = [];
        try {
            const [r] = await pool.query(
                `SELECT operation_type, operation_name,
                        CAST(cost AS DECIMAL(10,2)) as cost,
                        is_active
                 FROM credit_rules
                 ORDER BY cost DESC, operation_name ASC`
            );
            rules = r;
        } catch (_) {
            // credit_rules absente : retourne les règles par défaut
            rules = [
                { operation_type: 'declaration_create', operation_name: 'Création de Déclaration',      cost: 10, is_active: 1 },
                { operation_type: 'dossier_create',     operation_name: 'Création de Dossier',           cost: 5,  is_active: 1 },
                { operation_type: 'bl_create',          operation_name: 'Création de Bill of Lading',    cost: 5,  is_active: 1 },
                { operation_type: 'facture_create',     operation_name: 'Création de Facture',            cost: 3,  is_active: 1 },
                { operation_type: 'cotation_create',    operation_name: 'Création de Cotation',           cost: 2,  is_active: 1 },
                { operation_type: 'dossier_update',     operation_name: 'Modification de Dossier',        cost: 1,  is_active: 1 },
                { operation_type: 'client_create',      operation_name: 'Création de Client',             cost: 1,  is_active: 1 },
            ];
        }

        // Consommation réelle sur la période, groupée par description/opération
        let usageByType = [];
        let usageDetail = [];
        try {
            // Groupé par description (nom de l'opération)
            const [byType] = await pool.query(
                `SELECT
                   COALESCE(description, 'Autre') as operation_name,
                   reference as operation_type,
                   COUNT(*)            as count,
                   SUM(ABS(credits))   as total_credits
                 FROM transactions
                 WHERE structur_id = ?
                   AND type = 'USAGE'
                   AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                 GROUP BY description, reference
                 ORDER BY total_credits DESC`,
                [req.structur_id, days]
            );
            usageByType = byType;

            // Détail : 50 dernières opérations
            const [detail] = await pool.query(
                `SELECT
                   id,
                   COALESCE(description, 'Opération') as operation_name,
                   reference,
                   ABS(credits)  as credits,
                   created_at
                 FROM transactions
                 WHERE structur_id = ?
                   AND type = 'USAGE'
                   AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                 ORDER BY created_at DESC
                 LIMIT 50`,
                [req.structur_id, days]
            );
            usageDetail = detail;
        } catch (_) {
            // Table transactions absente ou colonnes manquantes
        }

        const totalConsumed = usageByType.reduce((s, r) => s + parseFloat(r.total_credits || 0), 0);

        res.json({ rules, usageByType, usageDetail, totalConsumed, period: days });
    } catch (err) {
        console.error('Tarifs error:', err);
        res.status(500).json({ error: 'Erreur serveur', details: err.message });
    }
});

// ─── PACKS ───────────────────────────────────────────────────────────────────

/**
 * GET /api/billing/packs
 * Liste les packs de crédits disponibles
 */
router.get('/packs', async (req, res) => {
    try {
        const [packs] = await pool.query(
            'SELECT * FROM credit_packs WHERE is_active = 1 ORDER BY sort_order ASC'
        );
        res.json(packs);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ─── HISTORIQUE ───────────────────────────────────────────────────────────────

/**
 * GET /api/billing/history?type=PURCHASE&page=1&limit=20
 */
router.get('/history', async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const type = req.query.type; // PURCHASE | USAGE | REFUND

    try {
        let whereClause = 'WHERE t.structur_id = ?';
        const params = [req.structur_id];
        if (type) { whereClause += ' AND t.type = ?'; params.push(type); }

        // Tente la jointure credit_packs (migration 022), sinon requête simple
        let rows;
        try {
            [rows] = await pool.query(
                `SELECT t.*, cp.name as pack_name
                 FROM transactions t
                 LEFT JOIN credit_packs cp ON t.pack_id = cp.id
                 ${whereClause}
                 ORDER BY t.created_at DESC
                 LIMIT ? OFFSET ?`,
                [...params, limit, offset]
            );
        } catch (_) {
            [rows] = await pool.query(
                `SELECT t.* FROM transactions t
                 ${whereClause}
                 ORDER BY t.created_at DESC
                 LIMIT ? OFFSET ?`,
                [...params, limit, offset]
            );
        }

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) as total FROM transactions ${whereClause}`,
            params
        );

        res.json({ data: rows, total, page, limit, pages: Math.ceil(total / limit) });
    } catch (err) {
        console.error('History error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ─── ALERTES ─────────────────────────────────────────────────────────────────

/**
 * PUT /api/billing/alerts
 * Configure les seuils d'alerte et l'email
 */
router.put('/alerts', async (req, res) => {
    const { credit_alert_email, threshold_1, threshold_2, threshold_3 } = req.body;

    if (threshold_1 <= threshold_2 || threshold_2 <= threshold_3) {
        return res.status(400).json({
            error: 'Les seuils doivent être décroissants (seuil 1 > seuil 2 > seuil 3)'
        });
    }

    try {
        await pool.query(
            `UPDATE structur SET
               credit_alert_email = ?,
               alert_threshold_1 = ?,
               alert_threshold_2 = ?,
               alert_threshold_3 = ?,
               alert_sent_1 = 0, alert_sent_2 = 0, alert_sent_3 = 0
             WHERE IDSociete = ?`,
            [credit_alert_email || null, threshold_1 || 100, threshold_2 || 50, threshold_3 || 20, req.structur_id]
        );
        res.json({ message: 'Alertes configurées avec succès' });
    } catch (err) {
        console.error('Alert config error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ─── ACHAT CRÉDITS ───────────────────────────────────────────────────────────

/**
 * POST /api/billing/purchase/initiate
 * Lance un achat de crédits
 */
router.post('/purchase/initiate', async (req, res) => {
    const { pack_id, payment_provider, currency } = req.body;

    if (!pack_id || !payment_provider) {
        return res.status(400).json({ error: 'Pack et méthode de paiement requis' });
    }

    const validProviders = ['paypal', 'wave', 'orange_money', 'manuel'];
    if (!validProviders.includes(payment_provider)) {
        return res.status(400).json({ error: 'Méthode de paiement invalide' });
    }

    try {
        const [[pack]] = await pool.query(
            'SELECT * FROM credit_packs WHERE id = ? AND is_active = 1',
            [pack_id]
        );
        if (!pack) return res.status(404).json({ error: 'Pack introuvable' });

        const useCFA = currency === 'CFA' || !currency;
        const amount_eur = pack.price_eur;
        const amount_cfa = pack.price_cfa;
        const amount = useCFA ? amount_cfa : amount_eur;

        // Créer la transaction en PENDING
        const [result] = await pool.query(
            `INSERT INTO transactions
               (structur_id, amount, credits, type, status, payment_method,
                amount_eur, amount_cfa, pack_id, payment_provider, created_at)
             VALUES (?, ?, ?, 'PURCHASE', 'PENDING', ?, ?, ?, ?, ?, NOW())`,
            [req.structur_id, amount, pack.credits, payment_provider.toUpperCase(),
             amount_eur, amount_cfa, pack_id, payment_provider]
        );

        const transactionId = result.insertId;
        let paymentData = {};

        // Logique selon le fournisseur de paiement
        if (payment_provider === 'paypal') {
            paymentData = await initiatePayPal(transactionId, pack, amount_eur);
        } else if (payment_provider === 'wave') {
            paymentData = await initiateWave(transactionId, pack, amount_cfa, req.structur_id);
        } else if (payment_provider === 'orange_money') {
            paymentData = await initiateOrangeMoney(transactionId, pack, amount_cfa, req.structur_id);
        } else if (payment_provider === 'manuel') {
            paymentData = {
                instructions: `Effectuez un virement de ${amount_eur}€ / ${Number(amount_cfa).toLocaleString()} CFA avec la référence : TRX-${transactionId}`,
                bank_details: process.env.BANK_DETAILS || 'Coordonnées bancaires à configurer dans .env',
                reference: `TRX-${transactionId}`,
            };
        }

        // Sauvegarder l'URL/référence si dispo
        if (paymentData.payment_url || paymentData.provider_reference) {
            await pool.query(
                'UPDATE transactions SET payment_url = ?, provider_reference = ? WHERE id = ?',
                [paymentData.payment_url || null, paymentData.provider_reference || null, transactionId]
            );
        }

        res.status(201).json({
            transaction_id: transactionId,
            pack,
            payment_provider,
            amount_eur,
            amount_cfa,
            status: 'PENDING',
            payment_data: paymentData,
        });
    } catch (err) {
        console.error('Purchase initiate error:', err);
        res.status(500).json({ error: 'Erreur lors de l\'initiation du paiement' });
    }
});

/**
 * POST /api/billing/purchase/confirm
 * Confirme un paiement (webhook ou confirmation manuelle admin)
 */
router.post('/purchase/confirm', async (req, res) => {
    const { transaction_id, provider_reference } = req.body;
    if (!transaction_id) return res.status(400).json({ error: 'ID de transaction requis' });

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [[transaction]] = await connection.query(
            'SELECT * FROM transactions WHERE id = ? AND structur_id = ? FOR UPDATE',
            [transaction_id, req.structur_id]
        );

        if (!transaction) {
            await connection.rollback();
            return res.status(404).json({ error: 'Transaction introuvable' });
        }
        if (transaction.status === 'COMPLETED') {
            await connection.rollback();
            return res.status(400).json({ error: 'Transaction déjà complétée' });
        }

        // Mettre à jour la transaction
        await connection.query(
            `UPDATE transactions SET status = 'COMPLETED', provider_reference = COALESCE(?, provider_reference), updated_at = NOW()
             WHERE id = ?`,
            [provider_reference || null, transaction_id]
        );

        // Créditer le compte
        await connection.query(
            'UPDATE structur SET credit_balance = credit_balance + ? WHERE IDSociete = ?',
            [transaction.credits, req.structur_id]
        );

        // Réinitialiser les flags d'alerte (recharge => reset)
        await connection.query(
            'UPDATE structur SET alert_sent_1 = 0, alert_sent_2 = 0, alert_sent_3 = 0 WHERE IDSociete = ?',
            [req.structur_id]
        );

        await connection.commit();

        // Email de confirmation
        try {
            const [[structur]] = await pool.query(
                'SELECT NomSociete, credit_alert_email FROM structur WHERE IDSociete = ?',
                [req.structur_id]
            );
            const [[pack]] = await pool.query(
                'SELECT * FROM credit_packs WHERE id = ?',
                [transaction.pack_id]
            );
            const emailTo = structur.credit_alert_email || req.user.email;
            if (pack && emailTo) {
                await sendPurchaseReceipt(emailTo, structur.NomSociete, pack, {
                    ...transaction,
                    id: transaction_id,
                    provider_reference
                });
            }
        } catch (emailErr) {
            console.error('Receipt email error:', emailErr);
        }

        await auditService.log({
            agent_id: req.user.id,
            structur_id: req.structur_id,
            action: 'CREDIT_PURCHASE',
            resource_type: 'TRANSACTION',
            resource_id: transaction_id,
            details: { credits: transaction.credits, provider: transaction.payment_provider },
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
        });

        const [[updated]] = await pool.query(
            'SELECT credit_balance FROM structur WHERE IDSociete = ?',
            [req.structur_id]
        );

        res.json({
            message: `${transaction.credits} crédits ajoutés avec succès`,
            credits_added: transaction.credits,
            new_balance: parseFloat(updated.credit_balance),
        });
    } catch (err) {
        await connection.rollback();
        console.error('Purchase confirm error:', err);
        res.status(500).json({ error: 'Erreur lors de la confirmation' });
    } finally {
        connection.release();
    }
});

/**
 * POST /api/billing/purchase/cancel
 */
router.post('/purchase/cancel', async (req, res) => {
    const { transaction_id } = req.body;
    try {
        await pool.query(
            `UPDATE transactions SET status = 'CANCELLED', updated_at = NOW()
             WHERE id = ? AND structur_id = ? AND status = 'PENDING'`,
            [transaction_id, req.structur_id]
        );
        res.json({ message: 'Transaction annulée' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ─── FORFAIT ─────────────────────────────────────────────────────────────────

/**
 * GET /api/billing/forfait/options
 */
router.get('/forfait/options', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM forfait_config WHERE is_active = 1 ORDER BY price_cfa ASC'
        );
        if (rows.length) return res.json(rows);
    } catch (_) { /* table absente */ }

    // Fallback hardcodé avec les nouveaux prix
    res.json([
        { type: 'annuel',   label: 'Forfait Annuel',   description: 'Accès illimité pendant 12 mois',       price_eur: 610,  price_cfa: 400000,  duration_months: 12   },
        { type: 'indefini', label: 'Forfait Lifetime',  description: 'Accès illimité sans limite de durée',  price_eur: 4574, price_cfa: 3000000, duration_months: null },
    ]);
});

// ─── SUPER ADMIN ─────────────────────────────────────────────────────────────

/**
 * GET /api/billing/admin/companies
 * Liste toutes les entreprises avec leur état de facturation
 */
router.get('/admin/companies', requireSuperAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT
               s.IDSociete as id, s.NomSociete as name, s.Emailstructur as email,
               s.billing_mode, s.forfait_type, s.forfait_expires_at,
               s.credit_balance, s.is_active, s.trial_credits_given,
               s.is_provider, s.created_at,
               COUNT(DISTINCT a.IDAgents) as user_count,
               COUNT(DISTINCT d.IDDossiers) as dossier_count,
               SUM(CASE WHEN t.type='PURCHASE' AND t.status='COMPLETED' THEN t.amount_eur ELSE 0 END) as total_revenue_eur
             FROM structur s
             LEFT JOIN agents a ON a.structur_id = s.IDSociete AND a.is_active = 1
             LEFT JOIN dossiers d ON d.structur_id = s.IDSociete
             LEFT JOIN transactions t ON t.structur_id = s.IDSociete
             GROUP BY s.IDSociete
             ORDER BY s.is_provider DESC, s.created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error('Admin companies error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * PUT /api/billing/admin/companies/:id/mode
 * Changer le mode de facturation d'une entreprise
 */
router.put('/admin/companies/:id/mode', requireSuperAdmin, async (req, res) => {
    const { billing_mode, forfait_type, forfait_expires_at } = req.body;
    const companyId = req.params.id;

    if (!['credits', 'forfait'].includes(billing_mode)) {
        return res.status(400).json({ error: 'Mode invalide' });
    }

    try {
        await pool.query(
            `UPDATE structur SET
               billing_mode = ?,
               forfait_type = ?,
               forfait_expires_at = ?
             WHERE IDSociete = ?`,
            [billing_mode, forfait_type || null, forfait_expires_at || null, companyId]
        );

        if (billing_mode === 'forfait' && forfait_type) {
            await pool.query(
                `INSERT INTO forfait_history
                   (structur_id, forfait_type, amount_eur, amount_cfa, payment_method, starts_at, expires_at, created_by)
                 VALUES (?, ?, 0, 0, 'admin', NOW(), ?, ?)`,
                [companyId, forfait_type, forfait_expires_at || null, req.user.id]
            );
        }

        res.json({ message: 'Mode de facturation mis à jour' });
    } catch (err) {
        console.error('Admin mode update error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * PUT /api/billing/admin/companies/:id/provider
 * Promouvoir ou rétrograder une société en super admin
 */
router.put('/admin/companies/:id/provider', requireSuperAdmin, async (req, res) => {
    const { is_provider } = req.body;
    const companyId = req.params.id;

    // Empêcher de se rétrograder soi-même
    if (String(companyId) === String(req.user.structur_id) && !is_provider) {
        return res.status(400).json({ error: 'Vous ne pouvez pas vous rétrograder vous-même' });
    }

    try {
        await pool.query(
            'UPDATE structur SET is_provider = ? WHERE IDSociete = ?',
            [is_provider ? 1 : 0, companyId]
        );
        res.json({ message: is_provider ? 'Société promue super admin' : 'Statut super admin retiré' });
    } catch (err) {
        console.error('Provider toggle error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * POST /api/billing/admin/companies/:id/credit
 * Ajouter ou retirer des crédits manuellement
 */
router.post('/admin/companies/:id/credit', requireSuperAdmin, async (req, res) => {
    const { amount, reason } = req.body;
    const companyId = req.params.id;
    if (!amount) return res.status(400).json({ error: 'Montant requis' });

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(
            'UPDATE structur SET credit_balance = credit_balance + ? WHERE IDSociete = ?',
            [amount, companyId]
        );

        await connection.query(
            `INSERT INTO transactions
               (structur_id, amount, credits, type, status, payment_method, payment_provider, notes, created_at)
             VALUES (?, 0, ?, ?, 'COMPLETED', 'ADMIN', 'admin', ?, NOW())`,
            [companyId, amount, amount > 0 ? 'PURCHASE' : 'USAGE', reason || 'Ajustement manuel admin']
        );

        if (amount > 0) {
            await connection.query(
                'UPDATE structur SET alert_sent_1=0, alert_sent_2=0, alert_sent_3=0 WHERE IDSociete = ?',
                [companyId]
            );
        }

        await connection.commit();

        const [[updated]] = await pool.query(
            'SELECT credit_balance FROM structur WHERE IDSociete = ?',
            [companyId]
        );

        res.json({
            message: `${amount > 0 ? '+' : ''}${amount} crédits appliqués`,
            new_balance: parseFloat(updated.credit_balance)
        });
    } catch (err) {
        await connection.rollback();
        console.error('Admin credit error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    } finally {
        connection.release();
    }
});

/**
 * GET /api/billing/admin/packs — lister les packs
 * POST /api/billing/admin/packs — créer un pack
 * PUT /api/billing/admin/packs/:id — modifier un pack
 */
router.get('/admin/packs', requireSuperAdmin, async (req, res) => {
    const [packs] = await pool.query('SELECT * FROM credit_packs ORDER BY sort_order ASC');
    res.json(packs);
});

router.post('/admin/packs', requireSuperAdmin, async (req, res) => {
    const { name, credits, price_eur, price_cfa, is_popular, sort_order } = req.body;
    if (!name || !credits || !price_eur || !price_cfa) {
        return res.status(400).json({ error: 'Champs requis manquants' });
    }
    const [result] = await pool.query(
        'INSERT INTO credit_packs (name, credits, price_eur, price_cfa, is_popular, sort_order) VALUES (?,?,?,?,?,?)',
        [name, credits, price_eur, price_cfa, is_popular ? 1 : 0, sort_order || 0]
    );
    res.status(201).json({ id: result.insertId, message: 'Pack créé' });
});

router.put('/admin/packs/:id', requireSuperAdmin, async (req, res) => {
    const { name, credits, price_eur, price_cfa, is_popular, is_active, sort_order } = req.body;
    await pool.query(
        `UPDATE credit_packs SET name=?, credits=?, price_eur=?, price_cfa=?,
         is_popular=?, is_active=?, sort_order=? WHERE id=?`,
        [name, credits, price_eur, price_cfa, is_popular ? 1 : 0, is_active ? 1 : 0, sort_order || 0, req.params.id]
    );
    res.json({ message: 'Pack mis à jour' });
});

// ─── WEBHOOKS PAIEMENT ───────────────────────────────────────────────────────

/** PayPal IPN/Webhook */
router.post('/webhooks/paypal', async (req, res) => {
    // TODO: Vérifier la signature PayPal en production
    const { resource } = req.body;
    if (resource?.custom_id) {
        try {
            await confirmTransactionByReference(resource.custom_id, resource.id);
        } catch (e) { console.error('PayPal webhook error:', e); }
    }
    res.sendStatus(200);
});

/** Wave Webhook */
router.post('/webhooks/wave', async (req, res) => {
    const { data } = req.body;
    if (data?.client_reference) {
        try {
            await confirmTransactionByReference(data.client_reference, data.id);
        } catch (e) { console.error('Wave webhook error:', e); }
    }
    res.sendStatus(200);
});

/** Orange Money Webhook */
router.post('/webhooks/orange', async (req, res) => {
    const { notifToken, status } = req.body;
    if (notifToken && status === 'SUCCESS') {
        try {
            const [[t]] = await pool.query(
                'SELECT id, structur_id FROM transactions WHERE provider_reference = ? AND status = ?',
                [notifToken, 'PENDING']
            );
            if (t) await confirmTransactionById(t.id, t.structur_id, notifToken);
        } catch (e) { console.error('Orange webhook error:', e); }
    }
    res.sendStatus(200);
});

// ─── HELPERS PAIEMENT ────────────────────────────────────────────────────────

async function initiatePayPal(transactionId, pack, amountEur) {
    // Intégration PayPal REST API v2
    // En production: utiliser le SDK paypal-rest-sdk ou @paypal/checkout-server-sdk
    const paypalClientId = process.env.PAYPAL_CLIENT_ID;
    const paypalSecret = process.env.PAYPAL_SECRET;
    const paypalBase = process.env.PAYPAL_ENV === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    if (!paypalClientId || !paypalSecret) {
        return {
            payment_url: null,
            instructions: 'PayPal non configuré. Contactez l\'administrateur.',
            provider_reference: null,
        };
    }

    try {
        const axios = require('axios');

        // Obtenir token d'accès
        const tokenRes = await axios.post(
            `${paypalBase}/v1/oauth2/token`,
            'grant_type=client_credentials',
            { auth: { username: paypalClientId, password: paypalSecret } }
        );
        const accessToken = tokenRes.data.access_token;

        // Créer l'ordre PayPal
        const orderRes = await axios.post(
            `${paypalBase}/v2/checkout/orders`,
            {
                intent: 'CAPTURE',
                purchase_units: [{
                    custom_id: String(transactionId),
                    amount: { currency_code: 'EUR', value: amountEur.toFixed(2) },
                    description: `Soft Transit - ${pack.name} (${pack.credits} crédits)`,
                }],
                application_context: {
                    return_url: `${process.env.FRONTEND_URL}/billing/payment/success?txn=${transactionId}`,
                    cancel_url: `${process.env.FRONTEND_URL}/billing/payment/cancel?txn=${transactionId}`,
                },
            },
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const approveLink = orderRes.data.links.find(l => l.rel === 'approve');
        return {
            payment_url: approveLink?.href,
            provider_reference: orderRes.data.id,
        };
    } catch (e) {
        console.error('PayPal order error:', e.response?.data || e.message);
        return { payment_url: null, provider_reference: null, error: 'Erreur PayPal' };
    }
}

async function initiateWave(transactionId, pack, amountCfa, structurId) {
    const waveApiKey = process.env.WAVE_API_KEY;
    if (!waveApiKey) {
        return {
            instructions: 'Wave non configuré. Contactez l\'administrateur.',
            provider_reference: null,
        };
    }

    try {
        const axios = require('axios');
        const res = await axios.post(
            'https://api.wave.com/v1/checkout/sessions',
            {
                amount: String(amountCfa),
                currency: 'XOF',
                client_reference: String(transactionId),
                success_url: `${process.env.FRONTEND_URL}/billing/payment/success?txn=${transactionId}`,
                error_url: `${process.env.FRONTEND_URL}/billing/payment/cancel?txn=${transactionId}`,
            },
            { headers: { Authorization: `Bearer ${waveApiKey}` } }
        );
        return {
            payment_url: res.data.wave_launch_url,
            provider_reference: res.data.id,
        };
    } catch (e) {
        console.error('Wave error:', e.response?.data || e.message);
        return { payment_url: null, provider_reference: null, error: 'Erreur Wave' };
    }
}

async function initiateOrangeMoney(transactionId, pack, amountCfa, structurId) {
    const omToken = process.env.ORANGE_MONEY_TOKEN;
    const omMerchantKey = process.env.ORANGE_MONEY_MERCHANT_KEY;
    if (!omToken) {
        return {
            instructions: 'Orange Money non configuré. Contactez l\'administrateur.',
            provider_reference: null,
        };
    }

    try {
        const axios = require('axios');
        const res = await axios.post(
            'https://api.orange.com/orange-money-webpay/dev/v1/webpayment',
            {
                merchant_key: omMerchantKey,
                currency: 'OUV',
                order_id: String(transactionId),
                amount: String(amountCfa),
                return_url: `${process.env.FRONTEND_URL}/billing/payment/success?txn=${transactionId}`,
                cancel_url: `${process.env.FRONTEND_URL}/billing/payment/cancel?txn=${transactionId}`,
                notif_url: `${process.env.BACKEND_URL}/api/billing/webhooks/orange`,
                lang: 'fr',
            },
            { headers: { Authorization: `Bearer ${omToken}` } }
        );
        return {
            payment_url: res.data.payment_url,
            provider_reference: res.data.pay_token,
        };
    } catch (e) {
        console.error('Orange Money error:', e.response?.data || e.message);
        return { payment_url: null, provider_reference: null, error: 'Erreur Orange Money' };
    }
}

async function confirmTransactionByReference(clientRef, providerRef) {
    const [[t]] = await pool.query(
        'SELECT id, structur_id, credits FROM transactions WHERE id = ? AND status = ?',
        [clientRef, 'PENDING']
    );
    if (t) await confirmTransactionById(t.id, t.structur_id, providerRef);
}

async function confirmTransactionById(transactionId, structurId, providerRef) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [[t]] = await connection.query(
            'SELECT * FROM transactions WHERE id = ? AND status = ? FOR UPDATE',
            [transactionId, 'PENDING']
        );
        if (!t) { await connection.rollback(); return; }

        await connection.query(
            `UPDATE transactions SET status='COMPLETED', provider_reference=?, updated_at=NOW() WHERE id=?`,
            [providerRef, transactionId]
        );
        await connection.query(
            'UPDATE structur SET credit_balance = credit_balance + ? WHERE IDSociete = ?',
            [t.credits, structurId]
        );
        await connection.query(
            'UPDATE structur SET alert_sent_1=0, alert_sent_2=0, alert_sent_3=0 WHERE IDSociete=?',
            [structurId]
        );
        await connection.commit();
    } catch (e) {
        await connection.rollback();
        throw e;
    } finally {
        connection.release();
    }
}

// ─── DEMANDES DE CHANGEMENT DE MODE (CLIENT) ────────────────────────────────

/**
 * POST /api/billing/request-mode
 * Le client ADMIN soumet une demande de changement de mode
 */
router.post('/request-mode', async (req, res) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Réservé à l\'administrateur de l\'entreprise' });
    }

    const { requested_mode, requested_forfait_type, message } = req.body;

    if (!['credits', 'forfait'].includes(requested_mode)) {
        return res.status(400).json({ error: 'Mode invalide' });
    }

    try {
        const [[structur]] = await pool.query(
            'SELECT billing_mode FROM structur WHERE IDSociete = ?',
            [req.structur_id]
        );

        if (structur.billing_mode === requested_mode) {
            return res.status(400).json({ error: 'Votre compte est déjà en mode ' + requested_mode });
        }

        // Vérifier s'il n'y a pas déjà une demande en attente
        const [[pending]] = await pool.query(
            'SELECT id FROM billing_requests WHERE structur_id = ? AND status = ?',
            [req.structur_id, 'pending']
        );
        if (pending) {
            return res.status(400).json({ error: 'Vous avez déjà une demande en attente de traitement' });
        }

        const [result] = await pool.query(
            `INSERT INTO billing_requests
               (structur_id, agent_id, current_mode, requested_mode, requested_forfait_type, message)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.structur_id, req.user.id, structur.billing_mode,
             requested_mode, requested_forfait_type || null, message || null]
        );

        // Notifier le super admin par email (via mailer partagé → Brevo si configuré)
        try {
            const { sendMail } = require('../services/mailer');
            const adminEmails = await pool.query(
                "SELECT a.Email FROM agents a JOIN structur s ON a.structur_id=s.IDSociete WHERE s.is_provider=1 AND a.role='ADMIN' AND a.is_active=1"
            );
            const targets = (adminEmails[0] || []).map(r => r.Email).filter(Boolean);
            if (targets.length > 0) {
                await sendMail({
                    to: targets,
                    subject: `[Demande] Changement de mode facturation — ${req.user.name}`,
                    html: `<p>Nouvelle demande de changement de mode :</p>
                           <ul>
                             <li>Entreprise : <strong>${req.structur_id}</strong></li>
                             <li>Mode actuel : <strong>${structur.billing_mode}</strong></li>
                             <li>Mode demandé : <strong>${requested_mode}${requested_forfait_type ? ' (' + requested_forfait_type + ')' : ''}</strong></li>
                             <li>Message : ${message || '—'}</li>
                           </ul>
                           <a href="${process.env.FRONTEND_URL}/admin/billing">Traiter la demande →</a>`,
                });
            }
        } catch (emailErr) {
            console.error('Notification email error:', emailErr);
        }

        res.status(201).json({ id: result.insertId, message: 'Demande envoyée avec succès' });
    } catch (err) {
        console.error('Request mode error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * GET /api/billing/request-mode
 * Historique des demandes de l'entreprise courante
 */
router.get('/request-mode', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT br.*, a.NomAgent as handled_by_name
             FROM billing_requests br
             LEFT JOIN agents a ON a.IDAgents = br.handled_by
             WHERE br.structur_id = ?
             ORDER BY br.created_at DESC`,
            [req.structur_id]
        );
        res.json(rows);
    } catch (err) {
        // Table billing_requests absente (migration 023 non appliquée)
        console.warn('billing_requests table missing or error:', err.message);
        res.json([]); // Retourne tableau vide au lieu de 500
    }
});

/**
 * GET /api/billing/admin/requests
 * Toutes les demandes en attente (super admin)
 */
router.get('/admin/requests', requireSuperAdmin, async (req, res) => {
    const status = req.query.status || 'pending';
    try {
        const [rows] = await pool.query(
            `SELECT br.*, s.NomSociete as company_name, s.Emailstructur as company_email,
                    a.NomAgent as requester_name, a.Email as requester_email
             FROM billing_requests br
             JOIN structur s ON br.structur_id = s.IDSociete
             JOIN agents a ON br.agent_id = a.IDAgents
             WHERE br.status = ?
             ORDER BY br.created_at DESC`,
            [status]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/**
 * PUT /api/billing/admin/requests/:id
 * Approuver ou rejeter une demande (super admin)
 */
router.put('/admin/requests/:id', requireSuperAdmin, async (req, res) => {
    const { action, admin_notes, forfait_expires_at } = req.body; // action: 'approve' | 'reject'
    if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Action invalide' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [[request]] = await connection.query(
            'SELECT * FROM billing_requests WHERE id = ? AND status = ? FOR UPDATE',
            [req.params.id, 'pending']
        );
        if (!request) {
            await connection.rollback();
            return res.status(404).json({ error: 'Demande introuvable ou déjà traitée' });
        }

        // Mettre à jour la demande
        await connection.query(
            `UPDATE billing_requests SET
               status = ?, admin_notes = ?, handled_by = ?, handled_at = NOW()
             WHERE id = ?`,
            [action === 'approve' ? 'approved' : 'rejected', admin_notes || null, req.user.id, req.params.id]
        );

        // Si approuvée : appliquer le changement de mode
        if (action === 'approve') {
            const expiresAt = request.requested_mode === 'forfait' && request.requested_forfait_type === 'annuel'
                ? (forfait_expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
                : null;

            await connection.query(
                `UPDATE structur SET
                   billing_mode = ?,
                   forfait_type = ?,
                   forfait_expires_at = ?
                 WHERE IDSociete = ?`,
                [request.requested_mode, request.requested_forfait_type || null, expiresAt, request.structur_id]
            );

            if (request.requested_mode === 'forfait' && request.requested_forfait_type) {
                await connection.query(
                    `INSERT INTO forfait_history
                       (structur_id, forfait_type, amount_eur, amount_cfa, payment_method, starts_at, expires_at, created_by)
                     VALUES (?, ?, 0, 0, 'request_approved', NOW(), ?, ?)`,
                    [request.structur_id, request.requested_forfait_type, expiresAt, req.user.id]
                );
                // Réinitialiser les alertes de renouvellement précédentes
                await connection.query(
                    'DELETE FROM forfait_renewal_alerts WHERE structur_id = ?',
                    [request.structur_id]
                );
            }
        }

        await connection.commit();

        // Notifier le client par email (via mailer partagé → Brevo si configuré)
        try {
            const { sendMail } = require('../services/mailer');
            const [[agent]] = await pool.query(
                'SELECT Email, NomAgent FROM agents WHERE IDAgents = ?', [request.agent_id]
            );
            if (agent && agent.Email) {
                const approved = action === 'approve';
                await sendMail({
                    to: agent.Email,
                    subject: `Votre demande de changement de mode a été ${approved ? 'approuvée' : 'refusée'}`,
                    html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;">
                      <div style="background:${approved ? '#16a34a' : '#dc2626'};color:white;padding:18px;border-radius:8px 8px 0 0;">
                        <h2 style="margin:0;">${approved ? '✅ Demande approuvée' : '❌ Demande refusée'}</h2>
                      </div>
                      <div style="padding:20px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px;">
                        <p>Bonjour ${agent.NomAgent},</p>
                        <p>Votre demande de passage en mode <strong>${request.requested_mode}</strong> a été <strong>${approved ? 'approuvée' : 'refusée'}</strong>.</p>
                        ${admin_notes ? `<p><em>Message de l'administrateur : "${admin_notes}"</em></p>` : ''}
                        <a href="${process.env.FRONTEND_URL}/billing"
                           style="background:${approved ? '#16a34a' : '#6b7280'};color:white;padding:10px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px;">
                          Voir mon espace facturation
                        </a>
                      </div>
                    </div>`
                });
            }
        } catch (emailErr) {
            console.error('Client notification error:', emailErr);
        }

        res.json({ message: `Demande ${action === 'approve' ? 'approuvée' : 'refusée'} avec succès` });
    } catch (err) {
        await connection.rollback();
        console.error('Handle request error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    } finally {
        connection.release();
    }
});

// ─── ADMIN : GRILLE TARIFAIRE (credit_rules) ─────────────────────────────────

/** GET /api/billing/admin/credit-rules */
router.get('/admin/credit-rules', requireSuperAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM credit_rules ORDER BY cost DESC, operation_name ASC'
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/** POST /api/billing/admin/credit-rules */
router.post('/admin/credit-rules', requireSuperAdmin, async (req, res) => {
    const { operation_type, operation_name, cost, is_active } = req.body;
    if (!operation_type || !operation_name || cost == null)
        return res.status(400).json({ error: 'Champs requis : operation_type, operation_name, cost' });
    try {
        const [r] = await pool.query(
            'INSERT INTO credit_rules (operation_type, operation_name, cost, is_active) VALUES (?, ?, ?, ?)',
            [operation_type.trim(), operation_name.trim(), parseFloat(cost), is_active ? 1 : 1]
        );
        res.status(201).json({ id: r.insertId, operation_type, operation_name, cost: parseFloat(cost), is_active: 1 });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY')
            return res.status(409).json({ error: `Le code opération "${operation_type}" existe déjà` });
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/** PUT /api/billing/admin/credit-rules/:id */
router.put('/admin/credit-rules/:id', requireSuperAdmin, async (req, res) => {
    const { operation_type, operation_name, cost, is_active } = req.body;
    try {
        await pool.query(
            'UPDATE credit_rules SET operation_type=?, operation_name=?, cost=?, is_active=? WHERE id=?',
            [operation_type.trim(), operation_name.trim(), parseFloat(cost), is_active ? 1 : 0, req.params.id]
        );
        res.json({ message: 'Règle mise à jour' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY')
            return res.status(409).json({ error: `Le code opération "${operation_type}" existe déjà` });
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/** DELETE /api/billing/admin/credit-rules/:id */
router.delete('/admin/credit-rules/:id', requireSuperAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM credit_rules WHERE id = ?', [req.params.id]);
        res.json({ message: 'Règle supprimée' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ─── ADMIN : SUPER ADMINS ─────────────────────────────────────────────────────

/** GET /api/billing/admin/super-admins — tous les agents ADMIN/SUPER_ADMIN toutes sociétés */
router.get('/admin/super-admins', requireSuperAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT a.IDAgents, a.NomAgent, a.Email, a.role, s.NomSociete as company_name
            FROM agents a
            JOIN structur s ON a.structur_id = s.IDSociete
            WHERE a.role IN ('ADMIN','SUPER_ADMIN')
            ORDER BY a.role DESC, a.NomAgent ASC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/** PUT /api/billing/admin/super-admins/:id — promouvoir / révoquer SUPER_ADMIN */
router.put('/admin/super-admins/:id', requireSuperAdmin, async (req, res) => {
    const agentId = req.params.id;
    const { grant } = req.body;
    if (String(agentId) === String(req.user.id))
        return res.status(400).json({ error: 'Vous ne pouvez pas modifier votre propre rôle' });
    try {
        const newRole = grant ? 'SUPER_ADMIN' : 'ADMIN';
        const [result] = await pool.query('UPDATE agents SET role = ? WHERE IDAgents = ?', [newRole, agentId]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Agent introuvable' });
        res.json({ message: `Rôle mis à jour : ${newRole}` });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ─── ADMIN : CONFIGURATION FORFAITS ──────────────────────────────────────────

/** GET /api/billing/admin/forfait-config */
router.get('/admin/forfait-config', requireSuperAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM forfait_config ORDER BY price_cfa ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/** POST /api/billing/admin/forfait-config */
router.post('/admin/forfait-config', requireSuperAdmin, async (req, res) => {
    const { type, label, description, price_eur, price_cfa, duration_months, is_active } = req.body;
    if (!type || !label || !price_eur || !price_cfa)
        return res.status(400).json({ error: 'Champs obligatoires : type, label, price_eur, price_cfa' });
    const slug = type.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!slug) return res.status(400).json({ error: 'Type invalide' });
    try {
        await pool.query(
            `INSERT INTO forfait_config (type, label, description, price_eur, price_cfa, duration_months, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [slug, label, description || null, parseFloat(price_eur), parseInt(price_cfa),
             duration_months ? parseInt(duration_months) : null, is_active !== undefined ? (is_active ? 1 : 0) : 1]
        );
        res.json({ message: 'Forfait créé', type: slug });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY')
            return res.status(409).json({ error: `Un forfait avec le type "${slug}" existe déjà` });
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/** PUT /api/billing/admin/forfait-config/:type */
router.put('/admin/forfait-config/:type', requireSuperAdmin, async (req, res) => {
    const { label, description, price_eur, price_cfa, duration_months, is_active } = req.body;
    const type = req.params.type;
    try {
        const [existing] = await pool.query('SELECT id FROM forfait_config WHERE type = ?', [type]);
        if (!existing.length)
            return res.status(404).json({ error: 'Forfait introuvable' });
        await pool.query(
            `UPDATE forfait_config SET
               label=?, description=?, price_eur=?, price_cfa=?,
               duration_months=?, is_active=?
             WHERE type=?`,
            [label, description || null, parseFloat(price_eur), parseInt(price_cfa),
             duration_months ? parseInt(duration_months) : null, is_active ? 1 : 0, type]
        );
        res.json({ message: 'Forfait mis à jour' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

/** DELETE /api/billing/admin/forfait-config/:type */
router.delete('/admin/forfait-config/:type', requireSuperAdmin, async (req, res) => {
    const type = req.params.type;
    try {
        const [inUse] = await pool.query(
            'SELECT COUNT(*) as cnt FROM structr WHERE forfait_type = ? AND billing_mode = "forfait"', [type]
        );
        if (inUse[0].cnt > 0)
            return res.status(409).json({ error: `Ce forfait est actuellement actif pour ${inUse[0].cnt} entreprise(s). Changez leur mode de facturation avant de supprimer.` });
        const [result] = await pool.query('DELETE FROM forfait_config WHERE type = ?', [type]);
        if (!result.affectedRows)
            return res.status(404).json({ error: 'Forfait introuvable' });
        res.json({ message: 'Forfait supprimé' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
