const pool = require('../config/db');

// -------------------- Debt Category --------------------
exports.addDebtCategory = async (title, description) => {
  try {
    const result = await pool.query(
      'INSERT INTO debt_categories (title, description) VALUES ($1) RETURNING *',
      [title, description]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error adding debt category:', error);
    throw error;
  }
};

exports.getAllDebtCategory = async () => {
  try {
    const result = await pool.query('SELECT * FROM debt_categories ORDER BY id ASC');
    return result.rows;
  } catch (error) {
    console.error('Error fetching debt categories:', error);
    throw error;
  }
};

// -------------------- Debt Type --------------------
exports.addDebtType = async (name, description) => {
  try {
    const [result] = await pool.query(
      'INSERT INTO debt_types (title, description) VALUES (?, ?)',
      [name, description]
    );
    // result.insertId contains the new record ID
    return result;
  } catch (error) {
    console.error('Error adding debt type:', error);
    throw error;
  }
};

exports.getAllDebtTypes = async () => {
  try {
    const [result] = await pool.query('SELECT * FROM debt_types ORDER BY id ASC');
    return result;
  } catch (error) {
    console.error('Error fetching debt types:', error);
    throw error;
  }
};

// Add Debt Sub Type
exports.addDebtSubType = async (title, description, debt_type_id, status = 'ACTIVE') => {
  const [result] = await pool.query(
    'INSERT INTO debt_sub_types (title, description, debt_type_id, status) VALUES (?, ?, ?, ?)',
    [title, description, debt_type_id, status]
  );
  return result;
};

// Get all Debt Sub Types
exports.getAllDebtSubTypes = async () => {
  const [rows] = await pool.query(`
    SELECT ds.*, dt.title as debt_type_title
    FROM debt_sub_types ds
    JOIN debt_types dt ON ds.debt_type_id = dt.id
    ORDER BY ds.created_at DESC
  `);
  return rows;
};


// -------------------- Currency --------------------
exports.addCurrency = async (code, name, symbol) => {
  try {
    const [result] = await pool.query(
      'INSERT INTO currencies (code, name, symbol) VALUES (?, ?, ?)',
      [code, name, symbol]
    );

    return {
      id: result.insertId,
      code,
      name,
      symbol
    };
  } catch (error) {
    console.error('Error adding currency:', error);
    throw error;
  }
};


exports.getAllCurrencies = async () => {
  try {
    const result = await pool.query('SELECT * FROM currencies ORDER BY id ASC');
    return result.rows;
  } catch (error) {
    console.error('Error fetching currencies:', error);
    throw error;
  }
};