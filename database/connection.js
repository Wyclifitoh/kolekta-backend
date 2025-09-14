const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.pool = null;
  }

  async initialize() {
    try {
      this.pool = mysql.createPool({
        host: process.env.MYSQL_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DB || 'kolekta_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true,
        charset: 'utf8mb4'
      });

      logger.info('Database pool created');
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  async testConnection() {
    if (!this.pool) {
      await this.initialize();
    }

    try {
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      logger.info('Database connection test successful');
      return true;
    } catch (error) {
      logger.error('Database connection test failed:', error);
      throw error;
    }
  }

  async query(sql, params = []) {
    if (!this.pool) {
      await this.initialize();
    }

    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      logger.error('Database query failed:', { sql, params, error: error.message });
      throw error;
    }
  }

  async transaction(callback) {
    if (!this.pool) {
      await this.initialize();
    }

    const connection = await this.pool.getConnection();
    await connection.beginTransaction();

    try {
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info('Database pool closed');
    }
  }
}

const database = new Database();
module.exports = database;