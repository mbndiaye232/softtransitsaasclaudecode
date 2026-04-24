const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, tenantMiddleware, checkPermission } = require('../middleware/auth');

// Apply middleware
router.use(authMiddleware);
router.use(tenantMiddleware);

// -----------------------------------------------------------------------
// One-time migration: fix legacy schema if needed
// -----------------------------------------------------------------------
let migrationDone = false;

async function migrateTable() {
    if (migrationDone) return;

    // Read current columns
    const [tables] = await pool.query(`SHOW TABLES LIKE 'unitesvolume'`);

    if (tables.length === 0) {
        // Table doesn't exist — create fresh
        await pool.query(`
            CREATE TABLE \`unitesvolume\` (
                \`IDUniteVolume\` INT AUTO_INCREMENT PRIMARY KEY,
                \`LibelleUniteVolume\` VARCHAR(50) NOT NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('[unitesvolume] Table created fresh.');
        migrationDone = true;
        return;
    }

    // Table exists — inspect columns
    const [cols] = await pool.query(`SHOW COLUMNS FROM \`unitesvolume\``);
    const colNames = cols.map(c => c.Field);
    const hasPKwithId = colNames.includes('IDUniteVolume');

    if (!hasPKwithId) {
        // Legacy schema: LibelleUniteVolume is the PK (varchar), no auto-increment id
        // Strategy: rename table, create fresh, migrate data
        console.log('[unitesvolume] Legacy schema detected. Migrating...');

        // Save existing data
        const [existingRows] = await pool.query(`SELECT * FROM \`unitesvolume\``);

        // Collect existing labels from whichever column holds them
        // The column named 'LibelleUniteVolume' should have the labels
        let labels = [];
        if (colNames.includes('LibelleUniteVolume')) {
            const [labelRows] = await pool.query(`SELECT \`LibelleUniteVolume\` FROM \`unitesvolume\``);
            labels = labelRows.map(r => r.LibelleUniteVolume).filter(Boolean);
        }

        // Drop old table and recreate with proper schema
        await pool.query(`DROP TABLE \`unitesvolume\``);
        await pool.query(`
            CREATE TABLE \`unitesvolume\` (
                \`IDUniteVolume\` INT AUTO_INCREMENT PRIMARY KEY,
                \`LibelleUniteVolume\` VARCHAR(50) NOT NULL UNIQUE,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('[unitesvolume] Table recreated with correct schema.');

        // Re-insert existing data
        if (labels.length > 0) {
            for (const label of labels) {
                try {
                    await pool.query(
                        'INSERT INTO `unitesvolume` (`LibelleUniteVolume`) VALUES (?)',
                        [label]
                    );
                } catch (e) {
                    // Skip duplicates
                    if (e.code !== 'ER_DUP_ENTRY') throw e;
                }
            }
            console.log(`[unitesvolume] Migrated ${labels.length} existing rows.`);
        }
    }

    migrationDone = true;
}

// -----------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------

// GET /api/unites-volume/debug/schema — diagnostic endpoint
router.get('/debug/schema', async (req, res) => {
    try {
        const [tables] = await pool.query(`SHOW TABLES LIKE 'unitesvolume'`);
        if (tables.length === 0) return res.json({ exists: false });
        const [cols] = await pool.query(`SHOW COLUMNS FROM \`unitesvolume\``);
        const [rows] = await pool.query(`SELECT * FROM \`unitesvolume\` LIMIT 10`);
        res.json({ exists: true, columns: cols, sampleRows: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/unites-volume
router.get('/', checkPermission('REGIMES', 'can_view'), async (req, res) => {
    try {
        await migrateTable();

        const [rows] = await pool.query(
            'SELECT * FROM `unitesvolume` ORDER BY `LibelleUniteVolume`'
        );

        // Seed defaults if table is empty
        if (rows.length === 0) {
            const defaults = ['m³', 'Litre', 'cm³', 'Gallon'];
            for (const label of defaults) {
                await pool.query(
                    'INSERT IGNORE INTO `unitesvolume` (`LibelleUniteVolume`) VALUES (?)',
                    [label]
                );
            }
            const [seeded] = await pool.query(
                'SELECT * FROM `unitesvolume` ORDER BY `LibelleUniteVolume`'
            );
            return res.json(seeded);
        }

        res.json(rows);
    } catch (error) {
        migrationDone = false; // retry next time
        console.error('Error in GET /api/unites-volume:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// POST /api/unites-volume
router.post('/', checkPermission('REGIMES', 'can_edit'), async (req, res) => {
    try {
        const { LibelleUniteVolume } = req.body;
        if (!LibelleUniteVolume) {
            return res.status(400).json({ error: 'Libelle is required' });
        }
        const [result] = await pool.query(
            'INSERT INTO `unitesvolume` (`LibelleUniteVolume`) VALUES (?)',
            [LibelleUniteVolume]
        );
        res.status(201).json({ id: result.insertId, message: 'Unité de volume créée' });
    } catch (error) {
        console.error('Error creating volume unit:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// PUT /api/unites-volume/:id
router.put('/:id', checkPermission('REGIMES', 'can_edit'), async (req, res) => {
    try {
        const { LibelleUniteVolume } = req.body;
        await pool.query(
            'UPDATE `unitesvolume` SET `LibelleUniteVolume` = ? WHERE `IDUniteVolume` = ?',
            [LibelleUniteVolume, req.params.id]
        );
        res.json({ message: 'Unité de volume mise à jour' });
    } catch (error) {
        console.error('Error updating volume unit:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// DELETE /api/unites-volume/:id
router.delete('/:id', checkPermission('REGIMES', 'can_edit'), async (req, res) => {
    try {
        await pool.query('DELETE FROM `unitesvolume` WHERE `IDUniteVolume` = ?', [req.params.id]);
        res.json({ message: 'Unité de volume supprimée' });
    } catch (error) {
        console.error('Error deleting volume unit:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

module.exports = router;
