const pool = require('./backend/config/database');

async function main() {
    try {
        const [rows] = await pool.query('DESCRIBE couleurs');
        console.table(rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

main();
