const pool = require('./config/database');

async function testLivraisonsAPI() {
    console.log('Testing Mise en Livraison API...');
    try {
        const dossierId = 14;

        // 1. Test Foremen fetch
        const [foremen] = await pool.query('SELECT IDAgents as id, NomAgent as name FROM Agents WHERE IDGroupes = 11 LIMIT 1');
        if (foremen.length === 0) {
            console.log('⚠ No foremen found in DB (IDGroupes 11)');
        } else {
            console.log('✓ Found foreman:', foremen[0].name);
            const foremanId = foremen[0].id;

            // 2. Test Upsert (POST)
            await pool.query(
                `INSERT INTO miseenlivraison (IDDossiers, DateMiseEnLivraison, Idcontremaitre, Pregate) 
                 VALUES (?, NOW(), ?, ?) 
                 ON DUPLICATE KEY UPDATE DateMiseEnLivraison = NOW(), Idcontremaitre = ?, Pregate = ?`,
                [dossierId, foremanId, 'TEST-PREGATE', foremanId, 'TEST-PREGATE']
            );
            console.log('✓ Mise en livraison saved (upserted)');

            // 3. Test Fetch
            const [rows] = await pool.query('SELECT * FROM miseenlivraison WHERE IDDossiers = ?', [dossierId]);
            if (rows.length > 0) {
                console.log('✓ Fetch successful, Pregate:', rows[0].Pregate);
            } else {
                throw new Error('Fetch failed after save');
            }
        }

        console.log('\nAll tests passed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
}

testLivraisonsAPI();
