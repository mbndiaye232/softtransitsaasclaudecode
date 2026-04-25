const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function verifyFix() {
    const dossierId = 20; // IDDossiers for IMP-MA-TC-2026-00005
    const apiUrl = `http://localhost:${process.env.PORT || 3001}/api`;

    console.log(`Verifying fix for dossier ID: ${dossierId}`);

    try {
        // Need a token to access the API
        // I'll try to get one if possible or just check the code logic
        // Since I can't easily login here without credentials, I'll check the local DB connection again
        // to verify the join logic would work.

        const mysql = require('mysql2/promise');
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const query = `
            SELECT d.IDDossiers as id, d.IDCLIENTS as clientId, c.NomRS as clientName, c.NomRS as NomClient,
                    d.Libelle as label, d.CodeDossier as code
             FROM dossiers d
             LEFT JOIN CLIENTS c ON d.IDCLIENTS = c.IDCLIENTS
             WHERE d.IDDossiers = ?
        `;
        const [rows] = await pool.query(query, [dossierId]);

        console.log('--- API Simulation Result ---');
        console.table(rows);

        if (rows.length > 0 && rows[0].clientName) {
            console.log('SUCCESS: Client name correctly joined!');
        } else {
            console.log('FAILURE: Client name missing or join failed.');
        }

        const [factures] = await pool.query('SELECT * FROM factures WHERE IDDossiers = ?', [dossierId]);
        console.log(`--- Invoices for dossier ${dossierId}: ${factures.length} found ---`);

        await pool.end();
    } catch (error) {
        console.error('Verification failed:', error.message);
    }
}

verifyFix();
