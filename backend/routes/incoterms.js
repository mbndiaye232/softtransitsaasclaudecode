const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, tenantMiddleware, checkPermission } = require('../middleware/auth');

// Apply middleware
router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/incoterms - List all incoterms
router.get('/', checkPermission('CONFIG', 'can_view'), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM incoterm ORDER BY CodeIncoterm');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/incoterms - Create incoterm
router.post('/', checkPermission('CONFIG', 'can_create'), async (req, res) => {
    const { CodeIncoterm, Observations } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO Incoterm (CodeIncoterm, Observations) VALUES (?, ?)',
            [CodeIncoterm, Observations]
        );
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
