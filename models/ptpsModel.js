const pool = require('../config/db');

exports.create = async (data) => {
  const query = `
    INSERT INTO ptps (casefile_id, ptp_date, ptp_amount, ptp_by, ptp_type, ptp_status, affirm_status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    data.casefile_id, data.ptp_date, data.ptp_amount, data.ptp_by,
    data.ptp_type || 'Normal', data.ptp_status || 'Not Honoured', data.affirm_status || 'Not Affirmed'
  ];

  const [result] = await pool.query(query, values);
  return { id: result.insertId, ...data };
};

exports.updateStatus = async (id, data) => {
  const query = `
    UPDATE ptps SET ptp_status = ?, affirm_status = ?, is_active = ?
    WHERE id = ?
  `;
  const values = [data.ptp_status, data.affirm_status, data.is_active || true, id];

  await pool.query(query, values);
  return { id, ...data };
};

exports.reschedule = async (id, data) => {
  const query = `
    UPDATE ptps SET ptp_amount = ?, ptp_date = ?, is_active = ?
    WHERE id = ?
  `;
  const values = [data.ptp_amount, data.ptp_date, data.is_active || true, id];

  await pool.query(query, values);
  return { id, ...data };
};

exports.findByCase = async (casefile_id) => {
  const [rows] = await pool.query(`
    SELECT * FROM ptps
    WHERE casefile_id = ?
    ORDER BY ptp_date DESC
  `, [casefile_id]);
  return rows;
};
