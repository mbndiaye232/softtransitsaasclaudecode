const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const pool = require('../config/database');

async function importMoyensFromTiers() {
    const xmlPath = path.join(__dirname, '../uploads/moyens_from_tiers.xml');
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    const parser = new xml2js.Parser({ explicitArray: false });

    try {
        const result = await parser.parseStringPromise(xmlContent);
        const list = result.WINDEV_TABLE.TABLE_CONTENU;

        console.log(`Starting processing of ${list.length} tiers to create moyenstransport entries...`);

        // Mapping: Domain -> Type
        // Domain 1 (Maritime) -> Type 1 (Navire)
        // Domain 2 (Terrestre) -> Type 3 (Camion)
        // Domain 3 (Aérien) -> Type 2 (Avion)
        const domainToType = {
            1: 1,
            2: 3,
            3: 2
        };

        for (const item of list) {
            const idTier = parseInt(item.IDTiers);

            // Find domain for this tier
            const [liaisons] = await pool.query(
                'SELECT IDDomaineActivite FROM liaisontiersdomainesactivites WHERE IDTiers = ?',
                [idTier]
            );

            if (liaisons.length === 0) {
                console.log(`Skipping tier ${idTier}: No domain liaison found.`);
                continue;
            }

            const idDomaine = liaisons[0].IDDomaineActivite;
            const idTypeMoyen = domainToType[idDomaine];

            if (!idTypeMoyen) {
                console.log(`Skipping tier ${idTier}: Domain ${idDomaine} has no corresponding transport type.`);
                continue;
            }

            // Insert into moyenstransport
            await pool.query(`
                INSERT INTO moyenstransport (LibelleMoyensTransport, idtypeMoyensTransport, Observations, IDTiers)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    idtypeMoyensTransport = VALUES(idtypeMoyensTransport),
                    Observations = VALUES(Observations),
                    IDTiers = VALUES(IDTiers)
            `, [item.libtier, idTypeMoyen, item.Observations || '', idTier]);

            console.log(`Created moyenstransport for ${item.libtier} (Type ${idTypeMoyen}, Tier ${idTier})`);
        }

        console.log('Processing completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Import error:', err);
        process.exit(1);
    }
}

importMoyensFromTiers();
