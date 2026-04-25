const pool = require('../config/database');

async function initMoyens() {
    try {
        console.log('--- Initializing Moyens de Transport ---');
        await pool.query(`
            INSERT INTO moyenstransport (IDMoyensTransport, LibelleMoyensTransport) 
            VALUES 
                (1, 'Maritime'), 
                (2, 'Aérien'), 
                (3, 'Terrestre')
            ON DUPLICATE KEY UPDATE LibelleMoyensTransport = VALUES(LibelleMoyensTransport)
        `);
        console.log('Successfully initialized moyens de transport.');
        process.exit(0);
    } catch (error) {
        console.error('Initialization error:', error);
        process.exit(1);
    }
}

initMoyens();
