const pool = require('../config/database');

async function seed() {
    const modes = [
        'Espèces',
        'Chèque',
        'Virement',
        'Traite',
        'Solde compte',
        'Autres'
    ];

    console.log('--- Seeding Modes de Règlements ---');

    try {
        for (const mode of modes) {
            const [exists] = await pool.query('SELECT * FROM modesreglements WHERE libelle = ?', [mode]);
            if (exists.length === 0) {
                await pool.query('INSERT INTO modesreglements (libelle) VALUES (?)', [mode]);
                console.log(`✅ Mode ajouté : ${mode}`);
            } else {
                console.log(`ℹ️ Mode déjà présent : ${mode}`);
            }
        }
    } catch (err) {
        console.error('❌ Erreur seed:', err);
    } finally {
        await pool.end();
        process.exit();
    }
}

seed();
