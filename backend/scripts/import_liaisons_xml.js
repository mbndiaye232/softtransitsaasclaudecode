const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const pool = require('../config/database');

async function importLiaisons() {
    const xmlPath = path.join(__dirname, '../uploads/liaisons_import.xml');
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    const parser = new xml2js.Parser({ explicitArray: false });

    try {
        const result = await parser.parseStringPromise(xmlContent);
        const list = result.WINDEV_TABLE.TABLE_CONTENU;

        console.log(`Starting import of ${list.length} liaisons...`);

        for (const item of list) {
            const data = {
                IDLiaisonTiersDomainesActivites: parseInt(item.IDLiaisonTiersDomainesActivites),
                IDTiers: parseInt(item.IDTiers),
                IDDomaineActivite: parseInt(item.IDDomaineActivite)
            };

            // We need to disable FK checks because some IDs might not exist yet if not all tiers were imported
            // But user provided them, so we proceed.
            await pool.query('SET FOREIGN_KEY_CHECKS = 0');

            await pool.query(`
                INSERT INTO liaisontiersdomainesactivites (IDLiaisonTiersDomainesActivites, IDTiers, IDDomaineActivite)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    IDTiers = VALUES(IDTiers),
                    IDDomaineActivite = VALUES(IDDomaineActivite)
            `, [data.IDLiaisonTiersDomainesActivites, data.IDTiers, data.IDDomaineActivite]);

            await pool.query('SET FOREIGN_KEY_CHECKS = 1');

            console.log(`Imported liaison ${data.IDLiaisonTiersDomainesActivites}: Tier ${data.IDTiers} -> Domain ${data.IDDomaineActivite}`);
        }

        console.log('Import completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Import error:', err);
        process.exit(1);
    }
}

importLiaisons();
