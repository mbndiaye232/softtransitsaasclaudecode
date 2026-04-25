const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkSchemas() {
    console.log('Checking schemas for cancellations...');

    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const tables = ['reglements', 'comptesclients', 'mouvementscomptesclients', 'modesreglements'];
        for (const table of tables) {
            console.log(`--- Schema for ${table} ---`);
            const [rows] = await pool.query(`DESCRIBE ${table}`);
            console.table(rows);
        }
    } catch (error) {
        console.error('Check failed:', error.message);
    } finally {
        await pool.end();
    }
}

checkSchemas();
