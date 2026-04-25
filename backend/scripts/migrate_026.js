const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        const migrationPath = path.join(__dirname, '../migrations/026_create_unites_poids_table.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        // Split by semicolon but ignore ones inside strings or comments if any
        // For this simple migration, we can just run it
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (const statement of statements) {
            console.log('Executing:', statement.trim().substring(0, 50) + '...');
            await pool.query(statement);
        }
        
        console.log('Migration 026 completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
