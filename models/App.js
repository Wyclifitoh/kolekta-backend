const pool = require('../config/db');

// -------------------- Debt Category --------------------
exports.addDebtCategory = async (title, description) => {
  try {
    const result = await pool.query(
      'INSERT INTO debt_categories (title, description) VALUES ($1) RETURNING *',
      [title, description]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error adding debt category:', error);
    throw error;
  }
};

exports.getAllDebtCategory = async () => {
  try {
    const result = await pool.query('SELECT * FROM debt_categories ORDER BY id ASC');
    return result.rows;
  } catch (error) {
    console.error('Error fetching debt categories:', error);
    throw error;
  }
};

// -------------------- Debt Type --------------------
exports.addDebtType = async (title, description) => {
  try {
    const result = await pool.query(
      'INSERT INTO debt_types (title, description) VALUES ($1) RETURNING *',
      [title, description]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error adding debt type:', error);
    throw error;
  }
};

exports.getAllDebtTypes = async () => {
  try {
    const result = await pool.query('SELECT * FROM debt_types ORDER BY id ASC');
    return result.rows;
  } catch (error) {
    console.error('Error fetching debt types:', error);
    throw error;
  }
};

// Add Debt Sub Type
exports.addDebtSubType = async (title, description, debt_type_id, status = 'ACTIVE') => {
  const [result] = await pool.query(
    'INSERT INTO debt_sub_types (title, description, debt_type_id, status) VALUES (?, ?, ?, ?)',
    [title, description, debt_type_id, status]
  );
  return result;
};

// Get all Debt Sub Types
exports.getAllDebtSubTypes = async () => {
  const [rows] = await pool.query(`
    SELECT ds.*, dt.title as debt_type_title
    FROM debt_sub_types ds
    JOIN debt_types dt ON ds.debt_type_id = dt.id
    ORDER BY ds.created_at DESC
  `);
  return rows;
};


// -------------------- Currency --------------------
exports.addCurrency = async (code, name, symbol) => {
  try {
    const result = await pool.query(
      'INSERT INTO currencies (code, name, symbol) VALUES ($1, $2) RETURNING *',
      [code, name, symbol]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error adding currency:', error);
    throw error;
  }
};

exports.getAllCurrencies = async () => {
  try {
    const result = await pool.query('SELECT * FROM currencies ORDER BY id ASC');
    return result.rows;
  } catch (error) {
    console.error('Error fetching currencies:', error);
    throw error;
  }
};




























exports.createFarm = async (uid, farm_name, farm_contact, farm_email, farm_image, location, farm_description, currency, created_by) => {
    const sql = 'INSERT INTO farms (uid, farm_name, farm_contact, farm_email, farm_image, location, farm_description, currency, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const [result] = await pool.query(sql, [uid, farm_name, farm_contact, farm_email, farm_image, location, farm_description, currency, created_by]);

    return result;
}

exports.getAllUsers = async (status) => {
    let sql = `SELECT * FROM users`;
    let values = [];

    if (status !== "all") {
        sql += ` WHERE status = ?`;
        values.push(status);
    } else {
        sql += ` WHERE status != 'removed'`; 
    }

    try {
        const [rows] = await pool.query(sql, values);
        return rows; 
    } catch (error) {
        console.error("Error fetching users:", error);
        throw error;
    }
};


exports.getUserByID = async (user_id) => {
    const sql = `
        SELECT *
        FROM users
        WHERE id = ?
    `;

    try {
        const [rows] = await pool.query(sql, [user_id]);
        if (rows.length === 0) {
            return null;
        }
        return rows[0];
    } catch (error) {
        console.error('Error fetching user by ID:', error);
        throw error;
    }
}

exports.updateUser = async (user_id, updateData) => {
    const { name, email, role, contact_info } = updateData;

    const sql = `
        UPDATE users
        SET
            name = ?,
            email = ?,
            role = ?, 
            contact_info = ?
        WHERE id = ?
    `;

    const [result] = await pool.query(sql, [
        name,
        email,
        role, 
        contact_info,
        user_id
    ]);

    return result.affectedRows; 
};

exports.updateUserStatus = async (user_id, status) => {
    try {
        const sql = `UPDATE users SET status = ? WHERE id = ?`;
        const [result] = await pool.query(sql, [status, user_id]);
        return [result];
    } catch (error) {
        throw new Error('Database query failed');
    }
};

exports.deleteUser = async (user_id) => {
    const sql = `
        UPDATE users
        SET  status = 'removed' 
        WHERE id = ?
    `;
    try {
        const [result] = await pool.query(sql, [user_id]);

        return [result];
    } catch (error) {
        console.error('Error updating deleting user:', error);
        throw error;
    }
};

exports.addCow = async (cowData) => {
    const {
        name,
        breed,
        gender,
        dob,
        weight,
        tag_number,
        tag_id,
        lactation_stage,
        pregnancy_status,
        last_calving_date,
        dam_id,
        sire_id,
        acquisition_date
    } = cowData; 

    const sql = `
        INSERT INTO cows (
            name, breed, gender, dob, weight, tag_number, tag_id, 
            lactation_stage, pregnancy_status, last_calving_date, 
            dam_id, sire_id, acquisition_date
        ) 
        VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
    `;  

    const [result] = await pool.query(sql, [
        name,
        breed,
        gender,
        dob,
        weight,
        tag_number,
        tag_id,
        lactation_stage,
        pregnancy_status,
        last_calving_date,
        dam_id,
        sire_id,
        acquisition_date
    ]);  

    return result;  
};

exports.getAllCows = async (statusFilter = 'active') => {
    let statusCondition = '';

    if (statusFilter === 'active') {
        statusCondition = "AND c.status = 'active'";
    } else if (statusFilter === 'inactive') {
        statusCondition = "AND c.status = 'inactive'";
    } else if (statusFilter === 'archived') {
        statusCondition = "AND c.status = 'archived'";
    } else if (statusFilter === 'removed') {
        statusCondition = "AND c.status = 'removed'";
    } else if (statusFilter === 'all') {
        statusCondition = "";
    }

    const sql = `
        SELECT  
            c.id AS cow_id,
            c.name,
            c.breed,
            c.gender,
            c.dob,
            c.weight,
            c.tag_number,
            c.tag_id,
            c.lactation_stage,
            c.pregnancy_status,
            c.last_calving_date,
            c.acquisition_date,
            c.dam_id,
            c.sire_id,
            c.created_at AS cow_created_at,
            dam.name AS dam_name,
            sire.name AS sire_name,
            COUNT(DISTINCT c.dam_id) AS total_dams,
            COUNT(DISTINCT c.sire_id) AS total_sires
        FROM 
            cows c
        LEFT JOIN cows dam ON c.dam_id = dam.id
        LEFT JOIN cows sire ON c.sire_id = sire.id
        WHERE
            c.status IS NOT NULL ${statusCondition}
        GROUP BY
            c.id;
    `;

    const [rows] = await pool.query(sql);

    return rows;
};

exports.getCowById = async (cowId) => {
    const sql = `
        SELECT 
            c.id AS cow_id,
            c.name,
            c.breed,
            c.gender,
            c.dob,
            c.weight,
            c.tag_number,
            c.tag_id,
            c.lactation_stage,
            c.pregnancy_status,
            c.last_calving_date,
            c.acquisition_date,
            c.dam_id,
            c.sire_id,
            c.created_at AS cow_created_at,
            dam.name AS dam_name,
            sire.name AS sire_name,
            (SELECT COUNT(*) FROM cows WHERE dam_id = c.id) AS total_dams,
            (SELECT COUNT(*) FROM cows WHERE sire_id = c.id) AS total_sires
        FROM cows c
        LEFT JOIN cows dam ON c.dam_id = dam.id
        LEFT JOIN cows sire ON c.sire_id = sire.id
        WHERE c.id = ?;
    `;
    
    const [row] = await pool.query(sql, [cowId]);

    if (!row) {
        throw new Error('Cow not found');
    }

    return row;
};

exports.updateCow = async (cow_id, updateData) => {
    const { name, breed, gender, dob, weight, lactation_stage, pregnancy_status, last_calving_date, dam_id, sire_id, acquisition_date } = updateData;

    const sql = `
        UPDATE cows
        SET
            name = ?,
            breed = ?,
            gender = ?,
            dob = ?,
            weight = ?,
            lactation_stage = ?,
            pregnancy_status = ?,
            last_calving_date = ?,
            dam_id = ?,
            sire_id = ?,
            acquisition_date = ?
        WHERE id = ?
    `;

    const [result] = await pool.query(sql, [
        name,
        breed,
        gender,
        dob,
        weight,
        lactation_stage,
        pregnancy_status,
        last_calving_date,
        dam_id,
        sire_id,
        acquisition_date,
        cow_id
    ]);

    return result.affectedRows; // Return the number of affected rows
};

exports.updateCowStatus = async (cow_id, status) => {
    try {
        const sql = `UPDATE cows SET status = ? WHERE id = ?`;
        const [result] = await pool.query(sql, [status, cow_id]);
        return [result];
    } catch (error) {
        throw new Error('Database query failed');
    }
};

exports.addCowReduction = async (data) => {
    const { cow_id, reduction_reason, price, reduction_date, customer_name, description, recorded_by } = data;

    try {
        const [result] = await pool.query(
            `INSERT INTO cow_reductions 
        (cow_id, reduction_reason, price, reduction_date, customer_name, description, recorded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [cow_id, reduction_reason, price, reduction_date, customer_name, description, recorded_by]
        );

        return [result];
    } catch (error) {
        throw new Error('Database query failed');
    }
};

exports.addIncome = async (incomeData) => {
    const { name, income_category, quantity, amount, income_date, description, recorded_by } = incomeData;

    try {
        const result = await pool.query(
            `INSERT INTO income 
        (name, income_category, quantity, amount, income_date, description, recorded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, income_category, quantity, amount, income_date, description, recorded_by]
        );

        return result;
    } catch (error) { 
        throw new Error('Database query failed', error);
    }
};

exports.getAllCowReduction = async () => {
    const sql = `
        SELECT cr.*, cr.reduction_date AS reduction_date, c.name, c.acquisition_date,
        c.status
        FROM cow_reductions cr
        INNER JOIN cows c ON cr.cow_id = c.id 
    `;
    const [rows] = await pool.query(sql);
    return rows;
};

exports.milkProduction = async (productionData) => {
    try {
        const {  cow_id, production_date, morning_milk, evening_milk, note, recorded_by } = productionData;
        const sql = 'INSERT INTO milk_production ( cow_id, production_date, morning_milk, evening_milk, note, recorded_by ) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await pool.query(sql, [cow_id, production_date, morning_milk, evening_milk, note, recorded_by]);
        return [result];
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
}

exports.getMilkProduction = async (cow_id, production_date) => {
    try {
        const sql = `
            SELECT 
                mp.id, 
                mp.production_date, 
                mp.morning_milk, 
                mp.evening_milk, 
                mp.total_milk, 
                c.name AS cow_name, 
                u.name AS recorded_by
            FROM milk_production mp
            LEFT JOIN cows c ON mp.cow_id = c.id
            LEFT JOIN users u ON mp.recorded_by = u.id
            ORDER BY mp.id DESC;
        `;
        
        const [result] = await pool.query(sql);
        return result;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};


exports.checkMilkProductionExist = async (cow_id, production_date) => {
    try {
        const sql = 'SELECT * FROM milk_production WHERE cow_id = ? AND production_date = ?';
        const [rows] = await pool.query(sql, [cow_id, production_date]);
        return rows.length > 0 ? true : false;  
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.updateMilkProduction = async (id, updatedData) => {
    try {
        const { cow_id, production_date, morning_milk, evening_milk, note, recorded_by } = updatedData;
        const sql = `UPDATE milk_production 
                     SET morning_milk = ?, evening_milk = ?, note = ?, recorded_by = ? 
                     WHERE id = ? AND production_date = ?`;

        const [result] = await pool.query(sql, [morning_milk, evening_milk, note, recorded_by, id, production_date]);
        return [result];
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.getMilkProductionByCowAndDate = async (cow_id, production_date) => {
    try {
        const sql = 'SELECT * FROM milk_production WHERE cow_id = ? AND production_date = ?';
        const [result] = await pool.query(sql, [cow_id, production_date]);
        return result.length > 0 ? result[0] : null;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.getMilkProductionReport = async (cow_id, start_date, end_date) => {
    try {
        const sql = `
            SELECT * FROM milk_production 
            WHERE cow_id = ? AND production_date BETWEEN ? AND ? 
            ORDER BY production_date ASC
        `;
        const [result] = await pool.query(sql, [cow_id, start_date, end_date]);
        return result;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.getAllMilkProductionByDate = async (production_date) => {
    try {
        const sql = 'SELECT * FROM milk_production WHERE production_date = ?';
        const [result] = await pool.query(sql, [production_date]);
        return result;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.getAllMilkProductionReport = async (start_date, end_date) => {
    try {
        const sql = `
            SELECT * FROM milk_production 
            WHERE production_date BETWEEN ? AND ?
            ORDER BY production_date ASC
        `;
        const [result] = await pool.query(sql, [start_date, end_date]);
        return result;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.recordExpense = async (expenseData) => {
    try {
        const sql = 'INSERT INTO expenses (name, expense_category, unit, quantity_used, unit_price, expense_date, note, recorded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        const [result] = await pool.query(sql, [expenseData.name, expenseData.expense_category, expenseData.unit, expenseData.quantity_used, expenseData.unit_price, expenseData.expense_date, expenseData.note, expenseData.recorded_by]);
        return [result];
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.getExpenseById = async (expense_id) => {
    try {
        const sql = `
            SELECT 
                e.id,
                e.name AS expense_name,
                e.expense_category AS expense_category_id,
                ec.name AS expense_category,
                e.unit,
                e.quantity_used,
                e.unit_price,
                e.total_cost,
                e.expense_date,
                e.note,
                u.name AS recorded_by
            FROM expenses e
            LEFT JOIN expense_category ec ON e.expense_category = ec.id 
            LEFT JOIN users u ON e.recorded_by = u.id
            WHERE e.id = ?
            ORDER BY e.expense_date DESC;
        `;

        const [result] = await pool.query(sql, [expense_id]);
        return result[0];
    } catch (error) {
        throw new Error(`Database query failed: ${error.message}`);
    }
};

exports.getAllExpenses = async () => {
    try {
        const sql = `
            SELECT 
                e.id, 
                e.name, 
                ec.name AS category_name, 
                e.unit, 
                e.quantity_used,
                e.unit_price, 
                e.total_cost,
                e.expense_date, 
                e.note,   
                u.name AS recorded_by
            FROM expenses e
            LEFT JOIN expense_category ec ON e.expense_category = ec.id 
            LEFT JOIN users u ON e.recorded_by = u.id
            ORDER BY e.id DESC;
        `;
        
        const [result] = await pool.query(sql);
        return result;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.updateExpense = async (id, updatedExpenseData) => {
    try {
        const sql = 'UPDATE expenses SET name = ?, expense_category = ?, unit = ?, quantity_used = ?, unit_price = ?, expense_date = ?, note = ? WHERE id = ?';
        const [result] = await pool.query(sql, [updatedExpenseData.name, updatedExpenseData.expense_category, updatedExpenseData.unit, updatedExpenseData.quantity_used, updatedExpenseData.unit_price, updatedExpenseData.expense_date, updatedExpenseData.note, id]);
        return result.affectedRows > 0 ? true : false; 
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.deleteExpense = async (id) => {
    try {
        const sql = 'DELETE FROM expenses WHERE id = ?';
        const [result] = await pool.query(sql, [id]);
        return result.affectedRows > 0 ? true : false;  
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.createExpenseCategory = async (categoryData) => {
    try {
        const sql = 'INSERT INTO expense_category (name, description) VALUES (?, ?)';
        const [result] = await pool.query(sql, [categoryData.name, categoryData.description]);
        return result;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.getExpenseCategories = async () => {
    try {
        const sql = 'SELECT * FROM expense_category ORDER BY id DESC';
        const [result] = await pool.query(sql);
        return result;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.getExpenseCategoryById = async (id) => {
    try {
        const sql = 'SELECT * FROM expense_category WHERE id = ?';
        const [result] = await pool.query(sql, [id]);
        return result[0];
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.updateExpenseCategory = async (id, updatedCategoryData) => {
    try {
        const sql = 'UPDATE expense_category SET name = ?, description = ? WHERE id = ?';
        const [result] = await pool.query(sql, [updatedCategoryData.name, updatedCategoryData.description, id]);
        return result.affectedRows > 0 ? true : false;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.deleteExpenseCategory = async (id) => {
    try {
        const sql = 'DELETE FROM expense_category WHERE id = ?';
        const [result] = await pool.query(sql, [id]);
        return result.affectedRows > 0 ? true : false;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.createIncome = async (incomeData) => {
    try {
        const { name, income_category, quantity, unit, price_per_unit, income_date, description, recorded_by } = incomeData;
        const sql = `
            INSERT INTO income (name, income_category, quantity, unit, price_per_unit, income_date, description, recorded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.query(sql, [name, income_category, quantity, unit, price_per_unit, income_date, description, recorded_by]);
        return result.insertId;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.getAllIncome = async () => {
    try {
        const sql = `
            SELECT 
                i.id, 
                i.name, 
                ic.name AS category_name, 
                i.quantity,
                i.unit,  
                i.price_per_unit, 
                i.total_income,
                i.income_date, 
                i.description,   
                u.name AS recorded_by
            FROM income i
            LEFT JOIN income_category ic ON i.income_category = ic.id 
            LEFT JOIN users u ON i.recorded_by = u.id
            ORDER BY i.id DESC;
        `;
        
        const [result] = await pool.query(sql);
        return result;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.getIncomeById = async (income_id) => {
    try {
        const sql = `
            SELECT 
                i.id, 
                i.name, 
                i.income_category,
                ic.name AS category_name, 
                i.quantity,
                i.unit,  
                i.price_per_unit, 
                i.total_income,
                i.income_date, 
                i.description,   
                u.name AS recorded_by
            FROM income i
            LEFT JOIN income_category ic ON i.income_category = ic.id 
            LEFT JOIN users u ON i.recorded_by = u.id
            WHERE i.id = ?
            ORDER BY i.id DESC;
        `;
        const [result] = await pool.query(sql, [income_id]);
        return result[0];
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.updateIncome = async (id, updatedIncomeData) => {
    try {
        const sql = `
            UPDATE income
            SET name = ?, income_category = ?, quantity = ?, unit = ?, price_per_unit = ?, income_date = ?, description = ? WHERE id = ?
        `;
        const [result] = await pool.query(sql, [
            updatedIncomeData.name, updatedIncomeData.income_category, updatedIncomeData.quantity, updatedIncomeData.unit,
            updatedIncomeData.price_per_unit, updatedIncomeData.income_date, updatedIncomeData.description, id
        ]);
        return result.affectedRows > 0 ? true : false;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.deleteIncome = async (id) => {
    try {
        const sql = 'DELETE FROM income WHERE id = ?';
        const [result] = await pool.query(sql, [id]);
        return result.affectedRows > 0 ? true : false;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.createIncomeCategory = async (categoryData) => {
    try {
        const { name, description } = categoryData;
        const sql = `
            INSERT INTO income_category (name, description)
            VALUES (?, ?)
        `;
        const [result] = await pool.query(sql, [name, description]);
        return result.insertId;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.getIncomeCategoryById = async (id) => {
    try {
        const sql = 'SELECT * FROM income_category WHERE id = ?';
        const [result] = await pool.query(sql, [id]);
        return result[0];
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};
exports.getAllIncomeCategories = async () => {
    try {
        const sql = 'SELECT * FROM income_category ORDER BY id DESC';
        const [result] = await pool.query(sql);
        return result;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.updateIncomeCategory = async (id, updatedCategoryData) => {
    try {
        const sql = 'UPDATE income_category SET name = ?, description = ? WHERE id = ?';
        const [result] = await pool.query(sql, [updatedCategoryData.name, updatedCategoryData.description, id]);
        return result.affectedRows > 0 ? true : false;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.deleteIncomeCategory = async (id) => {
    try {
        const sql = 'DELETE FROM income_category WHERE id = ?';
        const [result] = await pool.query(sql, [id]);
        return result.affectedRows > 0 ? true : false;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.createSupplier = async (supplierData) => {
    try {
        const { name, contact_person, phone_number, email, address } = supplierData;
        const sql = 'INSERT INTO suppliers (name, contact_person, phone_number, email, address) VALUES (?, ?, ?, ?, ?)';
        const [result] = await pool.query(sql, [name, contact_person, phone_number, email, address]);
        return result;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.getAllSuppliers = async (status) => {
    let sql = `SELECT * FROM suppliers`;
    let values = [];

    if (status !== "all") {
        sql += ` WHERE status = ?`;
        values.push(status);
    } else {
        sql += ` WHERE status != 'removed'`; 
    }


    try {
        const [rows] = await pool.query(sql, values);
        return rows; 
    } catch (error) {
        console.error("Error fetching suppliers:", error);
        throw error;
    }
};

exports.getSupplierById = async (id) => {
    try {
        const sql = 'SELECT * FROM suppliers WHERE id = ?';
        const [result] = await pool.query(sql, [id]);
        return result[0];
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.updateSupplierStatus = async (supplier_id, status) => {
    try {
        const sql = `UPDATE suppliers SET status = ? WHERE id = ?`;
        const [result] = await pool.query(sql, [status, supplier_id]);
        return [result];
    } catch (error) {
        throw new Error('Database query failed');
    }
};

exports.updateSupplier = async (id, supplierData) => {
    try {
        const { name, contact_person, phone_number, email, address } = supplierData;
        const sql = 'UPDATE suppliers SET name = ?, contact_person = ?, phone_number = ?, email = ?, address = ? WHERE id = ?';
        await pool.query(sql, [name, contact_person, phone_number, email, address, id]);
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};


exports.deleteSupplier = async (supplier_id) => {
    const sql = `
        UPDATE suppliers
        SET  status = 'removed' 
        WHERE id = ?
    `;
    try {
        const [result] = await pool.query(sql, [supplier_id]);

        return [result];
    } catch (error) {
        console.error('Error updating deleting user:', error);
        throw error;
    }
};

exports.createSupply = async (supplyData) => {
    try {
        const { name, supply_category, unit, unit_price, quantity, purchase_date, recorded_by, supplier_id } = supplyData;

        const sqlInsertSupply = `
            INSERT INTO supplies (name, supply_category, unit, unit_price, quantity, purchase_date, recorded_by, supplier_id, stock_in) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.query(sqlInsertSupply, [name, supply_category, unit, unit_price, quantity, purchase_date, recorded_by, supplier_id, quantity]);

        const supply_id = result.insertId;

        const sqlInsertTransaction = `
            INSERT INTO supply_transactions (supply_id, transaction_type, quantity, unit_price, transaction_date, recorded_by) 
            VALUES (?, 'purchase', ?, ?, ?)
        `;
        await pool.query(sqlInsertTransaction, [supply_id, quantity, unit_price, purchase_date, recorded_by]);

        return { message: 'Supply created successfully with transaction recorded.', supply_id };
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.getAllSupplies = async () => {
    try {
        const sql = `
            SELECT 
                s.id,
                s.name AS supply_name,
                sc.name AS supply_category,
                s.unit,
                s.unit_price,
                s.quantity,
                s.total_cost,
                s.purchase_date,
                u.name AS recorded_by,
                s.created_at,
                sp.name AS supplier_name,
                s.stock_in,
                s.stock_out,
                s.current_stock,
                s.min_stock_level
            FROM supplies s
            LEFT JOIN supplies_category sc ON s.supply_category = sc.id
            LEFT JOIN users u ON s.recorded_by = u.id
            LEFT JOIN suppliers sp ON s.supplier_id = sp.id
            WHERE s.status = 'active'
            ORDER BY s.purchase_date DESC;
        `;

        const [result] = await pool.query(sql);
        return result;
    } catch (error) {
        throw new Error(`Database query failed: ${error.message}`);
    }
};


exports.getSupplyById = async (id) => {
    try {
        const sql = 'SELECT * FROM supplies WHERE id = ?';
        const [result] = await pool.query(sql, [id]);
        return result[0];
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.updateSupply = async (id, supplyData) => {
    try {
        const { name, unit, unit_price, quantity, purchase_date, supplier, supplier_id } = supplyData;
        const sql = 'UPDATE supplies SET name = ?, unit = ?, unit_price = ?, quantity = ?, purchase_date = ?, supplier = ?, supplier_id = ? WHERE id = ?';
        await pool.query(sql, [name, unit, unit_price, quantity, purchase_date, supplier, supplier_id, id]);
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.deleteSupply = async (id) => {
    try {
        const sql = 'DELETE FROM supplies WHERE id = ?';
        await pool.query(sql, [id]);
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.getExpensesReport = async (start_date, end_date, category) => {
    try { 
        let sql = `
            SELECT 
                e.id, 
                e.name, 
                ec.name AS category_name, 
                e.unit, 
                e.quantity_used,
                e.unit_price, 
                e.total_cost,
                e.expense_date, 
                e.note,   
                u.name AS recorded_by
            FROM expenses e
            LEFT JOIN expense_category ec ON e.expense_category = ec.id 
            LEFT JOIN users u ON e.recorded_by = u.id
            WHERE 1=1
        `;
        const params = [];

        if (start_date) {
            sql += ' AND expense_date >= ?';
            params.push(start_date);
        }
        if (end_date) {
            sql += ' AND expense_date <= ?';
            params.push(end_date);
        }
        if (category) {
            sql += ' AND expense_category = ?';
            params.push(category);
        }

        sql += ' ORDER BY e.id DESC;';  

        const [result] = await pool.query(sql, params);
        return result;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.getIncomeReport = async (start_date, end_date, category) => {
    try { 
        let sql = `
            SELECT 
                i.id, 
                i.name, 
                ic.name AS category_name, 
                i.quantity,
                i.unit,  
                i.price_per_unit, 
                i.total_income,
                i.income_date, 
                i.description,   
                u.name AS recorded_by
            FROM income i
            LEFT JOIN income_category ic ON i.income_category = ic.id 
            LEFT JOIN users u ON i.recorded_by = u.id
            WHERE 1=1
        `; 

        let params = [];

        if (start_date) {
            sql += ' AND i.income_date >= ?';
            params.push(start_date);
        }
        if (end_date) {
            sql += ' AND i.income_date <= ?';
            params.push(end_date);
        }
        if (category) {
            sql += ' AND i.income_category = ?';
            params.push(category);
        }

        sql += ' ORDER BY i.id DESC;';  

        const [result] = await pool.query(sql, params);
        return result;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};


exports.milkProductionReport = async (start_date, end_date) => {
    try {
        let sql = 'SELECT * FROM milk_production WHERE 1';
        const params = [];

        if (start_date) {
            sql += ' AND production_date >= ?';
            params.push(start_date);
        }
        if (end_date) {
            sql += ' AND production_date <= ?';
            params.push(end_date);
        }

        const [result] = await pool.query(sql, params);
        return result;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.cowMilkProductionReport = async (cow_id, startDate, endDate) => {
    try {
        let sql = `
            SELECT mp.*, c.name AS cow_name, c.breed
            FROM milk_production mp
            JOIN cows c ON mp.cow_id = c.id
            WHERE mp.production_date BETWEEN ? AND ?
        `;
        const params = [startDate, endDate];

        if (cow_id) {
            sql += ' AND mp.cow_id = ?';
            params.push(cow_id);
        }

        sql += ' ORDER BY mp.production_date DESC';

        const [result] = await pool.query(sql, params);
        return result;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};


exports.getCowsReport = async (breed, age_range) => {
    try {
        let sql = `
            SELECT *, 
                TIMESTAMPDIFF(YEAR, dob, CURDATE()) AS age 
            FROM cows 
            WHERE 1
        `;
        const params = [];

        if (breed) {
            sql += ' AND breed = ?';
            params.push(breed);
        }

        if (age_range) {
            const [minAge, maxAge] = age_range.split('-').map(Number);
            sql += ' AND TIMESTAMPDIFF(YEAR, dob, CURDATE()) BETWEEN ? AND ?';
            params.push(minAge, maxAge);
        }

        const [result] = await pool.query(sql, params);
        return result;
    } catch (error) {
        throw new Error(`Database query failed: ${error}`);
    }
};

exports.getDashboardMetrics = async (period) => {
    let incomeDateFilter = "";
    let expenseDateFilter = "";
    let dateFilter = "";

    if (period === "today") {
        incomeDateFilter = "WHERE DATE(income_date) = CURDATE()";
        expenseDateFilter = "WHERE DATE(expense_date) = CURDATE()";
        dateFilter = "WHERE DATE(production_date) = CURDATE()";
    } else if (period === "month") {
        incomeDateFilter = "WHERE YEAR(income_date) = YEAR(CURDATE()) AND MONTH(income_date) = MONTH(CURDATE())";
        expenseDateFilter = "WHERE YEAR(expense_date) = YEAR(CURDATE()) AND MONTH(expense_date) = MONTH(CURDATE())";
        dateFilter = "WHERE YEAR(production_date) = YEAR(CURDATE()) AND MONTH(production_date) = MONTH(CURDATE())";
    }

    try {
        const [expensesResult] = await pool.query(`SELECT IFNULL(SUM(total_cost), 0) AS total_expenses FROM expenses ${expenseDateFilter}`);
        const totalExpenses = expensesResult[0]?.total_expenses || 0;

        const [incomeResult] = await pool.query(`SELECT IFNULL(SUM(total_income), 0) AS total_income FROM income ${incomeDateFilter}`);
        const totalIncome = incomeResult[0]?.total_income || 0;

        const [milkProductionResult] = await pool.query(`SELECT IFNULL(SUM(total_milk), 0) AS total_milk_production FROM milk_production ${dateFilter}`);
        const totalMilkProduction = milkProductionResult[0]?.total_milk_production || 0;

        const [cowsResult] = await pool.query(`SELECT COUNT(*) AS total_cows FROM cows WHERE status = 'active'`);
        const totalCows = cowsResult[0]?.total_cows || 0;

        const [lowStockResult] = await pool.query(`SELECT COUNT(*) AS low_stock_items FROM supplies WHERE current_stock < 5 `);
        const lowStockItems = lowStockResult[0]?.low_stock_items || 0;

        const [suppliersResult] = await pool.query(`SELECT COUNT(*) AS total_suppliers FROM suppliers WHERE status = 'active'`);
        const totalSuppliers = suppliersResult[0]?.total_suppliers || 0;

        return {
            total_expenses: totalExpenses,
            total_income: totalIncome,
            total_milk_production: totalMilkProduction,
            total_cows: totalCows,
            low_stock_alerts: lowStockItems,
            total_suppliers: totalSuppliers
        };
    } catch (error) {
        throw new Error(`Error fetching dashboard metrics: ${error.message}`);
    }
};