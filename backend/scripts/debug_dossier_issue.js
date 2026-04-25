const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function debugDossier() {
    const dossierNum = 'IMP-MA-TC-2026-00005';
    console.log(`Debugging dossier: ${dossierNum}`);

    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        // 1. Get dossier info
        const [dossiers] = await pool.query('SELECT * FROM dossiers WHERE CodeDossier = ?', [dossierNum]);
        console.log('--- Dossier data ---');
        console.table(dossiers.map(d => ({
            IDDossiers: d.IDDossiers,
            CodeDossier: d.CodeDossier,
            IDCLIENTS: d.IDCLIENTS,
            Libelle: d.Libelle
        })));

        if (dossiers.length === 0) {
            console.log('Dossier not found!');
            return;
        }

        const dossier = dossiers[0];
        console.log(`Dossier found with IDDossiers: ${dossier.IDDossiers}`);

        // 2. Get client info
        const [clients] = await pool.query('SELECT * FROM clients WHERE IDCLIENTS = ?', [dossier.IDCLIENTS]);
        console.log('--- Client data ---');
        console.table(clients.map(c => ({
            IDCLIENTS: c.IDCLIENTS,
            NomRS: c.NomRS
        })));

        // 3. Get invoices info using correct column names from factures.js
        console.log('--- Invoices (factures) for IDDossiers = ' + dossier.IDDossiers + ' ---');
        const [factures] = await pool.query('SELECT * FROM factures WHERE IDDossiers = ?', [dossier.IDDossiers]);
        console.log(`Found ${factures.length} records in factures table`);
        console.table(factures.map(f => ({
            IDFactures: f.IDFactures,
            NumeroFacture: f.NumeroFacture,
            IDDossiers: f.IDDossiers,
            MontantTTCFacture: f.MontantTTCFacture,
            DateFacture: f.DateFacture
        })));

    } catch (error) {
        console.error('Debug failed:', error.message);
    } finally {
        await pool.end();
    }
}

debugDossier();
