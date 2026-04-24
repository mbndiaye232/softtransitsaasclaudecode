const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const { authMiddleware, tenantMiddleware, checkPermission } = require('../middleware/auth');
const upload = require('../middleware/upload');
const emailService = require('../services/EmailService');

// Apply middleware to all routes
router.use(authMiddleware);
router.use(tenantMiddleware);

// Create a new invoice
router.post('/', async (req, res) => {
    const connection = await pool.getConnection();
    const { idDossier, rubriques, idAgent, observations } = req.body;

    try {
        await connection.beginTransaction();

        // 0. Get structur_id from the agent
        const [[agent]] = await connection.query(
            'SELECT structur_id FROM agents WHERE IDAgents = ? LIMIT 1',
            [idAgent]
        );
        if (!agent) {
            await connection.rollback();
            return res.status(400).json({ error: 'Agent introuvable. Veuillez vous reconnecter.' });
        }
        const structurId = agent.structur_id;

        // 1. Validate rubriques and determine invoice type
        if (!rubriques || rubriques.length === 0) {
            return res.status(400).json({ error: 'At least one rubrique is required' });
        }

        let hasCategory10 = false;
        let hasCategoryOthers = false;

        const processedRubriques = rubriques.map(r => {
            const code = r.code || r.CodeRubrique || '';
            const is10 = String(code).startsWith('10');
            if (is10) hasCategory10 = true;
            else hasCategoryOthers = true;
            return { ...r, is10, code };
        });

        let prefix = '';
        if (hasCategory10 && !hasCategoryOthers) prefix = 'FD'; // Facture Douane
        else if (!hasCategory10 && hasCategoryOthers) prefix = 'FP'; // Facture Prestations
        else prefix = 'FG'; // Facture Globale

        // 2. Generate Invoice Number
        const [lastInvoice] = await connection.query(
            'SELECT NumeroFacture FROM factures WHERE NumeroFacture LIKE ? ORDER BY NumeroFacture DESC LIMIT 1',
            [`${prefix}-%`]
        );

        let nextNum = 1;
        if (lastInvoice.length > 0) {
            const lastNum = parseInt(lastInvoice[0].NumeroFacture.split('-')[1]);
            nextNum = lastNum + 1;
        }
        const numeroFacture = `${prefix}-${String(nextNum).padStart(5, '0')}`;

        // 3. Calculate Totals
        let totalHTDouane = 0;
        let totalHTDebours = 0;
        let totalHTPrestations = 0;
        let totalTVA = 0;

        // Get TVA rate (assuming 18% if not found or from a config)
        // For simplicity, let's use a constant or look for it in the taxes table if needed.
        const tvaRate = 0.18;

        rubriques.forEach(r => {
            const amount = parseFloat(r.montant) || 0;
            const code = String(r.code || r.CodeRubrique || '');

            if (code.startsWith('10')) {
                totalHTDouane += amount;
            } else if (code.startsWith('11')) {
                totalHTDebours += amount;
            } else if (code.startsWith('40')) {
                totalHTPrestations += amount;
                totalTVA += amount * tvaRate;
            }
        });

        const totalHT = totalHTDouane + totalHTDebours + totalHTPrestations;
        const totalTTC = totalHT + totalTVA;

        // 4. Insert into factures table
        const [result] = await connection.query(
            `INSERT INTO factures (
                IDDossiers, NumeroFacture, MontantHTFacture, MontantTVAFacture, 
                MontantTTCFacture, IDAgents, Observations, DateFacture, structur_id,
                Validee, MontantRegleFacture, ReliquatFacture
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, 0, 0, ?)`,
            [idDossier, numeroFacture, totalHT, totalTVA, totalTTC, idAgent, observations, structurId, totalTTC]
        );

        const idFacture = result.insertId;

        // 5. Insert into liaisonfacturesrubriques
        const liaisonValues = rubriques.map(r => [
            idFacture,
            r.idRubrique || r.IDRubriques,
            r.montant || 0,
            r.code || r.CodeRubrique,
            r.libelle || r.libelleRubrique,
            r.complement || ''
        ]);

        await connection.query(
            `INSERT INTO liaisonfacturesrubriques (
                IDFactures, IDRubriques, MontantHTFactures, CodeRubrique, libelleRubrique, Complement
            ) VALUES ?`,
            [liaisonValues]
        );

        await connection.commit();
        res.status(201).json({
            message: 'Invoice created successfully',
            idFacture,
            numeroFacture,
            totals: { totalHT, totalTVA, totalTTC }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error creating invoice - FULL ERROR:', error.code, error.sqlMessage || error.message);
        res.status(500).json({ error: error.sqlMessage || error.message });
    } finally {
        connection.release();
    }
});

// Generate PDF for an invoice
router.get('/:id/pdf', async (req, res) => {
    try {
        const InvoicePDFGenerator = require('../services/InvoicePDFGenerator');
        const generator = new InvoicePDFGenerator(pool);
        const pdfPath = await generator.generatePDF(req.params.id);
        res.download(pdfPath);
    } catch (error) {
        console.error('Error generating invoice PDF:', error);
        res.status(500).json({ error: 'Erreur lors de la génération du PDF' });
    }
});

// Get invoices for a dossier
router.get('/dossier/:dossierId', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT f.*, u.NomAgent as AgentName, c.EmailClient, c.NomRS as ClientName
             FROM factures f 
             LEFT JOIN agents u ON f.IDAgents = u.IDAgents 
             JOIN dossiers d ON f.IDDossiers = d.IDDossiers
             JOIN clients c ON d.IDCLIENTS = c.IDCLIENTS
             WHERE f.IDDossiers = ? 
             ORDER BY f.DateFacture DESC`,
            [req.params.dossierId]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get invoice details
router.get('/:id', async (req, res) => {
    try {
        const [invoice] = await pool.query(
            'SELECT * FROM factures WHERE IDFactures = ?',
            [req.params.id]
        );

        if (invoice.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const [rubriques] = await pool.query(
            'SELECT * FROM liaisonfacturesrubriques WHERE IDFactures = ?',
            [req.params.id]
        );

        res.json({
            ...invoice[0],
            rubriques
        });
    } catch (error) {
        console.error('Error fetching invoice details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/factures/client/:clientId - Get all invoices for a client
router.get('/client/:clientId', checkPermission('FACTURES', 'can_view'), async (req, res) => {
    console.log(`GET /api/factures/client/${req.params.clientId} hit`);
    try {
        const [rows] = await pool.query(`
            SELECT f.*, d.CodeDossier, d.Libelle as DossierLibelle
            FROM factures f
            JOIN dossiers d ON f.IDDossiers = d.IDDossiers
            WHERE d.IDCLIENTS = ?
            ORDER BY f.DateFacture DESC
        `, [req.params.clientId]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching client invoices:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/factures/:id/validate - Validate an invoice
router.patch('/:id/validate', checkPermission('FACTURES', 'can_edit'), async (req, res) => {
    try {
        const [result] = await pool.query(
            'UPDATE factures SET Validee = 1 WHERE IDFactures = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Facture introuvable' });
        }

        res.json({ message: 'Facture validée avec succès' });
    } catch (error) {
        console.error('Error validating invoice:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// PATCH /api/factures/:id/unvalidate - Invalidate an invoice
router.patch('/:id/unvalidate', checkPermission('FACTURES', 'can_edit'), async (req, res) => {
    try {
        // 1. Check if invoice has payments
        const [payments] = await pool.query(
            'SELECT IDReglements FROM reglements WHERE IDFactures = ? LIMIT 1',
            [req.params.id]
        );

        if (payments.length > 0) {
            return res.status(400).json({
                error: 'Impossible d\'invalider cette facture car elle a reçu un ou plusieurs règlements. Veuillez annuler les règlements d\'abord.'
            });
        }

        const [result] = await pool.query(
            'UPDATE factures SET Validee = 0 WHERE IDFactures = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Facture introuvable' });
        }

        res.json({ message: 'Facture dévalidée avec succès' });
    } catch (error) {
        console.error('Error unvalidating invoice:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// DELETE /api/factures/:id - Delete an invoice
router.delete('/:id', checkPermission('FACTURES', 'can_edit'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Check if invoice is validated or has payments
        const [[invoice]] = await connection.query(
            'SELECT Validee FROM factures WHERE IDFactures = ?',
            [req.params.id]
        );

        if (!invoice) {
            await connection.rollback();
            return res.status(404).json({ error: 'Facture introuvable' });
        }

        if (invoice.Validee === 1) {
            await connection.rollback();
            return res.status(400).json({
                error: 'Impossible de supprimer cette facture car elle est validée.'
            });
        }

        const [payments] = await connection.query(
            'SELECT IDReglements FROM reglements WHERE IDFactures = ? LIMIT 1',
            [req.params.id]
        );

        if (payments.length > 0) {
            return res.status(400).json({
                error: 'Impossible de supprimer cette facture car elle a reçu un ou plusieurs règlements. Veuillez annuler les règlements d\'abord.'
            });
        }

        // 2. Delete related rubrics
        await connection.query('DELETE FROM liaisonfacturesrubriques WHERE IDFactures = ?', [req.params.id]);

        // 3. Delete invoice
        const [result] = await connection.query('DELETE FROM factures WHERE IDFactures = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Facture introuvable' });
        }

        await connection.commit();
        res.json({ message: 'Facture supprimée avec succès' });

    } catch (error) {
        await connection.rollback();
        console.error('Error deleting invoice:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    } finally {
        connection.release();
    }
});


// --- JUSTIFICATIFS MANAGEMENT ---

/**
 * POST /api/factures/:id/justificatifs
 * Upload a supporting document for an invoice
 */
router.post('/:id/justificatifs', checkPermission('FACTURES', 'can_edit'), upload.single('justificatif'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier n\'a été téléchargé' });
        }

        const [result] = await pool.query(
            `INSERT INTO liaisonfacturejustificatifs 
            (IDFactures, FileName, OriginalName, FilePath, MimeType, FileSize, IdAgent) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                req.params.id,
                req.file.filename,
                req.file.originalname,
                req.file.path,
                req.file.mimetype,
                req.file.size,
                req.user.id
            ]
        );

        res.status(201).json({
            id: result.insertId,
            message: 'Justificatif ajouté avec succès',
            file: {
                name: req.file.originalname,
                id: result.insertId
            }
        });
    } catch (error) {
        console.error('Error uploading justificatif:', error);
        res.status(500).json({ error: 'Erreur lors du téléchargement du justificatif' });
    }
});

