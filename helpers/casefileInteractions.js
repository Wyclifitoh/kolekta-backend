const pool = require('../config/db');

exports.logInteraction = async ({
  casefile_id,
  created_by,
  contact_type_id = null,
  contact_status_id = null,
  call_type_id = null,
  next_action_id = null,
  next_action_date = null,
  notes = '',
  ptp_id = null
}) => {
  const query = `
    INSERT INTO casefile_interactions
      (casefile_id, created_by, contact_type_id, contact_status_id, call_type_id, next_action_id, next_action_date, notes, ptp_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [casefile_id, created_by, contact_type_id, contact_status_id, call_type_id, next_action_id, next_action_date, notes, ptp_id];
  await pool.query(query, values);
};
