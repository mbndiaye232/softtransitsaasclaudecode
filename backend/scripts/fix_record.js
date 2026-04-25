const pool = require('../config/database');
async function run() {
    try {
        await pool.query("INSERT INTO moyenstransport (IDMoyensTransport, LibelleMoyensTransport, idtypeMoyensTransport, Observations, IDTiers) VALUES (35, 'MV AFRICAN BIS', 1, '', 26) ON DUPLICATE KEY UPDATE idtypeMoyensTransport=1");
        console.log('Fixed record 35');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
