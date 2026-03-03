const pool = require("../config/db");

exports.create = async (data) => {
  const query = `
    INSERT INTO case_files (
      client_id, product_id, debt_category_id, debt_type_id, debt_sub_type_id,
      cfid, batch_no, full_names, identification, customer_id, account_number,
      contract_no, phones, emails, physical_address, postal_address, branch,
      employer_and_address, nok_full_names, nok_relationship, nok_phones,
      nok_address, nok_emails, gua_full_names, gua_phones, gua_emails,
      gua_address, amount, principal_amount, amount_repaid, arrears,
      loan_taken_date, loan_due_date, dpd, last_paid_amount, last_paid_date,
      loan_counter, risk_category, outsource_date, status, created_by, updated_by
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `;
  const values = [
    data.client_id,
    data.product_id,
    data.debt_category_id,
    data.debt_type_id,
    data.debt_sub_type_id,
    data.cfid,
    data.batch_no,
    data.full_names,
    data.identification,
    data.customer_id,
    data.account_number,
    data.contract_no,
    data.phones,
    data.emails,
    data.physical_address,
    data.postal_address,
    data.branch,
    data.employer_and_address,
    data.nok_full_names,
    data.nok_relationship,
    data.nok_phones,
    data.nok_address,
    data.nok_emails,
    data.gua_full_names,
    data.gua_phones,
    data.gua_emails,
    data.gua_address,
    data.amount,
    data.principal_amount,
    data.amount_repaid,
    data.arrears,
    data.loan_taken_date,
    data.loan_due_date,
    data.dpd,
    data.last_paid_amount,
    data.last_paid_date,
    data.loan_counter,
    data.risk_category,
    data.outsource_date,
    data.status,
    data.created_by,
    data.updated_by,
  ];

  const [result] = await pool.query(query, values);
  return { id: result.insertId, ...data };
};

exports.findById = async (id) => {
  const [rows] = await pool.query(`SELECT * FROM case_files WHERE id = ?`, [
    id,
  ]);
  return rows[0];
};

exports.findAll = async (filters) => {
  let query = `SELECT * FROM case_files WHERE 1=1`;
  const values = [];

  if (filters.status) {
    query += ` AND status = ?`;
    values.push(filters.status);
  }

  if (filters.client_id) {
    query += ` AND client_id = ?`;
    values.push(filters.client_id);
  }

  query += ` ORDER BY created_at DESC`;

  const [rows] = await pool.query(query, values);
  return rows;
};

exports.closeCases = async (casefileIds) => {
  if (!Array.isArray(casefileIds) || casefileIds.length === 0) {
    throw new Error("Invalid casefile IDs");
  }

  const placeholders = casefileIds.map(() => "?").join(",");
  const query = `
    UPDATE case_files 
    SET status = 'closed', updated_at = NOW() 
    WHERE cfid IN (${placeholders}) AND status != 'closed'
  `;

  const values = [...casefileIds];
  const [result] = await pool.query(query, values);

  return { affectedRows: result.affectedRows };
};
