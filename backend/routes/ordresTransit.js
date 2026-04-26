const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, tenantMiddleware, checkPermission } = require('../middleware/auth');

console.log('--- ORDRES TRANSIT ROUTES LOADED ---');

// Apply middleware
router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * GET /api/ordres-transit
 * List all transit orders
 */
router.get('/', checkPermission('DOSSIERS', 'can_view'), async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT ot.*, d.CodeDossier as dossier_code, i.CodeIncoterm
            FROM ordrestransit ot
            LEFT JOIN dossiers d ON ot.IDDossiers = d.IDDossiers
            LEFT JOIN incoterm i ON ot.Idincoterms = i.IDIncoterm
            ORDER BY ot.DateOT DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/ordres-transit/dossier/:dossierId
 */
router.get('/dossier/:dossierId', checkPermission('DOSSIERS', 'can_view'), async (req, res) => {
    try {
        const [otRows] = await pool.query('SELECT * FROM ordrestransit WHERE IDDossiers = ?', [req.params.dossierId]);
        if (otRows.length === 0) return res.json(null);

        const otId = otRows[0].IDOrdresTransit;

        const [regimeRows] = await pool.query(`
            SELECT r.* FROM regimeot r
            JOIN liaisonregimeot l ON r.IDRegimeOT = l.IDRegimeOT
            WHERE l.IDOrdresTransit = ?
        `, [otId]);

        const [docRows] = await pool.query(`
            SELECT d.*, t.LibelleTypeDocumentsOT 
            FROM liaisonotdocumentsaremettre d
            LEFT JOIN typesdocumentsot t ON d.idtypesDocumentot = t.IDTypesDocumentsOT
            WHERE d.IDOrdreTransit = ?
        `, [otId]);

        res.json({
            ...otRows[0],
            regimes: regimeRows,
            documents: docRows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/ordres-transit/:id
 */
router.get('/:id', checkPermission('DOSSIERS', 'can_view'), async (req, res) => {
    try {
        const [otRows] = await pool.query('SELECT * FROM ordrestransit WHERE IDOrdresTransit = ?', [req.params.id]);
        if (otRows.length === 0) return res.status(404).json({ error: 'Not found' });

        const [regimeRows] = await pool.query(`
            SELECT r.* FROM regimeot r
            JOIN liaisonregimeot l ON r.IDRegimeOT = l.IDRegimeOT
            WHERE l.IDOrdresTransit = ?
        `, [req.params.id]);

        const [docRows] = await pool.query(`
            SELECT d.*, t.LibelleTypeDocumentsOT 
            FROM liaisonotdocumentsaremettre d
            LEFT JOIN typesdocumentsot t ON d.idtypesDocumentot = t.IDTypesDocumentsOT
            WHERE d.IDOrdreTransit = ?
        `, [req.params.id]);

        res.json({
            ...otRows[0],
            regimes: regimeRows,
            documents: docRows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/ordres-transit
 * Create transit order
 */
router.post('/', checkPermission('DOSSIERS', 'can_create'), async (req, res) => {
    console.log('--- EXECUTING POST /api/ordres-transit (FIXED VERSION) ---');
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            NumeroOT, DateOT, DateReceptionOT, IDDossiers, NumeroSerie,
            Idincoterms, BSCExiste, AssuranceExiste, Observations,
            DateExpedition, AdresseDeLivraison, PROVENANCE, NatureProduits,
            Nbredecolis, PoidsNet, ValeurMarchandise,
            regimeIds, documents
        } = req.body;

        console.log('Data to insert:', { NumeroOT, IDDossiers, structur_id: req.user.structur_id });

        const [result] = await connection.query(`
            INSERT INTO ordrestransit (
                NumeroOT, DateOT, DateReceptionOT, IdAgent, IDDossiers, NumeroSerie,
                Idincoterms, BSCExiste, AssuranceExiste, Observations,
                DateExpedition, AdresseDeLivraison, PROVENANCE, NatureProduits,
                Nbredecolis, PoidsNet, ValeurMarchandise, structur_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            NumeroOT, DateOT, DateReceptionOT, req.user.id, IDDossiers, NumeroSerie,
            Idincoterms, BSCExiste || 0, AssuranceExiste || 0, Observations,
            DateExpedition, AdresseDeLivraison, PROVENANCE, NatureProduits,
            Nbredecolis, PoidsNet, ValeurMarchandise, req.user.structur_id
        ]);

        const otId = result.insertId;

        // Regimes
        if (regimeIds && Array.isArray(regimeIds)) {
            for (const rId of regimeIds) {
                await connection.query(
                    'INSERT INTO LiaisonRegimeOT (IDOrdresTransit, IDRegimeOT) VALUES (?, ?)',
                    [otId, rId]
                );
            }
        }

        // Documents
        if (documents && Array.isArray(documents)) {
            for (const doc of documents) {
                await connection.query(`
                    INSERT INTO LiaisonOTDocumentsARemettre (
                        IDOrdreTransit, idtypesDocumentot, Observations, Recu, 
                        DateReceptionDocument, Aremettre, LibelleDocument
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    otId, doc.idtypesDocumentot, doc.Observations, doc.Recu || 0,
                    doc.DateReceptionDocument, doc.Aremettre || 0, doc.LibelleDocument
                ]);
            }
        }

        await connection.commit();
        console.log('OT created successfully with ID:', otId);
        res.status(201).json({ id: otId });
    } catch (error) {
        await connection.rollback();
        console.error('ERROR IN POST /ordres-transit:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    } finally {
        connection.release();
    }
});

/**
 * PUT /api/ordres-transit/:id
 * Update transit order
 */
router.put('/:id', checkPermission('DOSSIERS', 'can_edit'), async (req, res) => {
    console.log('--- EXECUTING PUT /api/ordres-transit (FIXED VERSION) ---');
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            NumeroOT, DateOT, DateReceptionOT, IDDossiers, NumeroSerie,
            Idincoterms, BSCExiste, AssuranceExiste, Observations,
            DateExpedition, AdresseDeLivraison, PROVENANCE, NatureProduits,
            Nbredecolis, PoidsNet, ValeurMarchandise,
            regimeIds, documents
        } = req.body;

        const otId = req.params.id;

        // Update main record
        await connection.query(`
            UPDATE ordrestransit SET 
                NumeroOT = ?, DateOT = ?, DateReceptionOT = ?, IDDossiers = ?, NumeroSerie = ?,
                Idincoterms = ?, BSCExiste = ?, AssuranceExiste = ?, Observations = ?,
                DateExpedition = ?, AdresseDeLivraison = ?, PROVENANCE = ?, NatureProduits = ?,
                Nbredecolis = ?, PoidsNet = ?, ValeurMarchandise = ?,
                structur_id = ?
            WHERE IDOrdresTransit = ?
        `, [
            NumeroOT, DateOT, DateReceptionOT, IDDossiers, NumeroSerie,
            Idincoterms, BSCExiste || 0, AssuranceExiste || 0, Observations,
            DateExpedition, AdresseDeLivraison, PROVENANCE, NatureProduits,
            Nbredecolis, PoidsNet, ValeurMarchandise,
            req.user.structur_id, otId
        ]);

        // Update Regimes
        await connection.query('DELETE FROM liaisonregimeot WHERE IDOrdresTransit = ?', [otId]);
        if (regimeIds && Array.isArray(regimeIds)) {
            for (const rId of regimeIds) {
                await connection.query(
                    'INSERT INTO LiaisonRegimeOT (IDOrdresTransit, IDRegimeOT) VALUES (?, ?)',
                    [otId, rId]
                );
            }
        }

        // Update Documents
        await connection.query('DELETE FROM liaisonotdocumentsaremettre WHERE IDOrdreTransit = ?', [otId]);
        if (documents && Array.isArray(documents)) {
            for (const doc of documents) {
                await connection.query(`
                    INSERT INTO LiaisonOTDocumentsARemettre (
                        IDOrdreTransit, idtypesDocumentot, Observations, Recu, 
                        DateReceptionDocument, Aremettre, LibelleDocument
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    otId, doc.idtypesDocumentot, doc.Observations, doc.Recu || 0,
                    doc.DateReceptionDocument, doc.Aremettre || 0, doc.LibelleDocument
                ]);
            }
        }

        await connection.commit();
        res.json({ message: 'Ordre de Transit mis à jour' });
    } catch (error) {
        await connection.rollback();
        console.error('ERROR IN PUT /ordres-transit:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    } finally {
        connection.release();
    }
});

module.exports = router;
