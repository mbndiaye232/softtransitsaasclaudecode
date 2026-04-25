const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTables() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'soft_transit_saas'
    };

    try {
        const connection = await mysql.createConnection(config);

        const [create] = await connection.query("SHOW CREATE TABLE conteneurbl");
        console.log('--- CREATE TABLE conteneurbl ---');
        console.log(create[0]['Create Table']);

        console.log('--- BILLOFLADING ---');
        try {
            const [cols3] = await connection.query("DESCRIBE billoflading");
            console.table(cols3);
        } catch (e) { console.log('billoflading missing'); }


        await connection.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkTables();
