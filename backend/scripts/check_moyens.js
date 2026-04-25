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
        const [tables] = await pool.query("SHOW TABLES LIKE '%moyen%'");
        console.log('Tables matching "moyen":', tables);
        
        const [tables2] = await pool.query("SHOW TABLES LIKE '%transport%'");
        console.log('Tables matching "transport":', tables2);
        
        if (tables.length > 0) {
            const tableName = Object.values(tables[0])[0];
            const [desc] = await pool.query(`DESCRIBE ${tableName}`);
            console.log(`\nDesc for ${tableName}:`, desc);
        }
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
check();
