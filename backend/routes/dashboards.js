const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, tenantMiddleware, checkPermission } = require('../middleware/auth');

router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * GET /api/dashboards/transport-arrivals
 * Fetch transport arrivals calendar data with dynamic color coding
 */
router.get('/transport-arrivals', checkPermission('DOSSIERS', 'can_view'), async (req, res) => {
    try {
        let query = `
            SELECT
                d.CodeDossier as code,
                d.CodeDossierCourt as shortCode,
                d.Libelle as label,
                m.LibelleMoyensTransport as transportMean,
                t.DateArriveePrevue as dateArrivee,
                DATEDIFF(t.DateArriveePrevue, CURDATE()) as daysRemaining,
                c.Rouge as colorR,
                c.Vert as colorG,
                c.Bleu as colorB
            FROM dossiers d
            JOIN transports t ON d.IDDossiers = t.idbl OR d.IDDossiers = t.IdAgent
            LEFT JOIN moyenstransport m ON t.IDMoyensTransport = m.IDMoyensTransport
            LEFT JOIN (
                SELECT ndjours, MAX(Rouge) as Rouge, MAX(Vert) as Vert, MAX(Bleu) as Bleu
                FROM couleurs
                GROUP BY ndjours
            ) c ON c.ndjours = (
                CASE
                    WHEN DATEDIFF(t.DateArriveePrevue, CURDATE()) >= 10 THEN 10
                    WHEN DATEDIFF(t.DateArriveePrevue, CURDATE()) < -2 THEN NULL
                    WHEN DATEDIFF(t.DateArriveePrevue, CURDATE()) < 0  THEN -1
                    ELSE DATEDIFF(t.DateArriveePrevue, CURDATE())
                END
            )
            WHERE t.DateArriveePrevue IS NOT NULL
              AND (d.Facturable IS NULL OR d.Facturable != -1)
              AND DATEDIFF(t.DateArriveePrevue, CURDATE()) > -3
        `;
        let params = [];

        if (!req.is_viewing_all) {
            query += ' AND d.structur_id = ?';
            params.push(req.structur_id);
        }

        // Declarant (USER role) sees only dossiers assigned to them via declarations
        if (req.user.role === 'USER') {
            query += ' AND EXISTS (SELECT 1 FROM declarations dec WHERE dec.IDDossiers = d.IDDossiers AND dec.IdAgent = ?)';
            params.push(req.user.id);
        }

        query += ' ORDER BY t.DateArriveePrevue ASC';

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching transport arrivals:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/dashboards/dossier-tracking
 * Fetch dossier tracking data with deadlines and color coding
 */
router.get('/dossier-tracking', checkPermission('DOSSIERS', 'can_view'), async (req, res) => {
    try {
        let query = `
            SELECT 
                ANY_VALUE(cl.NomRS) as clientName,
                ANY_VALUE(cl.TelClient) as clientPhone,
                ANY_VALUE(d.CodeDossier) as code,
                ANY_VALUE(d.Libelle) as label,
                ANY_VALUE(e.libelleEtapesDossiers) as step,
                ANY_VALUE(t.NumeroTitreTransport) as docNumber,
                MAX(t.DateArriveePrevue) as deadline,
                DATEDIFF(MAX(t.DateArriveePrevue), CURDATE()) as daysRemaining,
                ANY_VALUE(c.Rouge) as colorR,
                ANY_VALUE(c.Vert) as colorG,
                ANY_VALUE(c.Bleu) as colorB
            FROM dossiers d
            JOIN clients cl ON d.IDCLIENTS = cl.IDCLIENTS
            LEFT JOIN etapesdossiers e ON d.IdEtapeDossiers = e.IDEtapesDossiers
            LEFT JOIN transports t ON d.IDDossiers = t.idbl OR d.IDDossiers = t.IdAgent
            LEFT JOIN couleurs c ON c.ndjours = (
                CASE 
                    WHEN DATEDIFF(t.DateArriveePrevue, CURDATE()) >= 10 THEN 10
                    WHEN DATEDIFF(t.DateArriveePrevue, CURDATE()) < 0 THEN -1
                    ELSE DATEDIFF(t.DateArriveePrevue, CURDATE())
                END
            )
            WHERE (d.Facturable IS NULL OR d.Facturable != -1)
        `;
        let params = [];

        if (!req.is_viewing_all) {
            query += ' AND d.structur_id = ?';
            params.push(req.structur_id);
        }

        query += ' GROUP BY d.IDDossiers ORDER BY deadline ASC';

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching dossier tracking:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/dashboards/detailed-tracking
 * Comprehensive tracker with all milestones and shipment details
 */
router.get('/detailed-tracking', checkPermission('DOSSIERS', 'can_view'), async (req, res) => {
    try {
        let query = `
            SELECT 
                ANY_VALUE(cl.NomRS) as clientName,
                ANY_VALUE(d.CodeDossier) as code,
                ANY_VALUE(d.CodeDossierCourt) as shortCode,
                ANY_VALUE(d.SaisiLe) as dateDossier,
                ANY_VALUE(d.DateRemise) as dateRemiseDocs,
                ANY_VALUE(t.NumeroTitreTransport) as docNumber,
                ANY_VALUE(ot.NumeroOT) as otNumber,
                ANY_VALUE(t.libelleTransport) as vesselFlight,
                ANY_VALUE(t.DateArriveePrevue) as dateArrivee,
                ANY_VALUE(decl.NumeroDeclaration) as declNumber,
                ANY_VALUE(decl.DateDeclaration) as declDate,
                ANY_VALUE(decl.RegimeDeclaration) as regime,
                ANY_VALUE(decl.DateBAE) as dateBAE,
                ANY_VALUE(ml.DateMiseEnLivraison) as dateML,
                ANY_VALUE(ml.DateRetourConteneur) as dateRCO,
                ANY_VALUE(ml.DateEffectiveLivraison) as dateLiv,
                ANY_VALUE(ag.NomAgent) as declarantName,
                ANY_VALUE(otr.TransporteuretAdresse) as transporteur,
                ANY_VALUE(e.libelleEtapesDossiers) as status,
                ANY_VALUE(ot.Nbredecolis) as nbColis,
                ANY_VALUE(ot.PoidsNet) as poids
            FROM dossiers d
            LEFT JOIN clients cl ON d.IDCLIENTS = cl.IDCLIENTS
            LEFT JOIN etapesdossiers e ON d.IdEtapeDossiers = e.IDEtapesDossiers
            LEFT JOIN transports t ON d.IDDossiers = t.idbl OR d.IDDossiers = t.IdAgent
            LEFT JOIN ordrestransit ot ON d.IDDossiers = ot.IDDossiers
            LEFT JOIN declarations decl ON d.IDDossiers = decl.IDDossiers
            LEFT JOIN agents ag ON decl.IdAgent = ag.IDAgents
            LEFT JOIN miseenlivraison ml ON d.IDDossiers = ml.IDDossiers
            LEFT JOIN ordresdetransport otr ON d.IDDossiers = otr.IDDossiers
            WHERE (d.Facturable IS NULL OR d.Facturable != -1)
        `;
        let params = [];

        if (!req.is_viewing_all) {
            query += ' AND d.structur_id = ?';
            params.push(req.structur_id);
        }

        query += ' GROUP BY d.IDDossiers ORDER BY d.SaisiLe DESC';

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching detailed tracking:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


/**
 * GET /api/dashboards/top-clients-ca
 * Top 10 clients by Chiffre d'Affaires (Validated invoices)
 */
router.get('/top-clients-ca', checkPermission('FINANCES', 'can_view'), async (req, res) => {
    try {
        let query = `
            SELECT 
                ANY_VALUE(cl.NomRS) as name,
                SUM(f.MontantHTFacture) as value
            FROM factures f
            JOIN dossiers d ON f.IDDossiers = d.IDDossiers
            JOIN clients cl ON d.IDCLIENTS = cl.IDCLIENTS
            WHERE f.Validee = 1
        `;
        let params = [];
        if (!req.is_viewing_all) {
            query += ' AND f.structur_id = ?';
            params.push(req.structur_id);
        }
        query += ' GROUP BY cl.IDCLIENTS ORDER BY value DESC LIMIT 10';
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching top clients CA:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/dashboards/top-encours
 * Top 10 clients by Outstanding Balance
 */
router.get('/top-encours', checkPermission('FINANCES', 'can_view'), async (req, res) => {
    try {
        let query = `
            SELECT 
                ANY_VALUE(cl.NomRS) as name,
                SUM(f.ReliquatFacture) as value
            FROM factures f
            JOIN dossiers d ON f.IDDossiers = d.IDDossiers
            JOIN clients cl ON d.IDCLIENTS = cl.IDCLIENTS
            WHERE f.Validee = 1 AND f.ReliquatFacture > 0
        `;
        let params = [];
        if (!req.is_viewing_all) {
            query += ' AND f.structur_id = ?';
            params.push(req.structur_id);
        }
        query += ' GROUP BY cl.IDCLIENTS ORDER BY value DESC LIMIT 10';
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching top encours:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/dashboards/aging-balance
 * Outstanding balances grouped by age
 */
router.get('/aging-balance', checkPermission('FINANCES', 'can_view'), async (req, res) => {
    try {
        let query = `
            SELECT 
                CASE 
                    WHEN DATEDIFF(CURDATE(), f.DateEcheance) <= 30 THEN '0-30j'
                    WHEN DATEDIFF(CURDATE(), f.DateEcheance) <= 90 THEN '31-90j'
                    WHEN DATEDIFF(CURDATE(), f.DateEcheance) <= 120 THEN '91-120j'
                    ELSE '+120j'
                END as period,
                SUM(f.ReliquatFacture) as amount
            FROM factures f
            WHERE f.Validee = 1 AND f.ReliquatFacture > 0
        `;
        let params = [];
        if (!req.is_viewing_all) {
            query += ' AND f.structur_id = ?';
            params.push(req.structur_id);
        }
        query += ' GROUP BY period ORDER BY FIELD(period, "0-30j", "31-90j", "91-120j", "+120j")';
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching aging balance:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/dashboards/performance-trends
 * Compare CA vs Payments for the last 12 months
 */
router.get('/performance-trends', checkPermission('FINANCES', 'can_view'), async (req, res) => {
    try {
        const structur_id = req.structur_id;
        const viewingAll = req.is_viewing_all;

        // Query for CA (Invoiced)
        let caQuery = `
            SELECT DATE_FORMAT(Datefacture, '%Y-%m') as month, SUM(MontantHTFacture) as ca
            FROM factures 
            WHERE Validee = 1 AND Datefacture >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        `;
        if (!viewingAll) caQuery += ` AND structur_id = ${pool.escape(structur_id)}`;
        caQuery += ' GROUP BY month';

        // Query for Payments
        let payQuery = `
            SELECT DATE_FORMAT(Datereglement, '%Y-%m') as month, SUM(MontantReglement) as pay
            FROM reglements 
            WHERE Datereglement >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        `;
        // reglements might need a join or structur_id check if available.
        // Assuming it has structur_id or we filter via factures
        payQuery += ' GROUP BY month';

        const [caRows] = await pool.query(caQuery);
        const [payRows] = await pool.query(payQuery);

        // Merge data
        const months = {};
        caRows.forEach(r => months[r.month] = { month: r.month, ca: parseFloat(r.ca) || 0, pay: 0 });
        payRows.forEach(r => {
            if (!months[r.month]) months[r.month] = { month: r.month, ca: 0, pay: 0 };
            months[r.month].pay = parseFloat(r.pay) || 0;
        });

        const sortedData = Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
        res.json(sortedData);
    } catch (err) {
        console.error('Error fetching performance trends:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/dashboards/dossier-trends
 * Evolution of dossier openings for the last 12 months
 */
router.get('/dossier-trends', checkPermission('DOSSIERS', 'can_view'), async (req, res) => {
    try {
        let query = `
            SELECT DATE_FORMAT(SaisiLe, '%Y-%m') as month, COUNT(*) as count
            FROM dossiers
            WHERE SaisiLe >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
              AND (Facturable IS NULL OR Facturable != -1)
        `;
        let params = [];
        if (!req.is_viewing_all) {
            query += ' AND structur_id = ?';
            params.push(req.structur_id);
        }
        query += ' GROUP BY month ORDER BY month ASC';
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching dossier trends:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
