const pool = require('../config/database');
const InvoicePDFGenerator = require('../services/InvoicePDFGenerator');

async function testPDF() {
    try {
        console.log('--- Starting Invoice PDF Test ---');

        // Find a recent invoice
        const [invoices] = await pool.query('SELECT IDFactures FROM factures ORDER BY DateFacture DESC LIMIT 1');

        if (invoices.length === 0) {
            console.log('No invoices found in database. Please create one first via UI.');
            process.exit(0);
        }

        const invoiceId = invoices[0].IDFactures;
        console.log(`Generating PDF for Invoice ID: ${invoiceId}...`);

        const generator = new InvoicePDFGenerator(pool);
        const path = await generator.generatePDF(invoiceId);

        console.log('✓ Success! PDF generated at:', path);
    } catch (error) {
        console.error('✗ Test failed:', error);
    } finally {
        pool.end();
    }
}

testPDF();
