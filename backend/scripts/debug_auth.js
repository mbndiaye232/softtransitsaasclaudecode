require('dotenv').config();
const mysql = require('mysql2/promise');

async function debugAuth() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('--- Checking User Account Status ---');
        
        // Check Agents
        const [users] = await pool.query('SELECT IDAgents, Login, Email, role, is_active, structur_id FROM Agents');
        console.table(users);

        // Check Companies
        const [companies] = await pool.query('SELECT IDSociete, NomSociete, is_active FROM structur');
        console.table(companies);

    } catch (e) {
        console.error('Debug Error:', e.message);
    } finally {
        pool.end();
    }
}
debugAuth();
