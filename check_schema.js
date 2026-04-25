require('dotenv').config({ path: './backend/.env' });
const pool = require('./backend/config/database');

async function checkSchema() {
    try {
        const [tables] = await pool.query('SHOW TABLES');
        console.log('Tables in database:');
        console.log(tables.map(row => Object.values(row)[0]));

        const [columns] = await pool.query('SHOW COLUMNS FROM structur');
        const columnNames = columns.map(c => c.Field);
        console.log('\nColumns in "structur" table:');
        console.log(columnNames);

        const saasFields = ['subdomain', 'plan', 'status'];
        const missingFields = saasFields.filter(f => !columnNames.includes(f));

        if (missingFields.length > 0) {
            console.log('\nMissing SaaS fields:', missingFields);
        } else {
            console.log('\nAll SaaS fields are present.');
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkSchema();
