const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, tenantMiddleware, checkPermission } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auditService = require('../services/auditService');

// Apply middleware to all routes
router.use(authMiddleware);
router.use(tenantMiddleware);

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/clients';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'client-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/clients';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const uploader = multer({ storage: storage });

/**
 * GET /api/clients
 * List all clients for the current company (or all for provider)
 */
router.get('/', checkPermission('CLIENTS', 'can_view'), async (req, res) => {
    try {
        let query = `
            SELECT c.*, s.NomSociete as company_name 
            FROM clients c
            JOIN structur s ON c.structur_id = s.IDSociete
        `;
        let params = [];

        if (!req.is_viewing_all) {
            query += ' WHERE c.structur_id = ?';
            params.push(req.structur_id);
        }

        query += ' ORDER BY c.NomRS ASC';

        const [clients] = await pool.query(query, params);

        // Map database column names to frontend-expected names
        const mappedClients = clients.map(client => ({
            ...client,
            NomClient: client.NomRS,
            Adresse: client.adresseClient,
            Tel1: client.TelClient,
            Tel2: client.CelClient,
            Email: client.EmailClient
        }));

        res.json(mappedClients);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
});

/**
 * GET /api/clients/:id
 * Get client details
 */
router.get('/:id', checkPermission('CLIENTS', 'can_view'), async (req, res) => {
    try {
        let query = 'SELECT * FROM clients WHERE IDCLIENTS = ?';
        let params = [req.params.id];

        if (!req.user.is_provider) {
            query += ' AND structur_id = ?';
            params.push(req.structur_id);
        }

        const [clients] = await pool.query(query, params);

        if (clients.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }

        // Map database column names to frontend-expected names
        const client = {
            ...clients[0],
            NomClient: clients[0].NomRS,
            Adresse: clients[0].adresseClient,
            Tel1: clients[0].TelClient,
            Tel2: clients[0].CelClient,
            Email: clients[0].EmailClient
        };

        res.json(client);
    } catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).json({ error: 'Failed to fetch client' });
    }
});

/**
 * POST /api/clients
 * Create a new client
 */
