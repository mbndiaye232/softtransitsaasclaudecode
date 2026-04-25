require('dotenv').config({ path: '../.env' });
const pool = require('../config/database');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

async function importRubriques() {
    const connection = await pool.getConnection();

    try {
        console.log('📖 Reading Rubriques.xml file...');
        const xmlPath = path.join(__dirname, '../../docs/Rubriques.xml');
        if (!fs.existsSync(xmlPath)) {
            console.error(`❌ XML file not found at: ${xmlPath}`);
            process.exit(1);
        }
        const xmlData = fs.readFileSync(xmlPath, 'utf8');

        console.log('🔍 Parsing Rubriques.xml...');
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlData);

        const tarifRecords = result.WINDEV_TABLE.TABLE_CONTENU;
        console.log(`✓ Found ${tarifRecords.length} rubrique records`);

        const rubriquesList = tarifRecords.map(record => ({
            CodeRubrique: record.CodeRubrique ? record.CodeRubrique[0] : null,
            libelleRubrique: record.libelleRubrique ? record.libelleRubrique[0] : '',
            AFacturer: record.AFacturer ? parseInt(record.AFacturer[0]) : 0,
            NumeroCompte: record.NumeroCompte ? record.NumeroCompte[0] : null,
            Observations: record.Observations ? record.Observations[0] : null
        })).filter(r => r.CodeRubrique); // Filter out entries without a code

        console.log(`✓ Prepared ${rubriquesList.length} rubriques for insertion`);

        await connection.beginTransaction();

        console.log('🗑️  Clearing existing rubriques...');
        try {
            await connection.query('SET FOREIGN_KEY_CHECKS = 0');
            await connection.query('DELETE FROM rubriques');
            await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        } catch (e) {
            console.warn('⚠️  Could not clear rubriques table, continuing anyway...', e.message);
        }

        console.log('💾 Inserting rubriques...');
        const values = rubriquesList.map(r => [
            r.CodeRubrique,
            r.libelleRubrique,
            r.AFacturer,
            r.NumeroCompte,
            r.Observations
        ]);

        if (values.length > 0) {
            await connection.query(
                `INSERT INTO rubriques (CodeRubrique, libelleRubrique, AFacturer, NumeroCompte, Observations) VALUES ?`,
                [values]
            );
        }

        await connection.commit();
        console.log(`✓ Import completed! Inserted ${rubriquesList.length} rubriques`);

        // Show sample data
        const [samples] = await connection.query(`
            SELECT IDRubriques, CodeRubrique, libelleRubrique, NumeroCompte 
            FROM rubriques 
            ORDER BY IDRubriques 
            LIMIT 10
        `);
        console.log(`\n📋 Sample rubriques:`);
        samples.forEach(s => {
            console.log(`   ${s.IDRubriques}: [${s.CodeRubrique}] ${s.libelleRubrique} (Compte: ${s.NumeroCompte})`);
        });

    } catch (error) {
        await connection.rollback();
        console.error('\n❌ Import error:', error);
        process.exit(1);
    } finally {
        connection.release();
        process.exit(0);
    }
}

importRubriques();
