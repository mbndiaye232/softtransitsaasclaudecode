const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, tenantMiddleware, checkPermission } = require('../middleware/auth');

// Apply middleware
router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/regimes-ot - List all OT regimes
router.get('/', checkPermission('CONFIG', 'can_view'), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM regimeot ORDER BY CodeRegimeOT');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/regimes-ot - Create OT regime
router.post('/', checkPermission('CONFIG', 'can_create'), async (req, res) => {
    const { CodeRegimeOT, LibelleRegimeOT, Observations } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO regimeot (CodeRegimeOT, LibelleRegimeOT, Observations) VALUES (?, ?, ?)',
            [CodeRegimeOT, LibelleRegimeOT, Observations]
        );
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
