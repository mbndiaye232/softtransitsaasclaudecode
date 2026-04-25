require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '141.94.22.42',
        user: process.env.DB_USER || 'soft_transit_j_rw',
        password: process.env.DB_PASSWORD || 'HagXN9!37hGgq.d8P',
        database: process.env.DB_NAME || 'soft_transit_j'
    });

    try {
        const [tables] = await pool.query("SHOW TABLES LIKE '%mail%'");
        console.log('Tables matching "mail":', tables);
        
        const [tables2] = await pool.query("SHOW TABLES LIKE '%compte%'");
        console.log('Tables matching "compte":', tables2);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
check();
