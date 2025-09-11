const pool = require('../config/db');

exports.findByCase = async (casefile_id) => {
  const [rows] = await pool.query(`
    SELECT * FROM casefile_contacts
    WHERE casefile_id = ?
  `, [casefile_id]);
  return rows;
};
