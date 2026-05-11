const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

// Support fichier local (dev) ou contenu PEM direct (Render/production)
let sslConfig = undefined;
if (process.env.DB_SSL_CA_CONTENT) {
  sslConfig = { ca: process.env.DB_SSL_CA_CONTENT };
} else if (process.env.DB_SSL_CA) {
  sslConfig = { ca: fs.readFileSync(process.env.DB_SSL_CA) };
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00'
});

// Test connection
pool.getConnection()
  .then(connection => {
    console.log('✓ Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('✗ Database connection failed:', err.message);
  });

module.exports = pool;
