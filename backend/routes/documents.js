const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, tenantMiddleware, checkPermission } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { encrypt, decrypt } = require('../utils/encryption');
const fs = require('fs');
const path = require('path');
const archive = require('archiver');

router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/documents/dossier/:dossierId - List all documents for a dossier
router.get('/dossier/:dossierId', checkPermission('DOSSIERS', 'can_view'), async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                d.IDDocuments as id,
                d.LibelleDocument as title,
                d.DescriptionDocument as description,
                d.CheminDocument as fileUrl,
                d.NumeroDocument as number,
                d.IDTypesDocuments as typeId,
                td.LibelleTypeDocument as typeLabel,
                d.DatePublication as date,
                d.Observations as observations
            FROM documents d
            LEFT JOIN typesdocuments td ON d.IDTypesDocuments = td.IDTypesDocuments
            WHERE d.IDDossiers = ?
        `, [req.params.dossierId]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/documents - Upload and encrypt a new document
router.post('/', checkPermission('DOSSIERS', 'can_create'), upload.single('document'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const { dossierId, title, description, number, typeId, date, observations } = req.body;

    try {
        // Read file, encrypt it, and overwrite
        const fileBuffer = fs.readFileSync(req.file.path);
        const encryptedBuffer = encrypt(fileBuffer);
        fs.writeFileSync(req.file.path, encryptedBuffer);

        const filename = req.file.filename;
        const [result] = await pool.query(`
            INSERT INTO documents (
                IDDossiers, LibelleDocument, DescriptionDocument, CheminDocument, 
                NumeroDocument, IDTypesDocuments, DatePublication, Observations, IdAgent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            dossierId, title, description, filename, 
            number, typeId || null, date || null, observations || null, req.user.id
        ]);

        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error(error);
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Server error during upload/encryption' });
    }
});

// GET /api/documents/:id/view - Decrypt and stream document
router.get('/:id/view', checkPermission('DOSSIERS', 'can_view'), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT CheminDocument, LibelleDocument FROM documents WHERE IDDocuments = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Document not found' });

        const doc = rows[0];
        const filePath = path.join('uploads', 'others', doc.CheminDocument); // Adjust based on upload destination

        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

        const encryptedBuffer = fs.readFileSync(filePath);
        const decryptedBuffer = decrypt(encryptedBuffer);

        // Determine content type (could be stored in DB, but we can guess from extension)
        const ext = path.extname(doc.CheminDocument).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.pdf') contentType = 'application/pdf';
        else if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) contentType = `image/${ext.substring(1)}`;

        res.setHeader('Content-Type', contentType);
        res.send(decryptedBuffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during decryption' });
    }
});

// GET /api/documents/dossier/:dossierId/extract - Bulk extraction
router.get('/dossier/:dossierId/extract', checkPermission('DOSSIERS', 'can_view'), async (req, res) => {
    try {
        const [dossierRows] = await pool.query('SELECT CodeDossierCourt FROM dossiers WHERE IDDossiers = ?', [req.params.dossierId]);
        if (dossierRows.length === 0) return res.status(404).json({ error: 'Dossier not found' });
        
        const shortCode = dossierRows[0].CodeDossierCourt.replace(/[^a-zA-Z0-9]/g, '_');
        
        const [docs] = await pool.query('SELECT CheminDocument, LibelleDocument FROM documents WHERE IDDossiers = ?', [req.params.dossierId]);
        if (docs.length === 0) return res.status(400).json({ error: 'No documents to extract' });

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${shortCode}_documents.zip`);

        const zip = archive('zip', { zlib: { level: 9 } });
        zip.pipe(res);

        for (const doc of docs) {
            const filePath = path.join('uploads', 'others', doc.CheminDocument);
            if (fs.existsSync(filePath)) {
                const encryptedBuffer = fs.readFileSync(filePath);
                try {
                    const decryptedBuffer = decrypt(encryptedBuffer);
                    zip.append(decryptedBuffer, { name: doc.LibelleDocument + path.extname(doc.CheminDocument) });
                } catch (e) {
                    console.error(`Failed to decrypt ${doc.CheminDocument}`, e);
                }
            }
        }

        zip.finalize();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Extraction failed' });
    }
});

// DELETE /api/documents/:id
router.delete('/:id', checkPermission('DOSSIERS', 'can_delete'), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT CheminDocument FROM documents WHERE IDDocuments = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Document not found' });

        const filePath = path.join('uploads', 'others', rows[0].CheminDocument);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        await pool.query('DELETE FROM documents WHERE IDDocuments = ?', [req.params.id]);
        res.json({ message: 'Document deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Delete failed' });
    }
});

module.exports = router;
