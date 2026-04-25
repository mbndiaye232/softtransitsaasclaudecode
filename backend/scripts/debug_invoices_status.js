const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function debugInvoices() {
    const dossierId = 20;
    console.log(`Checking status of invoices for dossier ID: ${dossierId}`);

    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [factures] = await pool.query('SELECT IDFactures, NumeroFacture, Validee, ReliquatFacture, MontantTTCFacture FROM factures WHERE IDDossiers = ?', [dossierId]);
        console.table(factures);

        if (factures.some(f => f.Validee === null || f.Validee === undefined)) {
            console.log('WARNING: Some invoices have NULL Validee status');
        }

    } catch (error) {
        console.error('Debug failed:', error.message);
    } finally {
        await pool.end();
    }
}

debugInvoices();
