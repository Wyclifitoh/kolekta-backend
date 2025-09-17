const pool = require('../config/db');

exports.findByCase = async (casefile_id) => {
  const [rows] = await pool.query(`
    SELECT pr.*, u.first_name AS created_by_name
    FROM progress_reports pr
    LEFT JOIN staff u ON pr.created_by = u.id
    WHERE pr.casefile_id = ?
    ORDER BY pr.created_at DESC
  `, [casefile_id]);
  return rows;
};
