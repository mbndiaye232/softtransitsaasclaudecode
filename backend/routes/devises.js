const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, tenantMiddleware, checkPermission } = require('../middleware/auth');
const auditService = require('../services/auditService');

// Apply middleware
router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * GET /api/devises
 * List all currencies
 */
router.get('/', checkPermission('FINANCES', 'can_view'), async (req, res) => {
    try {
        const [devises] = await pool.query(
            'SELECT IDDevises, libelle, Symbole, TauxChangeDeviseCFA FROM devises ORDER BY libelle'
        );
        res.json(devises);
    } catch (error) {
        console.error('Error fetching currencies:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/devises
 * Create a new currency
 */
router.post('/', checkPermission('FINANCES', 'can_create'), async (req, res) => {
    try {
        const { libelle, Symbole, TauxChangeDeviseCFA } = req.body;
        
        if (!libelle || !Symbole) {
            return res.status(400).json({ error: 'Le libellé et le symbole sont obligatoires' });
        }

        const [result] = await pool.query(
            'INSERT INTO devises (libelle, Symbole, TauxChangeDeviseCFA, IdAgent) VALUES (?, ?, ?, ?)',
            [libelle, Symbole, TauxChangeDeviseCFA || 0, req.user.id]
        );

        await auditService.log({
            agent_id: req.user.id,
            structur_id: req.user.structur_id,
            action: 'CREATE',
            resource_type: 'DEVISE',
            resource_id: result.insertId,
            details: { libelle, Symbole },
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });

        res.status(201).json({ 
            IDDevises: result.insertId, 
            message: 'Devise créée avec succès' 
        });
    } catch (error) {
        console.error('Error creating currency:', error);
        res.status(500).json({ error: 'Failed to create currency' });
    }
});

/**
 * PUT /api/devises/:id
 * Update an existing currency
 */
router.put('/:id', checkPermission('FINANCES', 'can_edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const { libelle, Symbole, TauxChangeDeviseCFA } = req.body;

        if (!libelle || !Symbole) {
            return res.status(400).json({ error: 'Le libellé et le symbole sont obligatoires' });
        }

        await pool.query(
            'UPDATE devises SET libelle = ?, Symbole = ?, TauxChangeDeviseCFA = ?, IdAgent = ? WHERE IDDevises = ?',
            [libelle, Symbole, TauxChangeDeviseCFA || 0, req.user.id, id]
        );

        await auditService.log({
            agent_id: req.user.id,
            structur_id: req.user.structur_id,
            action: 'UPDATE',
            resource_type: 'DEVISE',
            resource_id: id,
            details: { libelle, Symbole },
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });

        res.json({ message: 'Devise mise à jour avec succès' });
    } catch (error) {
        console.error('Error updating currency:', error);
        res.status(500).json({ error: 'Failed to update currency' });
    }
});

/**
 * DELETE /api/devises/:id
 * Delete a currency
 */
router.delete('/:id', checkPermission('FINANCES', 'can_delete'), async (req, res) => {
    try {
        const { id } = req.params;

        // Check for dependencies (if needed, e.g. used in factures)
        // For simple reference data, we just delete or notify the user of foreign key constraints
        
        await pool.query('DELETE FROM devises WHERE IDDevises = ?', [id]);

        await auditService.log({
            agent_id: req.user.id,
            structur_id: req.user.structur_id,
            action: 'DELETE',
            resource_type: 'DEVISE',
            resource_id: id,
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });

        res.json({ message: 'Devise supprimée avec succès' });
    } catch (error) {
        console.error('Error deleting currency:', error);
        res.status(500).json({ error: 'Impossible de supprimer cette devise. Elle est probablement liée à d’autres enregistrements.' });
    }
});

module.exports = router;
