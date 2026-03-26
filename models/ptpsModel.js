const pool = require("../config/db");

exports.create = async (data) => {
  const query = `
    INSERT INTO ptps (casefile_id, ptp_date, ptp_amount, ptp_by, ptp_type, ptp_status, affirm_status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    data.casefile_id,
    data.ptp_date,
    data.ptp_amount,
    data.ptp_by,
    data.ptp_type || "Normal",
    data.ptp_status || "Not Honoured",
    data.affirm_status || "Not Affirmed",
  ];

  const [result] = await pool.query(query, values);
  return { id: result.insertId, ...data };
};

exports.updateStatus = async (id, data) => {
  const query = `
    UPDATE ptps SET ptp_status = ?, affirm_status = ?, is_active = ?
    WHERE id = ?
  `;
  const values = [
    data.ptp_status,
    data.affirm_status,
    data.is_active || true,
    id,
  ];

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
  const [rows] = await pool.query(
    `
    SELECT * FROM ptps
    WHERE casefile_id = ?
    ORDER BY ptp_date DESC
  `,
    [casefile_id],
  );
  return rows;
};

exports.findPtps = async () => {
  const [rows] = await pool.query(`
    SELECT
      cf.cfid,
      cf.full_names,
      cf.account_number,
      cf.amount,
      pt.ptp_date,
      pt.ptp_amount,
      c.name AS client_name,
      -- Calculate balance in a subquery to prevent row duplication
      (cf.amount - (
        SELECT COALESCE(SUM(pay.amount_paid), 0)
        FROM payments pay
        WHERE pay.casefile_id = cf.cfid AND pay.status = 'confirmed'
      )) AS balance,
      p.title AS product_name,
      u.first_name AS held_by,
      s.first_name AS ptp_by,
      pt.ptp_type,
      pt.affirm_status,
      pt.ptp_status
    FROM ptps pt 
    LEFT JOIN case_files cf ON pt.casefile_id = cf.cfid
    LEFT JOIN clients c ON cf.client_id = c.id
    LEFT JOIN client_products p ON cf.product_id = p.id
    LEFT JOIN staff u ON cf.held_by = u.id
    LEFT JOIN staff s ON pt.ptp_by = s.id  -- Fixed: Join on s.id, not u.id
    ORDER BY pt.id DESC
    `);
  return rows;
};
