const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function fixExistingInvoices() {
    console.log('Fixing existing invoices: setting Validee=1 and ReliquatFacture=MontantTTCFacture where MontantRegleFacture=0');

    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        // Update invoices that are not validated and haven't been partially paid yet
        const [result] = await pool.query(`
            UPDATE factures 
            SET Validee = 1, 
                ReliquatFacture = MontantTTCFacture 
            WHERE (Validee = 0 OR Validee IS NULL) 
            AND (MontantRegleFacture = 0 OR MontantRegleFacture IS NULL)
        `);

        console.log(`Updated ${result.affectedRows} invoices.`);

        // Also fix ReliquatFacture for those who might have MontantRegleFacture but Reliquat is 0
        const [result2] = await pool.query(`
            UPDATE factures 
            SET ReliquatFacture = MontantTTCFacture - MontantRegleFacture
            WHERE ReliquatFacture = 0 AND MontantTTCFacture > 0 AND Validee = 1
        `);
        console.log(`Fixed reliquat for ${result2.affectedRows} validated invoices.`);

    } catch (error) {
        console.error('Migration failed:', error.message);
    } finally {
        await pool.end();
    }
}

fixExistingInvoices();
