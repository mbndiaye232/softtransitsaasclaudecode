const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, tenantMiddleware, checkPermission } = require('../middleware/auth');
const multer = require('multer');
const { encrypt, decrypt } = require('../utils/encryption');
const { uploadToR2, downloadFromR2, deleteFromR2 } = require('../utils/r2');
const fs = require('fs');
const path = require('path');
const archive = require('archiver');

// Multer memory storage for R2 uploads (no disk needed)
const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

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

// POST /api/documents - Upload, encrypt and store in Cloudflare R2
router.post('/', checkPermission('DOSSIERS', 'can_create'), uploadMemory.single('document'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const { dossierId, title, description, number, typeId, date, observations } = req.body;

    try {
        // Encrypt in memory
        const encryptedBuffer = encrypt(req.file.buffer);

        const r2Ready = process.env.CLOUDFLARE_R2_ACCOUNT_ID &&
                        process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
                        process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

        let storedKey;

        if (r2Ready) {
            // Store in Cloudflare R2
            const r2Key = `documents/${dossierId}/${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            await uploadToR2(r2Key, encryptedBuffer, req.file.mimetype);
            storedKey = r2Key;
        } else {
            // Fallback: save to local disk (Railway ephemeral — configure R2 for persistence)
            const uploadDir = path.join('uploads', 'dossiers');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
            const filename = `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            fs.writeFileSync(path.join(uploadDir, filename), encryptedBuffer);
            storedKey = filename;
            console.warn('R2 not configured — using local disk (ephemeral). Set CLOUDFLARE_R2_* env vars.');
        }

        const [result] = await pool.query(`
            INSERT INTO documents (
                IDDossiers, LibelleDocument, DescriptionDocument, CheminDocument,
                NumeroDocument, IDTypesDocuments, DatePublication, Observations, IdAgent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            dossierId, title, description, storedKey,
            number, typeId || null, date || null, observations || null, req.user.id
        ]);

        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Server error during upload/encryption' });
    }
});

// GET /api/documents/:id/view - Fetch from R2, decrypt and stream
router.get('/:id/view', checkPermission('DOSSIERS', 'can_view'), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT CheminDocument, LibelleDocument FROM documents WHERE IDDocuments = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Document not found' });

        const doc = rows[0];
        const r2Key = doc.CheminDocument;

        // Determine content type from extension
        const ext = path.extname(r2Key).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.pdf') contentType = 'application/pdf';
        else if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.gif') contentType = 'image/gif';
        else if (['.doc', '.docx'].includes(ext)) contentType = 'application/msword';
        else if (ext === '.xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        // Download from R2 (try R2 key first, fallback to old disk path for legacy docs)
        let decryptedBuffer;
        if (r2Key.startsWith('documents/')) {
            // New R2 storage
            const encryptedBuffer = await downloadFromR2(r2Key);
            decryptedBuffer = decrypt(encryptedBuffer);
        } else {
            // Legacy: file stored on disk (old uploads before R2 migration)
            const legacyPaths = [
                path.join('uploads', 'others', r2Key),
                path.join('uploads', 'dossiers', r2Key),
                path.join('uploads', r2Key),
            ];
            const legacyPath = legacyPaths.find(p => fs.existsSync(p));
            if (!legacyPath) return res.status(404).json({ error: 'Fichier introuvable sur le disque' });
            const encryptedBuffer = fs.readFileSync(legacyPath);
            decryptedBuffer = decrypt(encryptedBuffer);
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${doc.LibelleDocument || path.basename(r2Key)}"`);
        res.send(decryptedBuffer);
    } catch (error) {
        console.error('View error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération du document' });
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
