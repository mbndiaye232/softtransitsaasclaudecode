const pool = require('../config/database');

async function check() {
    try {
        console.log('Checking database connection...');
        const [rows] = await pool.query('SELECT 1');
        console.log('Database connected successfully.');

        console.log('Attempting to create/check table unitesvolume...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`unitesvolume\` (
                \`IDUniteVolume\` INT AUTO_INCREMENT PRIMARY KEY,
                \`LibelleUniteVolume\` VARCHAR(50) NOT NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table unitesvolume checked/created.');

        console.log('Fetching rows...');
        const [units] = await pool.query('SELECT * FROM \`unitesvolume\`');
        console.log('Units found:', units);

        process.exit(0);
    } catch (error) {
        console.error('ERROR during check:', error);
        process.exit(1);
    }
}

check();
