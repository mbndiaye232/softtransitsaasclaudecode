const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const pool = require('../config/database');

async function importMoyensTransport() {
    const xmlPath = path.join(__dirname, '../uploads/moyensTransport.xml');

    if (!fs.existsSync(xmlPath)) {
        console.error(`File not found: ${xmlPath}`);
        process.exit(1);
    }

    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    const parser = new xml2js.Parser({ explicitArray: false });

    try {
        const result = await parser.parseStringPromise(xmlContent);
        // Handle case where it might be a single object or array
        let list = result.WINDEV_TABLE.TABLE_CONTENU;

        if (!list) {
            console.error('No data found in XML');
            process.exit(1);
        }

        if (!Array.isArray(list)) {
            list = [list];
        }

        console.log(`Starting processing of ${list.length} transport modes...`);

        let successCount = 0;
        let errorCount = 0;

        for (const item of list) {
            try {
                // Ensure IDTiers is an integer, default to 0 if 0 or empty
                const idTier = parseInt(item.IDTiers) || 0;
                const idType = parseInt(item.idtypeMoyensTransport) || 1; // Default to 1 if missing? Or keep as is.

                await pool.query(`
                    INSERT INTO moyenstransport (IDMoyensTransport, LibelleMoyensTransport, idtypeMoyensTransport, Observations, IDTiers)
                    VALUES (?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        LibelleMoyensTransport = VALUES(LibelleMoyensTransport),
                        idtypeMoyensTransport = VALUES(idtypeMoyensTransport),
                        Observations = VALUES(Observations),
                        IDTiers = VALUES(IDTiers)
                `, [
                    item.IDMoyensTransport,
                    item.LibelleMoyensTransport,
                    idType,
                    item.Observations || null,
                    idTier
                ]);
                successCount++;
            } catch (innerErr) {
                console.error(`Error processing item ${item.LibelleMoyensTransport} (ID ${item.IDMoyensTransport}):`, innerErr.message);
                errorCount++;
            }
        }

        console.log(`Processing completed. Success: ${successCount}, Errors: ${errorCount}`);
        process.exit(0);
    } catch (err) {
        console.error('Import error:', err);
        process.exit(1);
    }
}

importMoyensTransport();
