const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, tenantMiddleware, checkPermission } = require('../middleware/auth');

// Apply middleware
router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/types-documents-ot - List all OT document types
router.get('/', checkPermission('CONFIG', 'can_view'), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM typesdocumentsot ORDER BY LibelleTypeDocumentsOT');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/types-documents-ot - Create OT document type
router.post('/', checkPermission('CONFIG', 'can_create'), async (req, res) => {
    const { LibelleTypeDocumentsOT, Observations } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO TypesDocumentsOT (LibelleTypeDocumentsOT, Observations) VALUES (?, ?)',
            [LibelleTypeDocumentsOT, Observations]
        );
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
