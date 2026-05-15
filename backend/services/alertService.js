const pool = require('../config/database');
const { sendMail } = require('./mailer');

/**
 * Vérifie les seuils d'alerte après chaque débit de crédit
 * @param {number} structur_id
 * @param {number} newBalance - nouveau solde après débit
 */
async function checkCreditAlerts(structur_id, newBalance) {
    try {
        const [rows] = await pool.query(
            `SELECT s.*, a.Email as admin_email, a.NomAgent as admin_name
             FROM structur s
             LEFT JOIN agents a ON a.structur_id = s.IDSociete AND a.role = 'ADMIN' AND a.is_active = 1
             WHERE s.IDSociete = ? AND s.billing_mode = 'credits'
             LIMIT 1`,
            [structur_id]
        );
        if (!rows.length) return;

        const s = rows[0];
        const alertEmail = s.credit_alert_email || s.admin_email;
        if (!alertEmail) return;

        const thresholds = [
            { level: 1, value: s.alert_threshold_1, sent: s.alert_sent_1 },
            { level: 2, value: s.alert_threshold_2, sent: s.alert_sent_2 },
            { level: 3, value: s.alert_threshold_3, sent: s.alert_sent_3 },
        ];

        for (const t of thresholds) {
            if (!t.value || t.sent) continue;
            if (newBalance <= t.value && newBalance > 0) {
                await sendThresholdAlert(structur_id, alertEmail, s.NomSociete, t.level, t.value, newBalance);
                await pool.query(
                    `UPDATE structur SET alert_sent_${t.level} = 1 WHERE IDSociete = ?`,
                    [structur_id]
                );
                await pool.query(
                    `INSERT INTO credit_alert_logs (structur_id, threshold_level, threshold_value, credit_balance_at_alert)
                     VALUES (?, ?, ?, ?)`,
                    [structur_id, t.level, t.value, newBalance]
                );
            } else if (newBalance === 0) {
                await sendEmptyAlert(structur_id, alertEmail, s.NomSociete);
                break;
            }
        }
    } catch (err) {
        console.error('Alert check error:', err);
    }
}

/**
 * Réinitialise les flags d'alerte quand des crédits sont rechargés
 */
async function resetAlertFlags(structur_id) {
    await pool.query(
        `UPDATE structur SET alert_sent_1 = 0, alert_sent_2 = 0, alert_sent_3 = 0 WHERE IDSociete = ?`,
        [structur_id]
    );
}