router.post('/', checkPermission('CLIENTS', 'can_create'), uploader.single('CheminLettreEXO'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const {
            NomRS, adresseClient, TelClient, CelClient, EmailClient, Observations,
            IDStatuts, NINEA, EncoursAutorise, AssuranceCredit, TauxRemise,
            ExonereTVA, PersonneContact, EmailPersonneContact, TelPersonneContact,
            TypeClient, CodeClient, faxClient, DelaiReglement, DelaiReglementDouane,
            NumExoneration, NumCompteSAARI, TauxCommissionDDouane, TauxCommissionDebours,
            sappliqueTousDebours, FactureDouaneAvecCommissionEtTVA
        } = req.body;

        const structur_id = req.structur_id; // Uses tenantMiddleware resolution
        const IdAgent = req.user.id;
        const cheminLettreEXO = req.file ? req.file.path.replace(/\\/g, '/') : null;

        await connection.beginTransaction();

        // Check uniqueness of CodeClient
        if (CodeClient) {
            const [existingCode] = await connection.query(
                `SELECT IDCLIENTS FROM clients WHERE CodeClient = ? AND structur_id = ?`,
                [CodeClient, structur_id]
            );
            if (existingCode.length > 0) {
                throw new Error(`Le code client ${CodeClient} est déjà affecté à un client`);
            }
        }

        // Check uniqueness of NumCompteSAARI
        if (NumCompteSAARI) {
            const [existingSaari] = await connection.query(
                `SELECT IDCLIENTS FROM clients WHERE NumCompteSAARI = ? AND structur_id = ?`,
                [NumCompteSAARI, structur_id]
            );
            if (existingSaari.length > 0) {
                throw new Error(`Le code SAARI client ${NumCompteSAARI} est déjà affecté à un client`);
            }
        }

        // Insert Client
        const [result] = await connection.query(
            `INSERT INTO clients (
                structur_id, NomRS, adresseClient, TelClient, IdAgent, CelClient, EmailClient,
                Observations, IDStatuts, Saisile, NINEA, EncoursAutorise, AssuranceCredit,
                CheminLettreEXO, TauxRemise, ExonereTVA, PersonneContact, EmailPersonneContact,
                TelPersonneContact, TypeClient, CodeClient, faxClient, DelaiReglement,
                DelaiReglementDouane, NumExoneration, NumCompteSAARI, TauxCommissionDDouane,
                TauxCommissionDebours, sappliqueTousDebours, FactureDouaneAvecCommissionEtTVA
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                structur_id, NomRS, adresseClient, TelClient, IdAgent, CelClient, EmailClient,
                Observations, IDStatuts || 0, NINEA, EncoursAutorise || 0, AssuranceCredit || 0,
                cheminLettreEXO, TauxRemise || 0, ExonereTVA === 'true' ? 1 : 0, PersonneContact,
                EmailPersonneContact, TelPersonneContact, TypeClient, CodeClient, faxClient,
                DelaiReglement || 0, DelaiReglementDouane || 0, NumExoneration, NumCompteSAARI,
                TauxCommissionDDouane || 0, TauxCommissionDebours || 0,
                sappliqueTousDebours === 'true' ? 1 : 0, FactureDouaneAvecCommissionEtTVA === 'true' ? 1 : 0
            ]
        );

        const clientId = result.insertId;

        // Move the uploaded file if present
        let finalCheminLettreEXO = cheminLettreEXO;
        if (req.file) {
            const clientNameSafe = (NomRS || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
            const dynamicOutputDir = path.join(__dirname, '..', 'uploads', 'clients', `${clientId}_${clientNameSafe}`);
            if (!fs.existsSync(dynamicOutputDir)) {
                fs.mkdirSync(dynamicOutputDir, { recursive: true });
            }
            const newPath = path.join(dynamicOutputDir, req.file.filename);
            fs.renameSync(req.file.path, newPath);
            finalCheminLettreEXO = `/uploads/clients/${clientId}_${clientNameSafe}/${req.file.filename}`;

            await connection.query('UPDATE clients SET CheminLettreEXO = ? WHERE IDCLIENTS = ?', [finalCheminLettreEXO, clientId]);
        }

        // Create Account (ComptesClients)
        await connection.query(
            `INSERT INTO comptesclients (
                LibelleCompteClients, IDCLIENTS, IdAgent, SoldeCompteClient, TotalCredit, TotalDebit
            ) VALUES (?, ?, ?, 0, 0, 0)`,
            [`Compte opérations de ${NomRS}`, clientId, IdAgent]
        );

        await auditService.log({
            agent_id: req.user.id,
            structur_id: req.user.structur_id,
            action: 'CREATE',
            resource_type: 'CLIENT',
            resource_id: clientId,
            details: { name: NomRS, code: CodeClient },
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });

        await connection.commit();
        res.status(201).json({ message: 'Client created successfully', id: clientId });

    } catch (error) {
        await connection.rollback();
        // Delete uploaded file if error
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Error creating client:', error);
        res.status(400).json({ error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * PUT /api/clients/:id
 * Update a client
 */
router.put('/:id', checkPermission('CLIENTS', 'can_edit'), uploader.single('CheminLettreEXO'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const clientId = req.params.id;
        const {
            NomRS, adresseClient, TelClient, CelClient, EmailClient, Observations,
            IDStatuts, NINEA, EncoursAutorise, AssuranceCredit, TauxRemise,
            ExonereTVA, PersonneContact, EmailPersonneContact, TelPersonneContact,
            TypeClient, CodeClient, faxClient, DelaiReglement, DelaiReglementDouane,
            NumExoneration, NumCompteSAARI, TauxCommissionDDouane, TauxCommissionDebours,
            sappliqueTousDebours, FactureDouaneAvecCommissionEtTVA
        } = req.body;

        const structur_id = req.structur_id;
        const idagentmodification = req.user.id;
        let cheminLettreEXO = req.file ? req.file.path.replace(/\\/g, '/') : undefined;

        await connection.beginTransaction();

        // Check if client exists and belongs to company
        let query = `SELECT * FROM clients WHERE IDCLIENTS = ?`;
        let params = [clientId];
        if (!req.user.is_provider) {
            query += ' AND structur_id = ?';
            params.push(structur_id);
        }

        const [existingClient] = await connection.query(query, params);

        if (existingClient.length === 0) {
            throw new Error('Client not found');
        }

        // Check uniqueness of CodeClient if changed
        if (CodeClient && CodeClient !== existingClient[0].CodeClient) {
            const [existingCode] = await connection.query(
                `SELECT IDCLIENTS FROM clients WHERE CodeClient = ? AND structur_id = ? AND IDCLIENTS != ?`,
                [CodeClient, structur_id, clientId]
            );
            if (existingCode.length > 0) {
                throw new Error(`Le code client ${CodeClient} est déjà affecté à un client`);
            }
        }

        // Check uniqueness of NumCompteSAARI if changed
        if (NumCompteSAARI && NumCompteSAARI !== existingClient[0].NumCompteSAARI) {
            const [existingSaari] = await connection.query(
                `SELECT IDCLIENTS FROM clients WHERE NumCompteSAARI = ? AND structur_id = ? AND IDCLIENTS != ?`,
                [NumCompteSAARI, structur_id, clientId]
            );
            if (existingSaari.length > 0) {
                throw new Error(`Le code SAARI client ${NumCompteSAARI} est déjà affecté à un client`);
            }
        }

        if (req.file) {
            const clientNameSafe = (NomRS || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
            const dynamicOutputDir = path.join(__dirname, '..', 'uploads', 'clients', `${clientId}_${clientNameSafe}`);
            if (!fs.existsSync(dynamicOutputDir)) {
                fs.mkdirSync(dynamicOutputDir, { recursive: true });
            }
            const newPath = path.join(dynamicOutputDir, req.file.filename);
            fs.renameSync(req.file.path, newPath);
            cheminLettreEXO = `/uploads/clients/${clientId}_${clientNameSafe}/${req.file.filename}`;
        }

        // Update Client
        let updateQuery = `UPDATE clients SET 
            NomRS=?, adresseClient=?, TelClient=?, CelClient=?, EmailClient=?,
            Observations=?, IDStatuts=?, Modifiele=NOW(), idagentmodification=?, NINEA=?,
            EncoursAutorise=?, AssuranceCredit=?, TauxRemise=?, ExonereTVA=?,
            PersonneContact=?, EmailPersonneContact=?, TelPersonneContact=?, TypeClient=?,
            CodeClient=?, faxClient=?, DelaiReglement=?, DelaiReglementDouane=?,
            NumExoneration=?, NumCompteSAARI=?, TauxCommissionDDouane=?,
            TauxCommissionDebours=?, sappliqueTousDebours=?, FactureDouaneAvecCommissionEtTVA=?`;

        const updateParams = [
            NomRS, adresseClient, TelClient, CelClient, EmailClient,
            Observations, IDStatuts || 0, idagentmodification, NINEA,
            EncoursAutorise || 0, AssuranceCredit || 0, TauxRemise || 0, ExonereTVA === 'true' ? 1 : 0,
            PersonneContact, EmailPersonneContact, TelPersonneContact, TypeClient,
            CodeClient, faxClient, DelaiReglement || 0, DelaiReglementDouane || 0,
            NumExoneration, NumCompteSAARI, TauxCommissionDDouane || 0,
            TauxCommissionDebours || 0, sappliqueTousDebours === 'true' ? 1 : 0,
            FactureDouaneAvecCommissionEtTVA === 'true' ? 1 : 0
        ];

        if (cheminLettreEXO) {
            updateQuery += `, CheminLettreEXO=?`;
            updateParams.push(cheminLettreEXO);
        }

        updateQuery += ` WHERE IDCLIENTS = ?`;
        updateParams.push(clientId);

        await connection.query(updateQuery, updateParams);

        await auditService.log({
            agent_id: req.user.id,
            structur_id: req.user.structur_id,
            action: 'UPDATE',
            resource_type: 'CLIENT',
            resource_id: clientId,
            details: { name: NomRS, code: CodeClient },
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });

        await connection.commit();
        res.json({ message: 'Client updated successfully' });

    } catch (error) {
        await connection.rollback();
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Error updating client:', error);
        res.status(400).json({ error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * PATCH /api/clients/:id/email
 * Quick update of client email address
 */
router.patch('/:id/email', checkPermission('CLIENTS', 'can_edit'), async (req, res) => {
    try {
        const { email } = req.body;
        const clientId = req.params.id;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const [result] = await pool.query(
            'UPDATE clients SET EmailClient = ?, Modifiele = NOW(), idagentmodification = ? WHERE IDCLIENTS = ?',
            [email, req.user.id, clientId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }

        await auditService.log({
            agent_id: req.user.id,
            structur_id: req.user.structur_id,
            action: 'UPDATE',
            resource_type: 'CLIENT',
            resource_id: clientId,
            details: { field: 'EmailClient', new_value: email },
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });

        res.json({ message: 'Email mis à jour avec succès' });
    } catch (error) {
        console.error('Error updating client email:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * DELETE /api/clients/:id
 * Delete a client
 */
router.delete('/:id', checkPermission('CLIENTS', 'can_delete'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const clientId = req.params.id;

        await connection.beginTransaction();

        // Check if client has associated dossiers
        const [dossiers] = await connection.query(
            'SELECT IDDossiers FROM dossiers WHERE IDCLIENTS = ? LIMIT 1',
            [clientId]
        );

        if (dossiers.length > 0) {
            return res.status(400).json({
                error: 'Impossible de supprimer ce client car il possède des dossiers associés.'
            });
        }

        const [result] = await connection.query(
            'DELETE FROM clients WHERE IDCLIENTS = ?',
            [clientId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Client introuvable' });
        }

        await auditService.log({
            agent_id: req.user.id,
            structur_id: req.user.structur_id,
            action: 'DELETE',
            resource_type: 'CLIENT',
            resource_id: clientId,
            details: { message: 'Client deleted' },
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });

        await connection.commit();
        res.json({ message: 'Client supprimé avec succès' });
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting client:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    } finally {
        connection.release();
    }
});

module.exports = router;
