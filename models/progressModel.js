const pool = require('../config/db');

exports.findByCase = async (casefile_id) => {
  const [rows] = await pool.query(`
    SELECT pr.*, u.name AS created_by_name
    FROM progress_reports pr
    LEFT JOIN users u ON pr.created_by = u.id
    WHERE pr.casefile_id = ?
    ORDER BY pr.created_at DESC
  `, [casefile_id]);
  return rows;
};