async function sendThresholdAlert(structur_id, email, companyName, level, threshold, balance) {
    const colors = { 1: '#f59e0b', 2: '#f97316', 3: '#ef4444' };
    const color = colors[level] || '#ef4444';
    const urgencyLabels = { 1: 'Attention', 2: 'Urgent', 3: 'Critique' };
    const urgency = urgencyLabels[level] || 'Alerte';

    await sendMail({
        to: email,
        subject: `[${urgency}] Crédits faibles - ${companyName} (${balance} crédits restants)`,
        html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
          <div style="background: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin:0; font-size:22px;">⚠️ Alerte Crédits - Niveau ${level}</h1>
          </div>
          <div style="background: #f9f9f9; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p>Bonjour,</p>
            <p>Le solde de crédits de votre compte <strong>${companyName}</strong> est passé en dessous du seuil configuré.</p>
            <div style="background: white; border: 2px solid ${color}; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <div style="font-size: 14px; color: #6b7280;">Solde actuel</div>
              <div style="font-size: 48px; font-weight: bold; color: ${color};">${balance}</div>
              <div style="font-size: 14px; color: #6b7280;">crédits</div>
              <div style="margin-top: 8px; font-size: 12px; color: #9ca3af;">Seuil d'alerte : ${threshold} crédits</div>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              ${level === 3
                ? 'Votre solde est <strong>critique</strong>. Rechargez immédiatement pour continuer à utiliser toutes les fonctionnalités.'
                : 'Nous vous recommandons de recharger vos crédits prochainement pour éviter toute interruption de service.'}
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${process.env.FRONTEND_URL}/billing" style="background: ${color}; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                Recharger mes crédits
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="font-size: 12px; color: #9ca3af;">
              Vous recevez cet email car vous avez configuré des alertes de crédit sur Soft Transit SaaS.<br>
              Pour modifier vos préférences, rendez-vous dans <a href="${process.env.FRONTEND_URL}/billing">Paramètres de facturation</a>.
            </p>
          </div>
        </div>`
    });

    await logAlertToDb(structur_id, `THRESHOLD_${level}`, balance, threshold);
}

async function sendEmptyAlert(structur_id, email, companyName) {
    await sendMail({
        to: email,
        subject: `[BLOQUÉ] Crédits épuisés - ${companyName}`,
        html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
          <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin:0; font-size:22px;">🚫 Crédits Épuisés</h1>
          </div>
          <div style="background: #f9f9f9; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p>Bonjour,</p>
            <p>Le compte <strong>${companyName}</strong> n'a plus de crédits disponibles.</p>
            <div style="background: #fee2e2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <div style="font-size: 48px; font-weight: bold; color: #dc2626;">0</div>
              <div style="font-size: 14px; color: #7f1d1d; margin-top: 8px;">
                ⚠️ La saisie, modification et suppression de données sont suspendues.<br>
                La consultation reste disponible.
              </div>
            </div>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${process.env.FRONTEND_URL}/billing" style="background: #dc2626; color: white; padding: 14px 36px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
                Recharger maintenant
              </a>
            </div>
          </div>
        </div>`
    });
}

async function logAlertToDb(structur_id, type, balance, threshold) {
    try {
        await pool.query(
            `INSERT INTO credit_alert_logs (structur_id, threshold_level, threshold_value, credit_balance_at_alert)
             VALUES (?, ?, ?, ?)`,
            [structur_id, type, threshold || 0, balance]
        );
    } catch (e) { /* non bloquant */ }
}

/**
 * Envoie une facture PDF par email après un achat réussi
 */
async function sendPurchaseReceipt(email, companyName, pack, transaction) {
    await sendMail({
        to: email,
        subject: `Confirmation d'achat - ${pack.credits} crédits Soft Transit`,
        html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
          <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin:0; font-size:22px;">✅ Achat confirmé</h1>
          </div>
          <div style="background: #f9f9f9; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <p>Bonjour ${companyName},</p>
            <p>Votre achat de crédits a été confirmé avec succès.</p>
            <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background: #f3f4f6;">
                <td style="padding: 12px; font-weight: bold;">Pack</td>
                <td style="padding: 12px;">${pack.name}</td>
              </tr>
              <tr>
                <td style="padding: 12px; font-weight: bold;">Crédits ajoutés</td>
                <td style="padding: 12px; color: #16a34a; font-weight: bold;">+${pack.credits} crédits</td>
              </tr>
              <tr style="background: #f3f4f6;">
                <td style="padding: 12px; font-weight: bold;">Montant</td>
                <td style="padding: 12px;">${transaction.amount_eur}€ / ${Number(transaction.amount_cfa).toLocaleString()} CFA</td>
              </tr>
              <tr>
                <td style="padding: 12px; font-weight: bold;">Mode de paiement</td>
                <td style="padding: 12px; text-transform: capitalize;">${transaction.payment_provider}</td>
              </tr>
              <tr style="background: #f3f4f6;">
                <td style="padding: 12px; font-weight: bold;">Référence</td>
                <td style="padding: 12px; font-family: monospace;">${transaction.id}</td>
              </tr>
            </table>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${process.env.FRONTEND_URL}/billing" style="background: #2563eb; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none;">
                Voir mon tableau de bord
              </a>
            </div>
          </div>
        </div>`
    });
}

module.exports = { checkCreditAlerts, resetAlertFlags, sendPurchaseReceipt };
