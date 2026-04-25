require('dotenv').config();
const mysql = require('mysql2/promise');

async function upgrade() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    try {
        console.log('--- Upgrading Comptes Mails Module ---');

        // 1. Ensure table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS comptesmails (
                IDComptesMails INT AUTO_INCREMENT PRIMARY KEY,
                AdresseMail VARCHAR(255) NOT NULL,
                MotDePasse VARCHAR(255) NOT NULL,
                CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 2. Add missing columns one by one
        const columnsToAdd = [
            { name: 'LibelleMail', type: 'VARCHAR(255)' },
            { name: 'ServeurPOP', type: 'VARCHAR(255)' },
            { name: 'PortPOP', type: 'VARCHAR(10) DEFAULT "110"' },
            { name: 'ServeurSMTP', type: 'VARCHAR(255)' },
            { name: 'PortSMTP', type: 'VARCHAR(10) DEFAULT "587"' },
            { name: 'ServeurIMAPEntrant', type: 'VARCHAR(255)' },
            { name: 'PortIMAPEntrant', type: 'VARCHAR(10) DEFAULT "143"' },
            { name: 'ServeurIMAPSortant', type: 'VARCHAR(255)' },
            { name: 'PortIMAPSortant', type: 'VARCHAR(10) DEFAULT "587"' },
            { name: 'structur_id', type: 'INT' },
            { name: 'UpdatedAt', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
        ];

        const [existingCols] = await pool.query("SHOW COLUMNS FROM comptesmails");
        const existingColNames = existingCols.map(c => c.Field.toLowerCase());

        for (const col of columnsToAdd) {
            if (!existingColNames.includes(col.name.toLowerCase())) {
                console.log(`Adding column ${col.name}...`);
                await pool.query(`ALTER TABLE comptesmails ADD COLUMN ${col.name} ${col.type}`);
            }
        }

        // 3. Ensure index
        try {
            await pool.query("CREATE INDEX idx_structur ON comptesmails(structur_id)");
            console.log("Index added.");
        } catch (e) {
            // Index likely exists
        }

        // 4. Ensure CONFIG permission
        const [existingPerm] = await pool.query("SELECT * FROM permissions WHERE code = 'CONFIG' LIMIT 1");
        if (existingPerm.length === 0) {
            await pool.query("INSERT INTO permissions (code, name) VALUES ('CONFIG', 'Paramètres Système')");
            console.log('✓ CONFIG permission created.');
            
            const [permRow] = await pool.query("SELECT id FROM permissions WHERE code = 'CONFIG'");
            const permId = permRow[0].id;
            const [admins] = await pool.query("SELECT IDAgents FROM Agents WHERE role = 'ADMIN'");
            for (const admin of admins) {
                await pool.query("INSERT IGNORE INTO agent_permissions (agent_id, permission_id, can_view, can_create, can_edit, can_delete) VALUES (?, ?, 1, 1, 1, 1)", [admin.IDAgents, permId]);
            }
        }

        console.log('\n--- SUCCESS ---');
        console.log('Database schema is now up to date.');

    } catch (e) {
        console.error('Upgrade Error:', e.message);
    } finally {
        pool.end();
    }
}
upgrade();
