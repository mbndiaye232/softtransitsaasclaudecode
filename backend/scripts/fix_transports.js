const pool = require('../config/database');

async function fixAndInit() {
    try {
        console.log('--- Starting Database Fix ---');

        // 1. Disable FK checks
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');
        console.log('Foreign key checks disabled.');

        // 2. Fix Transports PK (Auto-increment)
        await pool.query('ALTER TABLE transports MODIFY IDTransports BIGINT AUTO_INCREMENT');
        console.log('Transports table modified to support AUTO_INCREMENT.');

        // 3. Init TypesMoyensTransport
        // Column name found via DESCRIBE: LibelleTypeMoyenTransport
        await pool.query(`
            INSERT INTO typesmoyenstransport (IDTypesMoyensTransport, LibelleTypeMoyenTransport)
            VALUES (1, 'Maritime'), (2, 'Aérien'), (3, 'Terrestre')
            ON DUPLICATE KEY UPDATE LibelleTypeMoyenTransport = VALUES(LibelleTypeMoyenTransport)
        `);
        console.log('TypesMoyensTransport initialized.');

        // 4. Init Moyenstransport
        // Column name found via DESCRIBE: LibelleMoyensTransport
        await pool.query(`
            INSERT INTO moyenstransport (IDMoyensTransport, LibelleMoyensTransport, idtypeMoyensTransport) 
            VALUES 
                (1, 'Maritime', 1), 
                (2, 'Aérien', 2), 
                (3, 'Terrestre', 3)
            ON DUPLICATE KEY UPDATE LibelleMoyensTransport = VALUES(LibelleMoyensTransport), idtypeMoyensTransport = VALUES(idtypeMoyensTransport)
        `);
        console.log('Moyenstransport initialized.');

        // 5. Re-enable FK checks
        await pool.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Foreign key checks re-enabled.');

        console.log('--- Database Fix Completed Successfully ---');
        process.exit(0);
    } catch (error) {
        console.error('Database Fix error:', error);
        process.exit(1);
    }
}

fixAndInit();
