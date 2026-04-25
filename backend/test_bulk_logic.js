const axios = require('axios');
async function test() {
    try {
        // Need a token. I'll check if I can find one or just use a mock request if I was testing locally.
        // But I'm on the server, I can call the database directly to simulate the logic or use the existing server.
        console.log('Testing bulk update logic manually...');
        const pool = require('./config/database');
        
        const mode = 'individual';
        const ntsPrefix = ['4805240000', '4805250000'];
        const CodeTaxe = 'TT';
        const CodeTaux = 'TESTT';
        const userId = 9; // Admin from previous logs
        
        const [taxeRows] = await pool.query('SELECT IDTaxes FROM taxes WHERE CodeTaxe = ?', [CodeTaxe]);
        const IDTaxes = taxeRows[0].IDTaxes;
        const [tauxRows] = await pool.query('SELECT IDTaux FROM taux WHERE CodeTaux = ?', [CodeTaux]);
        const IDTaux = tauxRows[0].IDTaux;
        
        const [produitsRows] = await pool.query('SELECT NTS, IDProduits FROM produits WHERE NTS IN (?)', [ntsPrefix]);
        console.log('Products found:', produitsRows.map(p => p.NTS));
        
        for (const produit of produitsRows) {
            const [existing] = await pool.query('SELECT IDTarifs FROM tarifs WHERE NTS = ? AND CodeTaxe = ?', [produit.NTS, CodeTaxe]);
            if (existing.length > 0) {
                console.log('UPDATE', produit.NTS);
            } else {
                console.log('INSERT', produit.NTS);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
test();
