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

exports.findPtps = async (filters = {}) => {
  let query = `
    SELECT
      cf.cfid, cf.full_names, cf.account_number, cf.amount,
      pt.ptp_date, pt.ptp_amount, c.name AS client_name,
      (cf.amount - (
        SELECT COALESCE(SUM(pay.amount_paid), 0)
        FROM payments pay
        WHERE pay.casefile_id = cf.cfid AND pay.status = 'confirmed'
      )) AS balance,
      p.title AS product_name, u.first_name AS held_by,
      s.first_name AS ptp_by, pt.ptp_type, pt.affirm_status, pt.ptp_status
    FROM ptps pt 
    LEFT JOIN case_files cf ON pt.casefile_id = cf.cfid
    LEFT JOIN clients c ON cf.client_id = c.id
    LEFT JOIN client_products p ON cf.product_id = p.id
    LEFT JOIN staff u ON cf.held_by = u.id
    LEFT JOIN staff s ON pt.ptp_by = s.id
    WHERE 1=1`;

  const queryParams = [];

  // Search Term (Debtor name or account)
  if (filters.searchTerm) {
    query += ` AND (cf.full_names LIKE ? OR cf.account_number LIKE ?)`;
    queryParams.push(`%${filters.searchTerm}%`, `%${filters.searchTerm}%`);
  }

  // PTP Date Range
  if (filters.ptpDateRange === "today") {
    query += ` AND DATE(pt.ptp_date) = CURDATE()`;
  } else if (filters.ptpDateRange === "last7days") {
    query += ` AND pt.ptp_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;
  } else if (
    filters.ptpDateRange === "custom" &&
    filters.ptpCustomStart &&
    filters.ptpCustomEnd
  ) {
    query += ` AND pt.ptp_date BETWEEN ? AND ?`;
    queryParams.push(filters.ptpCustomStart, filters.ptpCustomEnd);
  }

  if (filters.clients?.length) {
    query += ` AND cf.client_id IN (?)`;
    queryParams.push(filters.clients);
  }
  if (filters.users?.length) {
    query += ` AND pt.ptp_by IN (?)`;
    queryParams.push(filters.users);
  }
  if (filters.ptpStatuses?.length) {
    query += ` AND pt.ptp_status IN (?)`;
    queryParams.push(filters.ptpStatuses);
  }
  if (filters.ptpTypes?.length) {
    query += ` AND pt.ptp_type IN (?)`;
    queryParams.push(filters.ptpTypes);
  }
  if (filters.fileStatuses?.length) {
    query += ` AND cf.status IN (?)`;
    queryParams.push(filters.fileStatuses);
  }

  query += ` ORDER BY pt.id DESC`;

  const [rows] = await pool.query(query, queryParams);
  return rows;
};