/**
 * GET /api/factures/:id/justificatifs
 * List all supporting documents for an invoice
 */
router.get('/:id/justificatifs', checkPermission('FACTURES', 'can_view'), async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM liaisonfacturejustificatifs WHERE IDFactures = ? ORDER BY UploadedAt DESC',
            [req.params.id]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching justificatifs:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des justificatifs' });
    }
});

/**
 * DELETE /api/factures/justificatifs/:id
 * Remove a supporting document
 */
router.delete('/justificatifs/:id', checkPermission('FACTURES', 'can_edit'), async (req, res) => {
    try {
        // 1. Get file path
        const [rows] = await pool.query(
            'SELECT FilePath FROM liaisonfacturejustificatifs WHERE IDLiaisonFactureJustificatif = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Justificatif introuvable' });
        }

        const filePath = rows[0].FilePath;

        // 2. Delete from database
        await pool.query('DELETE FROM liaisonfacturejustificatifs WHERE IDLiaisonFactureJustificatif = ?', [req.params.id]);

        // 3. Delete from filesystem
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, '..', filePath);
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
        }

        res.json({ message: 'Justificatif supprimé avec succès' });
    } catch (error) {
        console.error('Error deleting justificatif:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression du justificatif' });
    }
});

/**
 * POST /api/factures/:id/send-email
 * Send invoice PDF + justificatifs to the client
 */
