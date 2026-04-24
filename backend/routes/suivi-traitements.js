const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, tenantMiddleware, checkPermission } = require('../middleware/auth');

router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * Stage working-day targets (cumulative days from arrival date)
 * Ouvert=0, Déclaré=3, Mis en livraison=6, Livré=8, Facturé=10
 */
const STAGE_OBS = { 1: 0, 2: 3, 3: 6, 4: 8, 5: 10 };

const STAGE_LABELS = {
    1: 'Ouvert',
    2: 'Déclaré',
    3: 'Mis en livraison',
    4: 'Livré',
    5: 'Facturé',
};

/**
 * Count working days (Mon–Fri) from date `from` to date `to`.
 * Returns negative value if `to` is before `from`.
 */
function countWorkingDays(from, to) {
    const start = new Date(from);
    const end = new Date(to);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (start.getTime() === end.getTime()) return 0;

    const forward = end >= start;
    const cur = new Date(forward ? start : end);
    const stop = new Date(forward ? end : start);

    let count = 0;
    while (cur < stop) {
        cur.setDate(cur.getDate() + 1);
        const day = cur.getDay();
        if (day !== 0 && day !== 6) count++;
    }
    return forward ? count : -count;
}

/**
 * GET /api/suivi-traitements
 * Returns maritime dossiers ordered by urgency (lowest score = most critical).
 * Excludes dossiers at stage Facturé (5).
 * Excludes dossiers without an arrival date.
 * If arrival date is in the future, elapsed = 0 (dossier not yet started).
 */
router.get('/', checkPermission('DOSSIERS', 'can_view'), async (req, res) => {
    try {
        // Fetch maritime dossiers with auto-computed stage
        let query = `
            SELECT
                d.IDDossiers,
                d.CodeDossier     AS code,
                d.CodeDossierCourt AS shortCode,
                d.Libelle          AS label,
                d.ModeExpedition   AS mode,
                d.SaisiLe          AS dateOuverture,
                cl.NomRS           AS clientName,
                t.DateArriveePrevue AS dateArrivee,
                t.NumeroTitreTransport AS blNumber,
                t.libelleTransport  AS vessel,
                CASE
                    WHEN COUNT(f.IDFactures) > 0                   THEN 5
                    WHEN COUNT(ml.IDMiseEnLivraison) > 0
                         AND MAX(ml.DateEffectiveLivraison) IS NOT NULL THEN 4
                    WHEN COUNT(ml.IDMiseEnLivraison) > 0            THEN 3
                    WHEN COUNT(decl.IDDeclarations) > 0             THEN 2
                    ELSE 1
                END AS computed_stage
            FROM dossiers d
            JOIN clients   cl   ON cl.IDCLIENTS         = d.IDCLIENTS
            JOIN transports t   ON t.idbl                = d.IDDossiers
            LEFT JOIN declarations   decl ON decl.IDDossiers = d.IDDossiers
            LEFT JOIN miseenlivraison ml  ON ml.IDDossiers  = d.IDDossiers
            LEFT JOIN factures        f   ON f.IDDossiers   = d.IDDossiers AND f.Validee = 1
            WHERE d.ModeExpedition = 'MA'
              AND t.DateArriveePrevue IS NOT NULL
        `;

        const params = [];
        if (!req.is_viewing_all) {
            query += ' AND d.structur_id = ?';
            params.push(req.structur_id);
        }

        query += ' GROUP BY d.IDDossiers, t.IDTransports';

        const [dossiers] = await pool.query(query, params);

        // Fetch colour table
        const [couleurs] = await pool.query(
            'SELECT ndjours, Rouge, Vert, Bleu FROM couleurs ORDER BY ndjours ASC'
        );
        const couleurMap = {};
        couleurs.forEach(c => { couleurMap[c.ndjours] = c; });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const result = [];

        for (const d of dossiers) {
            // Exclude Facturé
            if (d.computed_stage === 5) continue;

            if (!d.dateArrivee) continue;

            const arrival = new Date(d.dateArrivee);
            arrival.setHours(0, 0, 0, 0);

            // Working days elapsed since arrival (0 if arrival is in the future)
            const elapsed = Math.max(0, countWorkingDays(arrival, today));

            const stageObs = STAGE_OBS[d.computed_stage] ?? 0;
            const remaining = 10 - elapsed;

            // Score formula: nbre = clamp(round((10 / (10 - stageObs)) * remaining), 0, 10)
            let nbre;
            const divisor = 10 - stageObs;
            if (divisor <= 0 || remaining <= 0) {
                nbre = 0;
            } else {
                nbre = Math.round((10 / divisor) * remaining);
                nbre = Math.max(0, Math.min(10, nbre));
            }

            const color = couleurMap[nbre] || { Rouge: 200, Vert: 200, Bleu: 200 };

            result.push({
                id: d.IDDossiers,
                code: d.code,
                shortCode: d.shortCode,
                label: d.label,
                clientName: d.clientName,
                dateArrivee: d.dateArrivee,
                dateOuverture: d.dateOuverture,
                blNumber: d.blNumber,
                vessel: d.vessel,
                computed_stage: d.computed_stage,
                stageLabel: STAGE_LABELS[d.computed_stage],
                elapsed_days: elapsed,
                remaining_days: remaining,
                nbre,
                colorR: color.Rouge,
                colorG: color.Vert,
                colorB: color.Bleu,
            });
        }

        // Sort: most critical first (lowest nbre = most urgent)
        result.sort((a, b) => a.nbre - b.nbre);

        res.json(result);
    } catch (err) {
        console.error('Suivi traitements error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
