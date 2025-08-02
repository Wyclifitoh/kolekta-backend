const pool = require('../config/db');

exports.findByEmail = async (email_address) => {
  const [rows] = await pool.query('SELECT * FROM staff WHERE email_address = ?', [email_address]);
  return rows[0];
};

exports.findLatestStaffId = async () => {
  const [rows] = await pool.query('SELECT staff_id FROM staff ORDER BY staff_id DESC LIMIT 1');
  return rows[0];
};

exports.findLatestFileId = async () => {
  const [rows] = await pool.query('SELECT cfid FROM case_files ORDER BY cfid DESC LIMIT 1');
  return rows[0];
};

exports.createStaff = async (staffData) => {
  const [result] = await pool.query(
      `INSERT INTO staff (staff_id, first_name, last_name, email_address, phone_number, dialing_id, role, permission, password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
          staffData.staff_id,
          staffData.first_name,
          staffData.last_name,
          staffData.email_address,
          staffData.phone_number,
          staffData.dialing_id,
          staffData.role,
          staffData.permission,
          staffData.password
      ]
  );
  return result;
};

exports.findAllStaff = async () => {
  const [rows] = await pool.query('SELECT * FROM staff ORDER BY staff_id ASC');
  return rows;
};


// Find user by email
exports.findUserByEmail = async (email) => {
  const sql = `SELECT * FROM users WHERE email = ?`;
  const [rows] = await pool.query(sql, [email]);
  return rows[0];
};

// Find user by id
exports.findUserById = async (id) => {
  const sql = `SELECT * FROM users WHERE id = ?`;
  const [rows] = await pool.query(sql, [id]);
  return rows[0];
};

// Find user by reset token
exports.findUserByResetToken = async (token) => {
  const sql = `SELECT * FROM users WHERE reset_token = ? AND reset_token_expire > ?`;
  const [rows] = await pool.query(sql, [token, Date.now()]);
  return rows[0];
};

// Update reset token and expiration
exports.updateResetToken = async (email, token, expire) => {
  const sql = `UPDATE users SET reset_token = ?, reset_token_expire = ? WHERE email = ?`;
  await pool.query(sql, [token, expire, email]);
};

// Update password
exports.updatePassword = async (email, password) => {
  const sql = `UPDATE users SET password = ?, reset_token = NULL, reset_token_expire = NULL WHERE email = ?`;
  await pool.query(sql, [password, email]);
};

exports.saveRefreshToken = async (user_id, refresh_token) => {
  try {
    // Check if the token already exists for the user
    const checkSql = 'SELECT * FROM refresh_token WHERE user_id = ?';
    const [rows] = await pool.query(checkSql, [user_id]);

    if (rows.length > 0) {
      // Token exists, so update it
      const updateSql = 'UPDATE refresh_token SET refresh_token = ? WHERE user_id = ?';
      const [result] = await pool.query(updateSql, [refresh_token, user_id]);
      return { result, action: 'updated' };
    } else {
      // Token does not exist, so insert a new record
      const insertSql = 'INSERT INTO refresh_token (user_id, refresh_token) VALUES (?, ?)';
      const [result] = await pool.query(insertSql, [user_id, refresh_token]);
      return { result, action: 'inserted' };
    }
  } catch (error) {
    console.error('Error saving refresh token:', error);
    throw error;
  }
}

exports.deleteToken = async (user_id, refresh_token) => {
    const sql = 'DELETE FROM refresh_token WHERE user_id = ? AND refresh_token = ?'
    const result = await pool.query(sql, [user_id, refresh_token] );
    return result; 
};

// Find user by id
exports.findRefreshTokenById = async (id) => {
  const sql = `SELECT * FROM refresh_token WHERE user_id = ?`;
  const [rows] = await pool.query(sql, [id]);
  return rows[0];
};

exports.updateUserPassword = async (user_id, hashedNewPassword) => { 

  const sql = `
      UPDATE users
      SET 
          password = ? 
      WHERE id = ?
  `;

  try {
      const [result] = await pool.query(sql, [hashedNewPassword, user_id]);

      return [result];
  } catch (error) {
      console.error('Error updating user password:', error);
      throw error; // Optionally, rethrow the error to be handled by the calling function
  }
};

exports.updateUser = async (user_id, updateData) => {
  const { first_name, last_name, phone_number } = updateData;

  const sql = `
      UPDATE users
      SET 
          first_name = ?,
          last_name = ?, 
          phone_number = ? 
      WHERE id = ?
  `;

  try {
      const [result] = await pool.query(sql, [first_name, last_name, phone_number, user_id]);

      return [result];
  } catch (error) {
      console.error('Error updating user info:', error);
      throw error; // Optionally, rethrow the error to be handled by the calling function
  }
};

exports.caseFileBulkInsert = async (records) => {
  const values = records.map(r => [
    r.client_id, r.cfid, r.product_id, r.debt_category, r.debt_type, r.currency_id, r.batch_no,
    r.full_names, r.amount, r.principal_amount, r.amount_repaid, r.arrears,
    r.account_number, r.contract_no, r.customer_id, r.identification, r.phones, r.emails, r.loan_taken_date, r.loan_due_date, r.dpd,
    r.last_paid_amount, r.last_paid_date, r.loan_counter, r.risk_category, r.branch,
    r.physical_address, r.postal_address, r.employer_and_address, r.nok_full_names,
    r.nok_relationship, r.nok_phones, r.nok_address, r.nok_emails, r.gua_full_names,
    r.gua_phones, r.gua_emails, r.gua_address, r.outsource_date
  ]);

  const sql = `
    INSERT INTO case_files (
      client_id, cfid, product_id, debt_category, debt_type, currency_id, batch_no,
      full_names, amount, principal_amount, amount_repaid, arrears,
      account_number, contract_no, customer_id, identification, phones, emails, loan_taken_date, loan_due_date, dpd,
      last_paid_amount, last_paid_date, loan_counter, risk_category, branch,
      physical_address, postal_address, employer_and_address, nok_full_names,
      nok_relationship, nok_phones, nok_address, nok_emails, gua_full_names,
      gua_phones, gua_emails, gua_address, outsource_date
    )
    VALUES ?
  `;

  await pool.query(sql, [values]);
};

exports.findAll = async (filters) => {
  let sql = `
    SELECT 
      cf.*, 
      c.name AS client_name,
      d.title AS debt_category_name,
      dt.title AS debt_type_name,
      p.title AS product_name,
      cu.code AS currency_code,
      cu.name AS currency_name,
      u.first_name AS held_by_name
    FROM case_files cf
    LEFT JOIN clients c ON cf.client_id = c.id
    LEFT JOIN client_products p ON cf.product_id = p.id
    LEFT JOIN currencies cu ON cf.currency_id = cu.id
    LEFT JOIN staff u ON cf.held_by = u.id
    LEFT JOIN debt_categories d ON cf.debt_category = d.id
    LEFT JOIN debt_types dt ON cf.debt_type = dt.id 
    WHERE 1=1
  `;

  const values = [];

  if (filters.client_id) {
    sql += ' AND cf.client_id = ?';
    values.push(filters.client_id);
  }
  if (filters.product_id) {
    sql += ' AND cf.product_id = ?';
    values.push(filters.product_id);
  }
  if (filters.debt_category) {
    sql += ' AND cf.debt_category = ?';
    values.push(filters.debt_category);
  }
  if (filters.debt_type) {
    sql += ' AND cf.debt_type = ?';
    values.push(filters.debt_type);
  }
  if (filters.currency_id) {
    sql += ' AND cf.currency_id = ?';
    values.push(filters.currency_id);
  }

  sql += ' ORDER BY cf.created_at DESC';

  const [rows] = await pool.query(sql, values);
  return rows;
};


exports.findCaseFileByID = async (id) => {
  const sql = `
    SELECT 
      cf.*, 
      c.name AS client_name,
      d.title AS debt_category_name,
      dt.title AS debt_type_name,
      p.title AS product_name,
      cu.code AS currency_code,
      cu.name AS currency_name,
      u.first_name AS held_by_name
    FROM case_files cf
    LEFT JOIN clients c ON cf.client_id = c.id
    LEFT JOIN client_products p ON cf.product_id = p.id
    LEFT JOIN currencies cu ON cf.currency_id = cu.id
    LEFT JOIN staff u ON cf.held_by = u.id
    LEFT JOIN debt_categories d ON cf.debt_category = d.id
    LEFT JOIN debt_types dt ON cf.debt_type = dt.id 
    WHERE cf.cfid = ?
    LIMIT 1
  `;

  const [rows] = await pool.query(sql, [id]);
  return rows[0] || null;
};



