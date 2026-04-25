/**
 * Script de diagnostic : affiche la structure réelle de la table unitesvolume
 */
const pool = require('../config/database');

async function main() {
    try {
        // Vérifie si la table existe
        const [tables] = await pool.query(`SHOW TABLES LIKE 'unitesvolume'`);
        if (tables.length === 0) {
            console.log('❌ Table unitesvolume: DOES NOT EXIST');
            process.exit(0);
        }

        console.log('✅ Table unitesvolume: EXISTS\n');

        // Affiche les colonnes
        const [cols] = await pool.query(`SHOW COLUMNS FROM \`unitesvolume\``);
        console.log('Columns:');
        cols.forEach(c => {
            console.log(`  - ${c.Field} | Type: ${c.Type} | Null: ${c.Null} | Key: ${c.Key} | Default: ${c.Default}`);
        });

        // Affiche les données
        const [rows] = await pool.query(`SELECT * FROM \`unitesvolume\` LIMIT 10`);
        console.log(`\nRows (${rows.length} found):`);
        rows.forEach(r => console.log(' ', JSON.stringify(r)));

        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
}

main();
