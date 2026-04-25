const pool = require('./config/database');

async function testDeclarationsAPI() {
    console.log('Testing Declarations API...');
    try {
        const dossierId = 14;

        // 1. Test Active Cotation fetch
        const [cotation] = await pool.query(
            `SELECT dc.*, a.NomAgent as name 
             FROM dossier_cotations dc
             JOIN Agents a ON dc.agent_id = a.IDAgents
             WHERE dc.dossier_id = ? AND dc.is_active = 1`,
            [dossierId]
        );

        if (cotation.length > 0) {
            console.log('✓ Found active cotation for agent:', cotation[0].name);
        } else {
            console.log('⚠ No active cotation found for dossier', dossierId);
        }

        // 2. Test Regime fetch
        const [regimes] = await pool.query('SELECT * FROM regimedeclaration LIMIT 1');
        if (regimes.length === 0) {
            console.log('No regimes found');
        } else {
            console.log('✓ Found regimes');
            const regimeCode = regimes[0].CodeRegimeDeclaration;

            // 3. Test Create Declaration
            const [declResult] = await pool.query(
                `INSERT INTO declarations (structur_id, IDDossiers, NumeroDeclaration, DateDeclaration, RegimeDeclaration, NumeroBureau, IdAgent) 
                 VALUES (?, ?, ?, NOW(), ?, ?, ?)`,
                [1, dossierId, 'TEST-DECL-' + Date.now(), regimeCode, '4', cotation.length > 0 ? cotation[0].agent_id : 0]
            );
            console.log('✓ Declaration created, ID:', declResult.insertId);

            // 4. Test Delete Declaration
            await pool.query('DELETE FROM declarations WHERE IDDeclarations = ?', [declResult.insertId]);
            console.log('✓ Declaration deleted');
        }

        console.log('\nAll tests passed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
}

testDeclarationsAPI();
