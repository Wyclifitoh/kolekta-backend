const pool = require('../config/db');

exports.create = async (data) => {
  const query = `
    INSERT INTO casefile_interactions (
      casefile_id, created_by, contact_type_id, contact_status_id, call_type_id,
      next_action_id, next_action_date, notes, ptp_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    data.casefile_id, data.created_by, data.contact_type_id, data.contact_status_id, data.call_type_id,
    data.next_action_id, data.next_action_date, data.notes, data.ptp_id || null
  ];

  const [result] = await pool.query(query, values);
  return { id: result.insertId, ...data };
};

exports.findByCase = async (casefile_id) => {
  const [rows] = await pool.query(`
    SELECT ci.*, u.name AS created_by_name
    FROM casefile_interactions ci
    LEFT JOIN users u ON ci.created_by = u.id
    WHERE ci.casefile_id = ?
    ORDER BY ci.date_created DESC
  `, [casefile_id]);
  return rows;
};
