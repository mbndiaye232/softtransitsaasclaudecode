const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

try {
    const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 80, left: 50, right: 50 }
    });

    const outputPath = path.join(__dirname, 'test_output.pdf');
    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    doc.text('Hello World');

    doc.end();

    writeStream.on('finish', () => console.log('PDF generated successfully'));
    writeStream.on('error', (err) => console.error('Stream error:', err));
} catch (err) {
    console.error('Crash:', err);
}
