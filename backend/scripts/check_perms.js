require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkPermissions() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('--- Permissions Table ---');
        const [perms] = await pool.query('SELECT * FROM permissions');
        console.table(perms);

        console.log('--- Checking STATUTS permission for Agent 1 ---');
        const [results] = await pool.query(
            "SELECT ap.*, p.code FROM agent_permissions ap JOIN permissions p ON ap.permission_id = p.id WHERE ap.agent_id = 1 AND p.code = 'STATUTS'"
        );
        console.table(results);

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        pool.end();
    }
}
checkPermissions();
