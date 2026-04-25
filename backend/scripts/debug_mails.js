require('dotenv').config();
const mysql = require('mysql2/promise');

async function debug() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('--- DB Check ---');
        const [tables] = await pool.query("SHOW TABLES LIKE 'comptesmails'");
        console.log('Table comptesmails exists:', tables.length > 0);
        
        if (tables.length > 0) {
            const [columns] = await pool.query("SHOW COLUMNS FROM comptesmails");
            console.log('Columns:', columns.map(c => c.Field).join(', '));
        }

        console.log('\n--- Permissions Check ---');
        const [permissions] = await pool.query("SELECT * FROM permissions WHERE resource = 'CONFIG'");
        console.log('CONFIG permissions found:', permissions.length);
        
    } catch (e) {
        console.error('Debug Error:', e.message);
    } finally {
        pool.end();
    }
}
debug();
