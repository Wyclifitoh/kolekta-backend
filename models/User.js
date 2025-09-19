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
  const sql = `SELECT * FROM staff WHERE email_address = ?`;
  const [rows] = await pool.query(sql, [email]);
  return rows[0];
};

// Find user by id
exports.findUserById = async (id) => {
  const sql = `SELECT * FROM staff WHERE id = ?`;
  const [rows] = await pool.query(sql, [id]);
  return rows[0];
};

// Find user by reset token
exports.findUserByResetToken = async (token) => {
  const sql = `SELECT * FROM staff WHERE reset_token = ? AND reset_token_expire > ?`;
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

exports.caseFileBulkInsert = async (connection, records) => {
  const values = records.map(r => [
    r.client_id, r.cfid, r.product_id, r.debt_type_id, r.debt_sub_type_id, r.debt_category_id, r.currency_id, r.held_by || null,
    r.full_names, r.identification, r.customer_id, r.account_number, r.contract_no,
    r.phones, r.emails, r.physical_address, r.postal_address, r.branch, r.employer_and_address,
    r.nok_full_names, r.nok_relationship, r.nok_phones, r.nok_address, r.nok_emails,
    r.gua_full_names, r.gua_phones, r.gua_emails, r.gua_address,
    r.amount, r.principal_amount, r.amount_repaid, r.arrears,
    r.loan_taken_date, r.loan_due_date, r.dpd, r.last_paid_amount, r.last_paid_date, r.loan_counter, r.risk_category,
    r.status, r.outsource_date, r.days_since_outsource, r.batch_no,
    r.created_by, r.updated_by
  ]);

  const sql = `
    INSERT INTO case_files (
      client_id, cfid, product_id, debt_type_id, debt_sub_type_id, debt_category_id, currency_id, held_by,
      full_names, identification, customer_id, account_number, contract_no,
      phones, emails, physical_address, postal_address, branch, employer_and_address,
      nok_full_names, nok_relationship, nok_phones, nok_address, nok_emails,
      gua_full_names, gua_phones, gua_emails, gua_address,
      amount, principal_amount, amount_repaid, arrears,
      loan_taken_date, loan_due_date, dpd, last_paid_amount, last_paid_date, loan_counter, risk_category,
      status, outsource_date, days_since_outsource, batch_no,
      created_by, updated_by
    )
    VALUES ?
  `;

  await connection.query(sql, [values]);
};


exports.findAll = async (filters) => {
  const values = [];
  try {
    let sql = `
      SELECT
        cf.cfid,
        cf.full_names,
        cf.identification,
        cf.customer_id,
        cf.account_number,
        cf.contract_no,
        cf.phones,
        cf.emails,
        cf.amount,
        cf.principal_amount,
        cf.amount_repaid,
        cf.arrears,
        cf.dpd,
        cf.loan_taken_date,
        cf.loan_due_date,
        cf.outsource_date,
        cf.batch_no,
        cf.status,
        cf.held_by,
        cf.client_id,
        cf.product_id,
        cf.debt_type_id,
        cf.debt_category_id,
        cf.currency_id,
        c.name AS client_name,
        dt.title AS debt_type_name,
        d.title AS debt_category_name,
        p.title AS product_name,
        u.first_name AS held_by_name
      FROM case_files cf
      LEFT JOIN clients c ON cf.client_id = c.id
      LEFT JOIN client_products p ON cf.product_id = p.id
      LEFT JOIN staff u ON cf.held_by = u.id
      LEFT JOIN debt_categories d ON cf.debt_category_id = d.id
      LEFT JOIN debt_types dt ON cf.debt_type_id = dt.id
      WHERE 1=1
    `;

    if (filters.client_id) {
      sql += ' AND cf.client_id = ?';
      values.push(filters.client_id);
    }
    if (filters.product_id) {
      sql += ' AND cf.product_id = ?';
      values.push(filters.product_id);
    }
    if (filters.debt_category_id) {
      sql += ' AND cf.debt_category_id = ?';
      values.push(filters.debt_category_id);
    }
    if (filters.debt_type_id) {
      sql += ' AND cf.debt_type_id = ?';
      values.push(filters.debt_type_id);
    }
    if (filters.currency_id) {
      sql += ' AND cf.currency_id = ?';
      values.push(filters.currency_id);
    }

    sql += ' ORDER BY cf.outsource_date DESC, cf.cfid DESC';
    
    // Pagination
    if (filters.limit) {
      sql += ' LIMIT ? OFFSET ?';
      values.push(filters.limit, filters.offset || 0);
    }

    const [rows] = await pool.query(sql, values);
    return rows;
  } catch (error) {
    console.error(`Error ${error}`)
    throw new Error(`Error ${error.messsage}`);
    
  }
};

exports.findCaseFileByID = async (id) => {
  const sql = `
    SELECT
      cf.id,
      cf.cfid,
      cf.client_id,
      cf.product_id,
      cf.debt_type_id,
      cf.debt_sub_type_id,
      cf.debt_category_id,
      cf.currency_id,
      cf.held_by,
      cf.full_names,
      cf.identification,
      cf.customer_id,
      cf.account_number,
      cf.contract_no,
      cf.phones,
      cf.emails,
      cf.physical_address,
      cf.postal_address,
      cf.branch,
      cf.employer_and_address,
      cf.nok_full_names,
      cf.nok_relationship,
      cf.nok_phones,
      cf.nok_address,
      cf.nok_emails,
      cf.gua_full_names,
      cf.gua_phones,
      cf.gua_emails,
      cf.gua_address,
      cf.amount,
      cf.principal_amount,
      cf.amount_repaid,
      cf.arrears,
      cf.loan_taken_date,
      cf.loan_due_date,
      cf.dpd,
      cf.loan_counter,
      cf.risk_category,
      cf.status,
      cf.outsource_date,
      cf.days_since_outsource,
      cf.batch_no,
      cf.created_at,
      cf.updated_at,
      cf.created_by,
      cf.updated_by,
      
      -- Joins
      c.name AS client_name,
      dt.title AS debt_type_name,
      d.title AS debt_category_name,
      p.title AS product_name,
      u.first_name AS held_by_name,

      -- Computed Fields
      COALESCE(SUM(CASE WHEN pay.status = 'confirmed' THEN pay.amount_paid ELSE 0 END), 0) AS amount_paid,
      (cf.amount - COALESCE(SUM(CASE WHEN pay.status = 'confirmed' THEN pay.amount_paid ELSE 0 END), 0)) AS balance,

      -- Last Payment Info
      (SELECT amount_paid FROM payments 
        WHERE casefile_id = cf.cfid AND status = 'confirmed'
        ORDER BY date_paid DESC LIMIT 1) AS last_paid_amount,

      (SELECT date_paid FROM payments 
        WHERE casefile_id = cf.cfid AND status = 'confirmed'
        ORDER BY date_paid DESC LIMIT 1) AS last_paid_date

    FROM case_files cf
    LEFT JOIN clients c ON cf.client_id = c.id
    LEFT JOIN client_products p ON cf.product_id = p.id
    LEFT JOIN staff u ON cf.held_by = u.id
    LEFT JOIN debt_categories d ON cf.debt_category_id = d.id
    LEFT JOIN debt_types dt ON cf.debt_type_id = dt.id
    LEFT JOIN payments pay ON cf.cfid = pay.casefile_id
    
    WHERE cf.cfid = ?
    GROUP BY cf.id
    LIMIT 1
  `;

  const [rows] = await pool.query(sql, [id]);
  return rows[0] || null;
};