router.post('/:id/send-email', checkPermission('FACTURES', 'can_view'), async (req, res) => {
    try {
        const invoiceId = req.params.id;

        // 1. Fetch Invoice, Client info and Justificatifs
        const InvoicePDFGenerator = require('../services/InvoicePDFGenerator');
        const generator = new InvoicePDFGenerator(pool);

        const data = await generator.fetchInvoiceData(invoiceId);
        if (!data.invoice) return res.status(404).json({ error: 'Facture introuvable' });

        const clientEmail = data.invoice.EmailClient;
        if (!clientEmail) {
            return res.status(400).json({ error: 'Le client n\'a pas d\'adresse e-mail renseignée' });
        }

        // 2. Generate/Get Invoice PDF
        const pdfPath = await generator.generatePDF(invoiceId);

        // 3. Get justificatifs
        const [justificatifs] = await pool.query(
            'SELECT OriginalName, FilePath FROM liaisonfacturejustificatifs WHERE IDFactures = ?',
            [invoiceId]
        );

        // 4. Prepare attachments
        const attachments = [
            {
                filename: `Facture_${data.invoice.NumeroFacture.replace(/\//g, '-')}.pdf`,
                path: pdfPath
            }
        ];

        justificatifs.forEach(j => {
            const absPath = path.isAbsolute(j.FilePath) ? j.FilePath : path.join(__dirname, '..', j.FilePath);
            if (fs.existsSync(absPath)) {
                attachments.push({
                    filename: j.OriginalName,
                    path: absPath
                });
            }
        });

        // 5. Send Email
        const subject = `Facture ${data.invoice.NumeroFacture} - ${data.structure?.NomSociete || 'Soft Transit'}`;
        const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #1e3a8a;">Bonjour,</h2>
                <p>Veuillez trouver ci-joint votre facture <strong>${data.invoice.NumeroFacture}</strong> pour le dossier <strong>${data.invoice.CodeDossier}</strong>.</p>
                <p>Nous avons également joint les justificatifs correspondants.</p>
                <br/>
                <p>Cordialement,</p>
                <p><strong>L'équipe ${data.structure?.NomSociete || 'Soft Transit'}</strong></p>
            </div>
        `;

        await emailService.sendEmail({
            to: clientEmail,
            subject,
            html,
            attachments
        });

        // 6. Update dateenvoye
        await pool.query('UPDATE factures SET dateenvoye = NOW() WHERE IDFactures = ?', [invoiceId]);

        res.json({ message: 'E-mail envoyé avec succès à ' + clientEmail });

    } catch (error) {
        console.error('Error sending invoice email:', error);
        res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'e-mail : ' + error.message });
    }
});

module.exports = router;
