const pool = require('../config/database');

async function run() {
    try {
        console.log('Creating billoflading table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS billoflading (
                IDBillOfLading BIGINT AUTO_INCREMENT PRIMARY KEY,
                idbl BIGINT NOT NULL,
                NumeroTitreTransport VARCHAR(255),
                Consignee VARCHAR(255),
                Notify VARCHAR(255),
                LieuReception VARCHAR(255),
                LieuPaiementFret VARCHAR(255),
                NbreBLOriginaux INT DEFAULT 0,
                NombreConteneurs INT DEFAULT 0,
                Fournisseur VARCHAR(255),
                DureeFranchise INT DEFAULT 0,
                TypeTitreTransport VARCHAR(255),
                AdresseLivraisonFinale TEXT,
                Expediteur VARCHAR(255),
                DateCreation DATETIME DEFAULT CURRENT_TIMESTAMP,
                DateModification DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_idbl (idbl)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('billoflading table created successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error creating table:', err);
        process.exit(1);
    }
}

run();
