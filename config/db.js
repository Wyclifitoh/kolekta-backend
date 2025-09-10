const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DB,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Keep promise pool as default export (for existing code)
const promisePool = pool.promise();

// Attach a helper to get a raw connection
promisePool.getConnection = async () => pool.promise().getConnection();

module.exports = promisePool;
