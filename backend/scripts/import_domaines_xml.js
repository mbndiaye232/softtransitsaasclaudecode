const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const pool = require('../config/database');

async function importDomaines() {
    const xmlPath = path.join(__dirname, '../uploads/domaines_import.xml');
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    const parser = new xml2js.Parser({ explicitArray: false });

    try {
        const result = await parser.parseStringPromise(xmlContent);
        const list = result.WINDEV_TABLE.TABLE_CONTENU;

        console.log(`Starting import of ${list.length} domains...`);

        for (const item of list) {
            const data = {
                IDDomaineActivite: parseInt(item.IDDomaineActivite),
                LibelleDomaineActivite: item.LibelleDomaineActivite,
                Code: item.Code
            };

            await pool.query(`
                INSERT INTO domaineactivite (IDDomaineActivite, LibelleDomaineActivite, Code)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    LibelleDomaineActivite = VALUES(LibelleDomaineActivite),
                    Code = VALUES(Code)
            `, [data.IDDomaineActivite, data.LibelleDomaineActivite, data.Code]);

            console.log(`Imported domain ${data.IDDomaineActivite}: ${data.LibelleDomaineActivite}`);
        }

        console.log('Import completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Import error:', err);
        process.exit(1);
    }
}

importDomaines();
