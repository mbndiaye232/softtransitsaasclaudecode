const pool = require('../config/database');

async function seedPermissionsV2() {
    try {
        console.log('Adding missing permissions (v2)...');
        const missing = [
            { code: 'TIERS',               name: 'Gestion des Tiers' },
            { code: 'FINANCES',            name: 'Tableaux de bord financiers' },
            { code: 'CONFIG',              name: 'Configuration Générale' },
            { code: 'PARAMETRES_GENERAUX', name: 'Paramètres Système' },
            { code: 'RUBRIQUES',           name: 'Référentiel Rubriques' },
        ];

        for (const p of missing) {
            const [result] = await pool.query(
                'INSERT IGNORE INTO permissions (code, name) VALUES (?, ?)',
                [p.code, p.name]
            );
            if (result.affectedRows > 0) {
                console.log(`  + ${p.code} ajouté`);
            } else {
                console.log(`  = ${p.code} déjà présent`);
            }
        }

        console.log('Done.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

seedPermissionsV2();
