const pool = require('../config/db');

exports.create = async (data) => {
  const query = `
    INSERT INTO payments (casefile_id, amount, payment_date, reference_no, created_by)
    VALUES (?, ?, ?, ?, ?)
  `;
  const values = [data.casefile_id, data.amount, data.payment_date, data.reference_no, data.created_by];
  const [result] = await pool.query(query, values);
  return { id: result.insertId, ...data };
};

exports.findByCase = async (casefile_id) => {
  const [rows] = await pool.query(`
    SELECT * FROM payments
    WHERE casefile_id = ?
    ORDER BY payment_date DESC
  `, [casefile_id]);
  return rows;
};
