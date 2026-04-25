const pool = require('c:\\softtransitsaasantigravity\\backend\\config\\database.js');

async function main() {
    try {
        const [taxes] = await pool.query('DESCRIBE taxes');
        console.log('--- taxes ---');
        console.table(taxes);
        
        const [taux] = await pool.query('DESCRIBE taux');
        console.log('--- taux ---');
        console.table(taux);
        
        const [tarifs] = await pool.query('DESCRIBE tarifs');
        console.log('--- tarifs ---');
        console.table(tarifs);

        const [produits] = await pool.query('DESCRIBE produits');
        console.log('--- produits ---');
        console.table(produits);
        
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

main();
