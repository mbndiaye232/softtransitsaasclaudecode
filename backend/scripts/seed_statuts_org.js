require('dotenv').config();
const mysql = require('mysql2/promise');

async function seed() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const statuts = [
        'Administration',
        'Association',
        'Autre',
        'Entreprise publique',
        'Fondation',
        'GIE',
        'ONG',
        'Personne physique',
        'SA',
        'SARL',
        'SUARL'
    ];

    try {
        console.log('--- Seeding Statuts Organisations ---');
        
        for (const label of statuts) {
            // Use INSERT IGNORE or check if exists to avoid duplicates
            const [exists] = await pool.query("SELECT * FROM statuts WHERE libelle = ?", [label]);
            if (exists.length === 0) {
                await pool.query("INSERT INTO statuts (libelle) VALUES (?)", [label]);
                console.log(`+ Added: ${label}`);
            } else {
                console.log(`. Already exists: ${label}`);
            }
        }

        console.log('\n--- SUCCESS ---');
        console.log('Seed completed successfully.');

    } catch (e) {
        console.error('Seed Error:', e.message);
    } finally {
        pool.end();
    }
}
seed();
