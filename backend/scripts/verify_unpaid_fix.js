const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function verifyUnpaidInvoices() {
    const clientId = 3;
    console.log(`Verifying unpaid invoices for client ID: ${clientId}`);

    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const query = `
            SELECT f.IDFactures, f.NumeroFacture, f.Validee, f.ReliquatFacture, f.MontantTTCFacture, d.CodeDossier
            FROM factures f
            JOIN dossiers d ON f.IDDossiers = d.IDDossiers
            WHERE d.IDCLIENTS = ? AND f.ReliquatFacture > 0 AND f.Validee = 1
        `;
        const [rows] = await pool.query(query, [clientId]);

        console.log(`--- Unpaid Invoices Found: ${rows.length} ---`);
        console.table(rows);

        if (rows.length === 11) {
            console.log('SUCCESS: All 11 problematic invoices are now appearing in the unpaid list!');
        } else {
            console.log(`WARNING: Expected 11 invoices, found ${rows.length}.`);
        }

    } catch (error) {
        console.error('Verification failed:', error.message);
    } finally {
        await pool.end();
    }
}

verifyUnpaidInvoices();
