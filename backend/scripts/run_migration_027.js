const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const migrationFile = path.join(__dirname, '../migrations/027_create_backup_config.sql');

async function runMigration() {
    console.log('Running migration...');
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    try {
        const sql = fs.readFileSync(migrationFile, 'utf8');
        await pool.query(sql);
        console.log('Migration executed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
        process.exit();
    }
}

runMigration();
