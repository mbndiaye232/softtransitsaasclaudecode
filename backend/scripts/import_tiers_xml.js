const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const pool = require('../config/database');

async function importTiers() {
    const xmlPath = path.join(__dirname, '../uploads/tiers_import.xml');
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    const parser = new xml2js.Parser({ explicitArray: false });

    try {
        const result = await parser.parseStringPromise(xmlContent);
        const tiersList = result.WINDEV_TABLE.TABLE_CONTENU;

        console.log(`Starting import of ${tiersList.length} tiers...`);

        const defaultStructurId = 1;

        for (const item of tiersList) {
            const formatDate = (dateStr) => {
                if (!dateStr || dateStr === '31/12/1799') return null;
                const [day, month, year] = dateStr.split('/');
                return `${year}-${month}-${day}`;
            };

            const data = {
                IDTiers: parseInt(item.IDTiers),
                structur_id: defaultStructurId,
                libtier: item.libtier || '',
                Observations: item.Observations || '',
                adresseTiers: item.adresseTiers || '',
                TelTiers: item.TelTiers || '',
                CelTiers: item.CelTiers || '',
                EmailTiers: item.EmailTiers || '',
                NINEATiers: item.NINEATiers || '',
                SaisiLe: formatDate(item.SaisiLe),
                IdAgentSaisi: parseInt(item.IdAgentSaisi) || 0,
                IDStatuts: parseInt(item.IDStatuts) || 0,
                Modifiele: formatDate(item.Modifiele),
                idagentmodification: parseInt(item.idagentmodification) || 0,
                SiteWeb: item.SiteWeb || ''
            };

            await pool.query(`
                INSERT INTO tiers (
                    IDTiers, structur_id, libtier, Observations, adresseTiers, 
                    TelTiers, CelTiers, EmailTiers, NINEATiers, SaisiLe, 
                    IdAgentSaisi, IDStatuts, Modifiele, idagentmodification, SiteWeb
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    libtier = VALUES(libtier),
                    Observations = VALUES(Observations),
                    adresseTiers = VALUES(adresseTiers),
                    TelTiers = VALUES(TelTiers),
                    CelTiers = VALUES(CelTiers),
                    EmailTiers = VALUES(EmailTiers),
                    NINEATiers = VALUES(NINEATiers),
                    SaisiLe = VALUES(SaisiLe),
                    IdAgentSaisi = VALUES(IdAgentSaisi),
                    IDStatuts = VALUES(IDStatuts),
                    Modifiele = VALUES(Modifiele),
                    idagentmodification = VALUES(idagentmodification),
                    SiteWeb = VALUES(SiteWeb)
            `, [
                data.IDTiers, data.structur_id, data.libtier, data.Observations, data.adresseTiers,
                data.TelTiers, data.CelTiers, data.EmailTiers, data.NINEATiers, data.SaisiLe,
                data.IdAgentSaisi, data.IDStatuts, data.Modifiele, data.idagentmodification, data.SiteWeb
            ]);

            console.log(`Imported tier ${data.IDTiers}: ${data.libtier}`);
        }

        console.log('Import completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Import error:', err);
        process.exit(1);
    }
}

importTiers();
