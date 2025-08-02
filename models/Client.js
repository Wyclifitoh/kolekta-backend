const pool = require('../config/db');

exports.createClient = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO clients 
      (
        name,
        abbreviation,
        client_type_id,
        team_leader_id,
        paybill,
        general_target_percent,
        contact_person_name,
        branch_or_department,
        designation,
        phone,
        email
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.abbreviation,
      data.client_type_id,
      data.team_leader_id,
      data.paybill,
      data.general_target_percent,
      data.contact_person_name,
      data.branch_or_department,
      data.designation,
      data.phone,
      data.email 
    ]
  );
  return result;
};

exports.findAllClients = async () => {
  const [rows] = await pool.query(
    `SELECT 
        c.*, 
        ct.type AS client_type, 
        u.name AS team_leader,
        COUNT(f.id) AS active_files_count
     FROM clients c
     LEFT JOIN client_types ct ON c.client_type_id = ct.id 
     LEFT JOIN users u ON c.team_leader_id = u.id
     LEFT JOIN case_files f ON f.client_id = c.id AND f.status = 'active'
     GROUP BY c.id
     ORDER BY c.id DESC`
  );
  return rows;
};


exports.createClientType = async (data) => {
  const [result] = await pool.query(
      `INSERT INTO client_types ( type, description)
       VALUES (?, ?)`,
      [
          data.type,
          data.description
      ] 
  );
  return result;
};

exports.findAllClientTypes = async () => {
  const [rows] = await pool.query('SELECT * FROM client_types ORDER BY id DESC');
  return rows;
};


exports.createClientProduct = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO client_products (client_id, title, description, general_target, paybill)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.client_id,
      data.title,
      data.description,
      data.general_target,
      data.paybill 
    ]
  );
  return result;
};

// Get all client products
exports.findAllClientProducts = async () => {
  const [rows] = await pool.query(
    `SELECT cp.*, c.name AS client_name 
     FROM client_products cp
     LEFT JOIN clients c ON cp.client_id = c.id
     ORDER BY cp.id DESC`
  );
  return rows;
};

// Get client products by client ID
exports.findClientProductsByClientId = async (client_id) => {
  const [rows] = await pool.query(
    `SELECT * FROM client_products WHERE client_id = ? ORDER BY id DESC`,
    [client_id]
  );
  return rows;
};

// Update a client product
exports.updateClientProduct = async (id, data) => {
  const [result] = await pool.query(
    `UPDATE client_products
     SET title = ?, description = ?, general_target = ?, paybill = ?, status = ?
     WHERE id = ?`,
    [
      data.title,
      data.description,
      data.general_target,
      data.paybill,
      data.status,
      id
    ]
  );
  return result;
};

// Delete a client product
exports.deleteClientProduct = async (id) => {
  const [result] = await pool.query(`DELETE FROM client_products WHERE id = ?`, [id]);
  return result;
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


