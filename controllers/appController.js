const App = require('../models/App');
const User = require('../models/User');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const upload = require('../middlewares/upload');
const crypto = require('crypto');
const generateUid = require('../utils/utils');
const moment = require('moment');
const { validateDate, formatDate, DATE_FORMAT } = require('../utils/dateUtils');
const pool = require('../config/db');
const nodemailer = require("nodemailer");
const { logInteraction } = require('../helpers/casefileInteractions');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your_email@gmail.com',
        pass: 'your_email_password',
    },
});

exports.addClient = async (req, res) => {
    const {
        name,
        abbreviation,
        client_type,
        team_leader_id,
        paybill,
        general_target,
        contacts
    } = req.body;

    try {
        const userID = req.user.id;
        if (!userID) {
            return res.status(401).json({ message: 'User not authenticated.' });
        }

        if (!name || !client_type) {
            return res.status(400).json({ message: 'Name and client type are required.' });
        }

        // Insert client into database
        const [clientResult] = await pool.query(
            'INSERT INTO clients (name, abbreviation, client_type, team_leader_id, paybill, general_target) VALUES (?, ?, ?, ?, ?, ?)',
            [name, abbreviation, client_type, team_leader_id, paybill, general_target]
        );
        const clientID = clientResult.insertId;

        // Insert contact persons if provided
        if (contacts && contacts.length > 0) {
            const contactValues = contacts.map(contact => [
                clientID,
                contact.name,
                contact.designation,
                contact.branch_department,
                contact.phone,
                contact.email
            ]);

            await pool.query(
                'INSERT INTO client_contacts (client_id, name, designation, branch_department, phone, email) VALUES ?;',
                [contactValues]
            );
        }

        res.status(200).json({ message: 'Client created successfully', clientID });
    } catch (error) {
        res.status(500).json({ message: `Error creating client: ${error}` });
    }
};


 // =================== Add Debt Category ===================
exports.addDebtCategory = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const [result] = await pool.query(
      'INSERT INTO debt_categories (title, description) VALUES (?, ?)',
      [title, description]
    );

    return res.status(201).json({ message: 'Debt category added', data: { id: result.insertId, title, description } });
  } catch (error) {
    console.error('Add Debt Category Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// =================== Get All Debt Categories ===================
exports.getAllDebtCategory = async (req, res) => {
  try {
    const [categories] = await pool.query('SELECT * FROM debt_categories ORDER BY id ASC'); 
    return res.status(200).json(categories);
  } catch (error) {
    console.error('Get Debt Categories Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// =================== Update Debt Category ===================
exports.updateDebtCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const [result] = await pool.query(
      'UPDATE debt_categories SET title = ?, description = ? WHERE id = ?',
      [title, description, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Debt category not found' });
    }

    return res.status(200).json({ message: 'Debt category updated', data: { id, title, description } });
  } catch (error) {
    console.error('Update Debt Category Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// =================== Delete Debt Category ===================
exports.deleteDebtCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query('DELETE FROM debt_categories WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Debt category not found' });
    }

    return res.status(200).json({ message: 'Debt category deleted successfully' });
  } catch (error) {
    console.error('Delete Debt Category Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// =================== Add Debt Type ===================
exports.addDebtType = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const [result] = await pool.query(
      'INSERT INTO debt_types (title, description) VALUES (?, ?)',
      [title, description]
    );

    return res.status(201).json({ message: 'Debt type added', data: { id: result.insertId, title, description } });
  } catch (error) {
    console.error('Add Debt Type Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// =================== Get All Debt Types ===================
exports.getAllDebtTypes = async (req, res) => {
  try {
    const [result] = await pool.query('SELECT * FROM debt_types ORDER BY id ASC');
    return res.status(200).json(result);
  } catch (error) {
    console.error('Get Debt Types Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// =================== Update Debt Type ===================
exports.updateDebtType = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const [result] = await pool.query(
      'UPDATE debt_types SET title = ?, description = ? WHERE id = ?',
      [title, description, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Debt type not found' });
    }

    return res.status(200).json({ message: 'Debt type updated', data: { id, title, description } });
  } catch (error) {
    console.error('Update Debt Type Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// =================== Delete Debt Type ===================
exports.deleteDebtType = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query('DELETE FROM debt_types WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Debt type not found' });
    }

    return res.status(200).json({ message: 'Debt type deleted successfully' });
  } catch (error) {
    console.error('Delete Debt Type Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


exports.addDebtSubType = async (req, res) => {
  try {
    const { title, description, debt_type_id, status } = req.body;
    if (!title || !debt_type_id) {
      return res.status(400).json({ error: 'Title and Debt Type ID are required' });
    }

    const result = await App.addDebtSubType(title, description, debt_type_id, status);
    res.status(201).json({ message: 'Debt sub type added successfully', id: result.insertId });
  } catch (err) {
    console.error('Error adding debt sub type:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all Debt Sub Types
exports.getAllDebtSubTypes = async (req, res) => {
  try {
    const subTypes = await App.getAllDebtSubTypes();
    res.json({ subTypes });
  } catch (err) {
    console.error('Error fetching debt sub types:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ---------------------- Currencies ----------------------
exports.addCurrency = async (req, res) => {
  try {
    const { code, name, symbol } = req.body;
    if (!code || !name || !symbol) return res.status(400).json({ message: 'Name and symbol are required' });

    const newCurrency = await App.addCurrency({ code, name, symbol });
    return res.status(201).json({ message: 'Currency added', data: newCurrency });
  } catch (error) {
    console.error('Add Currency Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllCurrencies = async (req, res) => {
  try {
    const currencies = await App.getAllCurrencies();
    return res.status(200).json(currencies);
  } catch (error) {
    console.error('Get Currencies Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// =================== Add Client Type ===================
exports.addClientType = async (req, res) => {
  const { type, description } = req.body;
  try {
    if(!type) {
      res.status(401).json({ message: 'Client type required' });
    }
    const [result] = await pool.query(
      `INSERT INTO client_types (type, description) VALUES (?, ?)`,
      [type, description]
    );
    res.status(201).json({ id: result.insertId, type, description });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error adding client type' });
  }
};

// =================== Get All Client Types ===================
exports.getAllClientTypes = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM client_types ORDER BY id DESC`);
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching client types' });
  }
};

// =================== Update Client Type ===================
exports.updateClientType = async (req, res) => {
  const { id } = req.params;
  const { type, description } = req.body;

  try {
    if(!type) {
      res.status(401).json({ message: 'Client type required' });
    }

    const [result] = await pool.query(
      `UPDATE client_types SET type = ?, description = ? WHERE id = ?`,
      [type, description, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Client type not found' });
    }

    res.status(200).json({ id, type, description, message: 'Client type updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating client type' });
  }
};

// =================== Delete Client Type ===================
exports.deleteClientType = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(`DELETE FROM client_types WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Client type not found' });
    }

    res.status(200).json({ message: 'Client type deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting client type' });
  }
};

 

// ---------- Client Products ----------
exports.addClientProduct = async (req, res) => {
  const { client_id, title, description, general_target, paybill, status } = req.body;

  try {
    // --- Validate Required Fields ---
    if (!client_id) {
      return res.status(400).json({ message: 'Client ID is required' });
    }

    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Product title is required' });
    }

    // Optional: Ensure general_target is a valid number
    if (general_target && isNaN(Number(general_target))) {
      return res.status(400).json({ message: 'General target must be a number' });
    }

    // --- Insert into Database ---
    const [result] = await pool.query(
      `INSERT INTO client_products (client_id, title, description, general_target, paybill, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [client_id, title, description || null, general_target || 0, paybill || null, status || 'active']
    );

    res.status(201).json({ 
      id: result.insertId, 
      client_id, 
      title, 
      description, 
      general_target: general_target || 0, 
      paybill, 
      status: status || 'active',
      message: "Product added successfully"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error adding client product' });
  }
};

exports.getAllClientProducts = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM client_products ORDER BY id DESC`);
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching client products' });
  }
};

// =================== Update Client Product ===================
exports.updateClientProduct = async (req, res) => {
  const { id } = req.params;
  const { client_id, title, description, general_target, paybill, status } = req.body;

  try {
    if (!client_id) return res.status(400).json({ message: 'Client ID is required' });
    if (!title || title.trim() === '') return res.status(400).json({ message: 'Product title is required' });

    const [result] = await pool.query(
      `UPDATE client_products 
       SET client_id = ?, title = ?, description = ?, general_target = ?, paybill = ?, status = ?
       WHERE id = ?`,
      [client_id, title, description || null, general_target || 0, paybill || null, status || 'active', id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({
      id,
      client_id,
      title,
      description,
      general_target: general_target || 0,
      paybill,
      status: status || 'active',
      message: "Product updated successfully"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating client product' });
  }
};

// =================== Delete Client Product ===================
exports.deleteClientProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM client_products WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting client product' });
  }
};



// ---------- Contactability ----------
exports.addContactability = async (req, res) => {
  const { title, description, status } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO contactability (title, description, status) VALUES (?, ?, ?)`,
      [title, description, status || 'ACTIVE']
    );
    res.status(201).json({ id: result.insertId, title, description, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error adding contactability' });
  }
};

exports.getAllContactability = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM contactability ORDER BY id DESC`);
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching contactability' });
  }
};

// =================== Update Contactability ===================
exports.updateContactability = async (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body;

  try {
    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Title is required' });
    }

    const [result] = await pool.query(
      `UPDATE contactability 
       SET title = ?, description = ?, status = ?
       WHERE id = ?`,
      [title, description || null, status || 'ACTIVE', id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Contactability not found' });
    }

    res.status(200).json({
      id,
      title,
      description,
      status: status || 'ACTIVE',
      message: "Contactability updated successfully"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating contactability' });
  }
};

// =================== Delete Contactability ===================
exports.deleteContactability = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM contactability WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Contactability not found' });
    }

    res.status(200).json({ message: 'Contactability deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting contactability' });
  }
};



// ---------- Contact Types ----------
exports.addContactType = async (req, res) => {
  const { title, contactability_id, abbreviation } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO contact_types (title, contactability_id, abbreviation) VALUES (?, ?, ?)`,
      [title, contactability_id, abbreviation]
    );
    res.status(201).json({ id: result.insertId, title, contactability_id, abbreviation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error adding contact type' });
  }
};

exports.getAllContactTypes = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        ct.*, 
        c.title AS contactability_title
      FROM contact_types ct
      LEFT JOIN contactability c ON ct.contactability_id = c.id
      ORDER BY ct.id DESC
    `);
    
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching contact types' });
  }
};


// =================== Update Contact Type ===================
exports.updateContactType = async (req, res) => {
  const { id } = req.params;
  const { title, contactability_id, abbreviation } = req.body;

  try {
    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Title is required' });
    }

    const [result] = await pool.query(
      `UPDATE contact_types 
       SET title = ?, contactability_id = ?, abbreviation = ?
       WHERE id = ?`,
      [title, contactability_id || null, abbreviation || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Contact type not found' });
    }

    res.status(200).json({
      id,
      title,
      contactability_id: contactability_id || null,
      abbreviation: abbreviation || null,
      message: "Contact type updated successfully"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating contact type' });
  }
};

// =================== Delete Contact Type ===================
exports.deleteContactType = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM contact_types WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Contact type not found' });
    }

    res.status(200).json({ message: 'Contact type deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting contact type' });
  }
};

// ---------- Contact Statuses ----------
exports.addContactStatus = async (req, res) => {
  const { title, contact_type_id, abbreviation, max_days, dialing_priority } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO contact_statuses (title, contact_type_id, abbreviation, max_days, dialing_priority) 
       VALUES (?, ?, ?, ?, ?)`,
      [title, contact_type_id, abbreviation, max_days, dialing_priority]
    );
    res.status(201).json({ id: result.insertId, title, contact_type_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error adding contact status' });
  }
};

exports.getAllContactStatuses = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        cs.*, 
        ct.title AS contact_type_title,
        c.title AS contactability_title
      FROM contact_statuses cs
      LEFT JOIN contact_types ct ON cs.contact_type_id = ct.id
      LEFT JOIN contactability c ON ct.contactability_id = c.id
      ORDER BY cs.id DESC
    `);

    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching contact statuses' });
  }
};

// =================== Update Contact Status ===================
exports.updateContactStatus = async (req, res) => {
  const { id } = req.params;
  const { title, contact_type_id, abbreviation, max_days, dialing_priority } = req.body;

  try {
    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Title is required' });
    }

    const [result] = await pool.query(
      `UPDATE contact_statuses 
       SET title = ?, contact_type_id = ?, abbreviation = ?, max_days = ?, dialing_priority = ?
       WHERE id = ?`,
      [title, contact_type_id || null, abbreviation || null, max_days || 0, dialing_priority || 0, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Contact status not found' });
    }

    res.status(200).json({
      id,
      title,
      contact_type_id: contact_type_id || null,
      abbreviation: abbreviation || null,
      max_days: max_days || 0,
      dialing_priority: dialing_priority || 0,
      message: "Contact status updated successfully"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating contact status' });
  }
};

// =================== Delete Contact Status ===================
exports.deleteContactStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM contact_statuses WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Contact status not found' });
    }

    res.status(200).json({ message: 'Contact status deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting contact status' });
  }
};

// ---------- Closure Reasons ----------
exports.addClosureReason = async (req, res) => {
  const { title, description, abbreviation, status } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO closure_reasons (title, description, abbreviation, status) VALUES (?, ?, ?, ?)`,
      [title, description, abbreviation, status || 'ACTIVE']
    );
    res.status(201).json({ id: result.insertId, title, description, abbreviation, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error adding closure reason' });
  }
};

exports.getAllClosureReasons = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM closure_reasons ORDER BY id DESC`);
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching closure reasons' });
  }
};

// =================== Update Closure Reason ===================
exports.updateClosureReason = async (req, res) => {
  const { id } = req.params;
  const { title, description, abbreviation, status } = req.body;

  try {
    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Title is required' });
    }

    const [result] = await pool.query(
      `UPDATE closure_reasons
       SET title = ?, description = ?, abbreviation = ?, status = ?
       WHERE id = ?`,
      [title, description || null, abbreviation || null, status || 'ACTIVE', id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Closure reason not found' });
    }

    res.status(200).json({
      id,
      title,
      description: description || null,
      abbreviation: abbreviation || null,
      status: status || 'ACTIVE',
      message: 'Closure reason updated successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating closure reason' });
  }
};

// =================== Delete Closure Reason ===================
exports.deleteClosureReason = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM closure_reasons WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Closure reason not found' });
    }

    res.status(200).json({ message: 'Closure reason deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting closure reason' });
  }
};



// ---------- Next Actions ----------
exports.addNextAction = async (req, res) => {
  const { title, description, abbreviation, status } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO next_actions (title, description, abbreviation, status) VALUES (?, ?, ?, ?)`,
      [title, description, abbreviation, status || 'ACTIVE']
    );
    res.status(201).json({ id: result.insertId, title, description, abbreviation, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error adding next action' });
  }
};

exports.getAllNextActions = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM next_actions ORDER BY id DESC`);
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching next actions' });
  }
};

// =================== Update Next Action ===================
exports.updateNextAction = async (req, res) => {
  const { id } = req.params;
  const { title, description, abbreviation, status } = req.body;

  try {
    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Title is required' });
    }

    const [result] = await pool.query(
      `UPDATE next_actions
       SET title = ?, description = ?, abbreviation = ?, status = ?
       WHERE id = ?`,
      [title, description || null, abbreviation || null, status || 'ACTIVE', id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Next action not found' });
    }

    res.status(200).json({
      id,
      title,
      description: description || null,
      abbreviation: abbreviation || null,
      status: status || 'ACTIVE',
      message: 'Next action updated successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating next action' });
  }
};

// =================== Delete Next Action ===================
exports.deleteNextAction = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM next_actions WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Next action not found' });
    }

    res.status(200).json({ message: 'Next action deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting next action' });
  }
};


// ---------- Call Types ----------
exports.addCallType = async (req, res) => {
  const { title, description } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO call_types (title, description) VALUES (?, ?)`,
      [title, description]
    );
    res.status(201).json({ id: result.insertId, title, description });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error adding call type' });
  }
};

exports.getAllCallTypes = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM call_types ORDER BY id DESC`);
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching call types' });
  }
};

// =================== Update Call Type ===================
exports.updateCallType = async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;

  try {
    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Title is required' });
    }

    const [result] = await pool.query(
      `UPDATE call_types SET title = ?, description = ? WHERE id = ?`,
      [title, description || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Call type not found' });
    }

    res.status(200).json({ id, title, description: description || null, message: 'Call type updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating call type' });
  }
};

// =================== Delete Call Type ===================
exports.deleteCallType = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM call_types WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Call type not found' });
    }

    res.status(200).json({ message: 'Call type deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting call type' });
  }
};

// ---------- PTP Reschedule Reasons ----------
exports.addPtpRescheduleReason = async (req, res) => {
  const { title, description, status } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO ptp_reschedule_reasons (title, description, status) VALUES (?, ?, ?)`,
      [title, description, status || 'ACTIVE']
    );
    res.status(201).json({ id: result.insertId, title, description, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error adding ptp reschedule reason' });
  }
};

exports.getAllPtpRescheduleReasons = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM ptp_reschedule_reasons ORDER BY id DESC`);
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching ptp reschedule reasons' });
  }
};

// =================== Update PTP Reschedule Reason ===================
exports.updatePtpRescheduleReason = async (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body;

  try {
    if (!title || title.trim() === '') {
      return res.status(400).json({ message: 'Title is required' });
    }

    const [result] = await pool.query(
      `UPDATE ptp_reschedule_reasons SET title = ?, description = ?, status = ? WHERE id = ?`,
      [title, description || null, status || 'ACTIVE', id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'PTP Reschedule Reason not found' });
    }

    res.status(200).json({ id, title, description: description || null, status: status || 'ACTIVE', message: 'PTP Reschedule Reason updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating PTP Reschedule Reason' });
  }
};

// =================== Delete PTP Reschedule Reason ===================
exports.deletePtpRescheduleReason = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      `DELETE FROM ptp_reschedule_reasons WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'PTP Reschedule Reason not found' });
    }

    res.status(200).json({ message: 'PTP Reschedule Reason deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting PTP Reschedule Reason' });
  }
};

exports.getSummaryV1 = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role; // 'admin', 'team_leader', 'staff'

    // Step 1: Build a reusable CASE filter condition
    let caseCondition = '';
    if (userRole === 'staff') {
      caseCondition = `held_by = ${userId}`;
    } else if (userRole === 'team_leader') {
      // For team leader, get all staff IDs under them
      const [teamStaff] = await pool.query(`SELECT id FROM staff WHERE manager_id = ${userId}`);
      const staffIds = teamStaff.map(s => s.id);
      if (staffIds.length > 0) {
        caseCondition = `held_by IN (${staffIds.join(',')})`;
      } else {
        caseCondition = '1=0'; // No team members
      }
    } else {
      caseCondition = '1=1'; // Admin sees all
    }

    // We'll use this in all queries as a WHERE condition
    const caseFilter = `WHERE ${caseCondition}`;

    // Step 2: Total Cases
    const [cases] = await pool.query(`SELECT COUNT(*) as total FROM case_files ${caseFilter}`);

    // Step 3: Active Staff (only admins/team_leaders)
    let activeStaffCount = 0;
    if (userRole !== 'staff') {
      const [activeStaff] = await pool.query(`SELECT COUNT(*) as total FROM staff WHERE is_active = 1`);
      activeStaffCount = activeStaff[0].total;
    }

    // Step 4: Total Recovered
    const [recovered] = await pool.query(`
      SELECT IFNULL(SUM(amount_paid), 0) as total
      FROM payments
      WHERE casefile_id IN (SELECT id FROM case_files ${caseFilter}) AND status = "confirmed"
    `);

    // Step 5: Overdue Cases
    const [overdueCases] = await pool.query(`
      SELECT COUNT(*) as total FROM case_files
      ${caseFilter} AND loan_due_date < NOW() AND status != "closed"
    `);

    // Step 6: Today's Collections
    const [todaysCollections] = await pool.query(`
      SELECT IFNULL(SUM(amount_paid), 0) as total
      FROM payments
      WHERE casefile_id IN (SELECT id FROM case_files ${caseFilter})
      AND DATE(created_at)=CURDATE()
    `);

    // Step 7: Total Debt
    const [totalDebt] = await pool.query(`
      SELECT IFNULL(SUM(amount), 0) as total
      FROM case_files
      ${caseFilter}
    `);

    const recoveryRate = totalDebt[0].total > 0
      ? ((recovered[0].total / totalDebt[0].total) * 100).toFixed(2)
      : 0;

    // Step 8: Staff Performance (only admins/team leaders)
    let staffPerformance = [];
    if (userRole !== 'staff') {
      [staffPerformance] = await pool.query(`
        SELECT u.first_name, u.last_name, SUM(p.amount_paid) as total
        FROM payments p
        JOIN staff u ON p.posted_by = u.id
        WHERE p.status = "confirmed"
        GROUP BY u.id
        ORDER BY total DESC
        LIMIT 5
      `);
    }

    // Step 9: Monthly Recoveries
    const [monthlyRecoveries] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(amount_paid) as total
      FROM payments
      WHERE casefile_id IN (SELECT id FROM case_files ${caseFilter})
      AND status = "confirmed"
      GROUP BY month
      ORDER BY month ASC
    `);

    // Step 10: Recent Activity
    const [interactions] = await pool.query(`
      SELECT 
        ci.id,
        ci.notes,
        ci.date_created AS date,
        u.first_name AS created_by,
        ct.title AS contact_type,
        cs.title AS contact_status,
        callt.title AS call_type,
        na.title AS next_action,
        ci.next_action_date,
        ptp.ptp_amount,
        ptp.ptp_date,
        ptp.ptp_type,
        ptp.ptp_status,
        ptp.affirm_status,
        pr.report AS progress_report,
        sms.message AS sms_message,
        mail.subject AS mail_subject,
        pay.amount_paid AS payment_amount,
        pay.date_paid AS payment_date,
        rr.title AS reschedule_reason
      FROM casefile_interactions ci
      LEFT JOIN contact_types ct ON ci.contact_type_id = ct.id
      LEFT JOIN contact_statuses cs ON ci.contact_status_id = cs.id
      LEFT JOIN call_types callt ON ci.call_type_id = callt.id
      LEFT JOIN next_actions na ON ci.next_action_id = na.id
      LEFT JOIN staff u ON ci.created_by = u.id
      LEFT JOIN ptps ptp ON ci.ptp_id = ptp.id
      LEFT JOIN progress_reports pr ON ci.progress_report_id = pr.id
      LEFT JOIN sms_logs sms ON ci.sms_id = sms.id
      LEFT JOIN mail_logs mail ON ci.mail_id = mail.id
      LEFT JOIN payments pay ON ci.payment_id = pay.id
      LEFT JOIN ptp_reschedule_reasons rr ON ci.ptp_reschedule_reason_id = rr.id
      WHERE ci.casefile_id IN (SELECT id FROM case_files ${caseFilter})
      ORDER BY ci.date_created DESC
      LIMIT 10
    `);

    const formattedActivity = interactions.map(interaction => ({
      id: interaction.id,
      date: interaction.date,
      created_by: interaction.created_by,
      notes: formatInteractionNotes(interaction)
    }));

    // Step 11: Return Response
    res.json({
      stats: {
        totalCases: cases[0].total,
        activeStaff: activeStaffCount,
        totalRecovered: recovered[0].total || 0,
        recoveryRate,
        overdueCases: overdueCases[0].total,
        todaysCollections: todaysCollections[0].total || 0,
        staffPerformance
      },
      charts: { monthlyRecoveries },
      recentActivity: formattedActivity
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching dashboard summary' });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role; // 'admin', 'team_leader', 'staff'

    // Build reusable case condition
    let caseCondition = '';
    if (userRole === 'staff') {
      caseCondition = `held_by = ${userId}`;
    } else if (userRole === 'team_leader') {
      const [teamStaff] = await pool.query(`SELECT id FROM staff WHERE manager_id = ${userId}`);
      const staffIds = teamStaff.map(s => s.id);
      caseCondition = staffIds.length > 0 ? `held_by IN (${staffIds.join(',')})` : '1=0';
    } else {
      caseCondition = '1=1';
    }
    const caseFilter = `WHERE ${caseCondition}`;

    // Current totals
    const [[cases]] = await pool.query(`SELECT COUNT(*) as total FROM case_files ${caseFilter}`);
    const [[activeStaff]] = userRole !== 'staff'
      ? await pool.query(`SELECT COUNT(*) as total FROM staff WHERE is_active = 1`)
      : [[{ total: 0 }]];
    const [[recovered]] = await pool.query(`
      SELECT IFNULL(SUM(amount_paid), 0) as total
      FROM payments
      WHERE casefile_id IN (SELECT id FROM case_files ${caseFilter}) AND status = "confirmed"
    `);
    const [[overdueCases]] = await pool.query(`
      SELECT COUNT(*) as total FROM case_files
      ${caseFilter} AND loan_due_date < NOW() AND status != "closed"
    `);
    const [[todaysCollections]] = await pool.query(`
      SELECT IFNULL(SUM(amount_paid), 0) as total
      FROM payments
      WHERE casefile_id IN (SELECT id FROM case_files ${caseFilter})
      AND DATE(created_at)=CURDATE()
    `);
    const [[totalDebt]] = await pool.query(`
      SELECT IFNULL(SUM(amount), 0) as total
      FROM case_files ${caseFilter}
    `);

    const recoveryRate = totalDebt.total > 0
      ? ((recovered.total / totalDebt.total) * 100).toFixed(2)
      : 0;

    // Staff performance
    let staffPerformance = [];
    if (userRole !== 'staff') {
      [staffPerformance] = await pool.query(`
        SELECT u.first_name, u.last_name, SUM(p.amount_paid) as total
        FROM payments p
        JOIN staff u ON p.posted_by = u.id
        WHERE p.status = "confirmed"
        GROUP BY u.id
        ORDER BY total DESC
        LIMIT 5
      `);
    }

    // Monthly Recoveries
    const [monthlyRecoveries] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%b') as month, SUM(amount_paid) as amount, COUNT(*) as cases
      FROM payments
      WHERE casefile_id IN (SELECT id FROM case_files ${caseFilter})
      AND status = "confirmed"
      GROUP BY month
      ORDER BY month ASC
    `);

    // Recent activity (simplified)
    const [interactions] = await pool.query(`
      SELECT ci.id, 'payment' AS type, ci.notes AS description, ci.date_created AS timestamp, u.first_name AS user
      FROM casefile_interactions ci
      LEFT JOIN staff u ON ci.created_by = u.id
      WHERE ci.casefile_id IN (SELECT id FROM case_files ${caseFilter})
      ORDER BY ci.date_created DESC
      LIMIT 10
    `);

    // Final response
    res.json({
      stats: {
        totalCases: cases.total,
        totalCasesChange: "+12%",
        totalCasesChangeType: "increase",
        activeStaff: activeStaff.total,
        activeStaffChange: "+3%",
        activeStaffChangeType: "increase",
        totalRecovered: recovered.total,
        totalRecoveredChange: "+8%",
        totalRecoveredChangeType: "increase",
        overdueCases: overdueCases.total,
        overdueCasesChange: "-5%",
        overdueCasesChangeType: "decrease",
        todaysCollections: todaysCollections.total,
        recoveryRate,
        priorityOverdueCases: overdueCases.total,
        todaysCollectionsAmount: todaysCollections.total,
        topStaffCount: staffPerformance.length,
        staffPerformance
      },
      charts: { monthlyRecoveries },
      recentActivity: interactions.map(i => ({
        id: i.id,
        type: i.type,
        description: i.description,
        timestamp: i.timestamp,
        user: i.user
      }))
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching dashboard summary' });
  }
};

exports.getCalendarV1 = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role; // 'admin', 'team_leader', 'staff'

    // --- Role-based filter ---
    let caseCondition = '';
    if (userRole === 'staff') {
      caseCondition = `c.held_by = ${userId}`;
    } else if (userRole === 'team_leader') {
      const [teamStaff] = await pool.query(`SELECT id FROM staff WHERE manager_id = ${userId}`);
      const staffIds = teamStaff.map(s => s.id);
      caseCondition = staffIds.length > 0 ? `c.held_by IN (${staffIds.join(',')})` : '1=0';
    } else {
      caseCondition = '1=1'; // admin sees all
    }

    // --- Get Case Files ---
    const [caseFiles] = await pool.query(`
      SELECT 
        c.*
      FROM case_files c
      WHERE ${caseCondition}
      ORDER BY c.created_at DESC
    `);

    // --- Get PTPs + join case files for full object ---
    const [ptps] = await pool.query(`
      SELECT 
        p.*, 
        c.id AS casefile_id, c.cfid, c.client_id, c.product_id, c.debt_type_id,
        c.debt_sub_type_id, c.debt_category_id, c.currency_id, c.held_by,
        c.full_names, c.identification, c.customer_id, c.account_number, c.contract_no,
        c.phones, c.emails, c.amount, c.principal_amount, c.amount_repaid, c.arrears,
        c.status AS case_status, c.created_at AS case_created_at, c.updated_at AS case_updated_at
      FROM ptps p
      JOIN case_files c ON c.id = p.casefile_id
      WHERE ${caseCondition}
      ORDER BY p.ptp_date DESC
    `);

    // --- Build Final Response ---
    const ptpsWithCaseFiles = ptps.map(p => ({
      id: p.id,
      casefile_id: p.casefile_id,
      ptp_date: p.ptp_date,
      ptp_amount: p.ptp_amount,
      ptp_by: p.ptp_by,
      ptp_type: p.ptp_type,
      ptp_status: p.ptp_status,
      affirm_status: p.affirm_status,
      is_active: p.is_active === 1,
      is_rescheduled: p.is_rescheduled === 1,
      created_at: p.created_at,
      updated_at: p.updated_at,
      casefile: {
        id: p.casefile_id,
        cfid: p.cfid,
        client_id: p.client_id,
        product_id: p.product_id,
        debt_type_id: p.debt_type_id,
        debt_sub_type_id: p.debt_sub_type_id,
        debt_category_id: p.debt_category_id,
        currency_id: p.currency_id,
        held_by: p.held_by,
        full_names: p.full_names,
        identification: p.identification,
        customer_id: p.customer_id,
        account_number: p.account_number,
        contract_no: p.contract_no,
        phones: p.phones,
        emails: p.emails,
        amount: p.amount,
        principal_amount: p.principal_amount,
        amount_repaid: p.amount_repaid,
        arrears: p.arrears,
        status: p.case_status,
        created_at: p.case_created_at,
        updated_at: p.case_updated_at
      }
    }));

    res.json({
      caseFiles: caseFiles,
      ptps: ptpsWithCaseFiles
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching calendar data" });
  }
};

exports.getCalendar = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role; // 'admin', 'team_leader', 'staff'

    // --- Role-based filter for casefiles ---
    let caseCondition = '';
    if (userRole === 'staff') {
      caseCondition = `c.held_by = ${userId}`;
    } else if (userRole === 'team_leader') {
      const [teamStaff] = await pool.query(`SELECT id FROM staff WHERE manager_id = ${userId}`);
      const staffIds = teamStaff.map(s => s.id);
      caseCondition = staffIds.length > 0 ? `c.held_by IN (${staffIds.join(',')})` : '1=0';
    } else {
      caseCondition = '1=1'; // admin sees all
    }

    // --- 1. Casefile Next Actions ---
    const [nextActions] = await pool.query(`
      SELECT 
        cna.id AS next_action_record_id,
        cna.casefile_id,
        cna.next_action_id,
        cna.next_action_date,
        na.title AS scheduled_action,
        c.id AS casefile_internal_id,
        c.cfid, c.client_id, c.product_id, c.debt_type_id, c.debt_category_id,
        c.currency_id, c.held_by, c.full_names, c.identification, c.customer_id,
        c.account_number, c.contract_no, c.phones, c.emails, c.amount, 
        c.principal_amount, c.arrears, c.status AS case_status,
        c.created_at AS case_created_at, c.updated_at AS case_updated_at,
        CASE WHEN cna.next_action_date < CURDATE() THEN 1 ELSE 0 END AS overdue
      FROM casefile_next_actions cna
      JOIN case_files c ON c.cfid = cna.casefile_id
      JOIN next_actions na ON na.id = cna.next_action_id
      WHERE ${caseCondition}
      ORDER BY cna.next_action_date ASC
    `);

    // --- 2. PTPs with Casefile Details ---
    const [ptps] = await pool.query(`
      SELECT 
        p.id AS ptp_id,
        p.casefile_id,
        p.ptp_date, p.ptp_amount, p.ptp_by, p.ptp_type, p.ptp_status,
        p.affirm_status, p.is_active, p.is_rescheduled,
        c.id AS casefile_internal_id,
        c.cfid, c.client_id, c.product_id, c.debt_type_id, c.debt_category_id,
        c.currency_id, c.held_by, c.full_names, c.identification, c.customer_id,
        c.account_number, c.contract_no, c.phones, c.emails, c.amount, 
        c.principal_amount, c.arrears, c.status AS case_status,
        c.created_at AS case_created_at, c.updated_at AS case_updated_at,
        CASE WHEN p.ptp_date < CURDATE() THEN 1 ELSE 0 END AS overdue
      FROM ptps p
      JOIN case_files c ON c.cfid = p.casefile_id
      WHERE ${caseCondition}
      ORDER BY p.ptp_date ASC
    `);

    // --- Format Next Actions ---
    const nextActionEvents = nextActions.map(a => ({
      type: 'next_action',
      id: a.next_action_record_id,
      casefile_id: a.casefile_id,
      date: a.next_action_date,
      title: a.scheduled_action,
      overdue: a.overdue === 1,
      casefile: {
        id: a.casefile_internal_id,
        cfid: a.cfid,
        client_id: a.client_id,
        product_id: a.product_id,
        debt_type_id: a.debt_type_id,
        debt_category_id: a.debt_category_id,
        currency_id: a.currency_id,
        held_by: a.held_by,
        full_names: a.full_names,
        identification: a.identification,
        customer_id: a.customer_id,
        account_number: a.account_number,
        contract_no: a.contract_no,
        phones: a.phones,
        emails: a.emails,
        amount: a.amount,
        principal_amount: a.principal_amount,
        arrears: a.arrears,
        status: a.case_status,
        created_at: a.case_created_at,
        updated_at: a.case_updated_at
      }
    }));

    // --- Format PTP Events ---
    const ptpEvents = ptps.map(p => ({
      type: 'ptp',
      id: p.ptp_id,
      casefile_id: p.casefile_id,
      date: p.ptp_date,
      title: `PTP - ${p.ptp_amount}`,
      ptp_amount: p.ptp_amount,
      ptp_type: p.ptp_type,
      ptp_status: p.ptp_status,
      affirm_status: p.affirm_status,
      is_active: p.is_active === 1,
      is_rescheduled: p.is_rescheduled === 1,
      overdue: p.overdue === 1,
      casefile: {
        id: p.casefile_internal_id,
        cfid: p.cfid,
        client_id: p.client_id,
        product_id: p.product_id,
        debt_type_id: p.debt_type_id,
        debt_category_id: p.debt_category_id,
        currency_id: p.currency_id,
        held_by: p.held_by,
        full_names: p.full_names,
        identification: p.identification,
        customer_id: p.customer_id,
        account_number: p.account_number,
        contract_no: p.contract_no,
        phones: p.phones,
        emails: p.emails,
        amount: p.amount,
        principal_amount: p.principal_amount,
        arrears: p.arrears,
        status: p.case_status,
        created_at: p.case_created_at,
        updated_at: p.case_updated_at
      }
    }));

    // --- Combine + Sort: Overdue first, then upcoming ---
    const calendarEvents = [...nextActionEvents, ...ptpEvents]
      .sort((a, b) => {
        // Overdue first
        if (a.overdue !== b.overdue) return b.overdue - a.overdue;
        // Then by date ascending
        return new Date(a.date) - new Date(b.date);
      });

    res.json({ calendar: calendarEvents });

  } catch (err) {
    console.error("Error fetching calendar:", err);
    res.status(500).json({ message: "Error fetching calendar data" });
  }
};

exports.getNextCaseFile = async (req, res) => {
  const { currentCaseId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    let query = '';
    let params = [];

    if (userRole === 'staff') {
      query = `
        SELECT cf.id, cf.cfid
        FROM case_files cf
        INNER JOIN casefile_next_actions cna 
          ON cf.cfid = cna.casefile_id
        WHERE cf.held_by = ?
          AND cna.next_action_date <= CURDATE()
          AND cf.cfid > ?
        ORDER BY cf.id ASC
        LIMIT 1
      `;
      params = [userId, currentCaseId];
    } else {
      query = `
        SELECT cf.id, cf.cfid
        FROM case_files cf
        INNER JOIN casefile_next_actions cna 
          ON cf.cfid = cna.casefile_id
        WHERE cna.next_action_date <= CURDATE()
          AND cf.cfid > ?
        ORDER BY cf.id ASC
        LIMIT 1
      `;
      params = [currentCaseId];
    }

    const [rows] = await pool.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ message: "No pending case files available" });
    }

    return res.json({ nextCaseId: rows[0].id, cfid: rows[0].cfid });

  } catch (err) {
    console.error("Error fetching next case file:", err);
    res.status(500).json({ message: "Error fetching next case file" });
  }
};

exports.getTaskList = async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role; // 'staff', 'team_leader', 'admin'

  try {
    let query = `
      SELECT 
        cf.cfid,
        cf.full_names AS debtor_name,
        d.title AS debt_category,
        c.name AS client,
        p.title AS product,
        na.title AS scheduled_action,
        ct.title AS contact_type,
        cs.title AS contact_status,
        cna.next_action_date AS task_date,
        
        -- Balance from payments table
        (cf.amount - COALESCE(SUM(CASE WHEN pay.status = 'confirmed' THEN pay.amount_paid ELSE 0 END), 0)) AS balance,

        -- Days on task list
        DATEDIFF(CURDATE(), cna.next_action_date) AS days_on_tl

      FROM casefile_next_actions cna
      JOIN case_files cf ON cna.casefile_id = cf.cfid
      JOIN next_actions na ON cna.next_action_id = na.id
      JOIN staff u ON cna.staff_id = u.id
      LEFT JOIN clients c ON cf.client_id = c.id
      LEFT JOIN client_products p ON cf.product_id = p.id
      LEFT JOIN debt_categories d ON cf.debt_category_id = d.id
      LEFT JOIN debt_types dt ON cf.debt_type_id = dt.id
      LEFT JOIN payments pay ON cf.cfid = pay.casefile_id
      LEFT JOIN contact_types ct ON ct.id = (SELECT contact_type_id FROM interactions WHERE casefile_id = cf.cfid ORDER BY created_at DESC LIMIT 1)
      LEFT JOIN contact_statuses cs ON cs.id = (SELECT contact_status_id FROM interactions WHERE casefile_id = cf.cfid ORDER BY created_at DESC LIMIT 1)

      WHERE cna.next_action_date <= CURDATE()
    `;

    const params = [];

    // If staff, only show tasks assigned to them
    if (userRole === 'staff') {
      query += ` AND cna.staff_id = ?`;
      params.push(userId);
    }

    query += `
      GROUP BY cf.cfid, cna.next_action_date
      ORDER BY cna.next_action_date ASC
    `;

    const [rows] = await pool.query(query, params);
    return res.json({ tasks: rows });

  } catch (err) {
    console.error("Error fetching task list:", err);
    return res.status(500).json({ message: "Error fetching task list" });
  }
};

exports.allocateCasesV1 = async (req, res) => {
  const { case_ids, user_id } = req.body;
  const userRole = req.user.role;
  if (userRole !== 'admin') {

  }
  if (!Array.isArray(case_ids) || case_ids.length === 0 || !user_id) {
    return res.status(400).json({ message: "Invalid request data" });
  }

  try {
    const [result] = await pool.query(
      `UPDATE case_files SET held_by = ? WHERE cfid IN (?)`,
      [user_id, case_ids]
    );

    return res.json({
      message: `Successfully allocated ${result.affectedRows} case(s)`,
    });
  } catch (err) {
    console.error("Error allocating cases:", err);
    return res.status(500).json({ message: "Error allocating cases" });
  }
};

exports.deleteCasesV1 = async (req, res) => {
  const { case_ids } = req.body;

  if (!Array.isArray(case_ids) || case_ids.length === 0) {
    return res.status(400).json({ message: "Invalid request data" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction(); 

    // Delete from child tables first
    await conn.query(`DELETE FROM payments WHERE casefile_id IN (?)`, [case_ids]);
    await conn.query(`DELETE FROM ptps WHERE casefile_id IN (?)`, [case_ids]);
    await conn.query(`DELETE FROM casefile_interactions WHERE casefile_id IN (?)`, [case_ids]);
    await conn.query(`DELETE FROM casefile_next_actions WHERE casefile_id IN (?)`, [case_ids]); 
    await conn.query(`DELETE FROM casefile_contacts WHERE casefile_id IN (?)`, [case_ids]); 
    await conn.query(`DELETE FROM progress_reports WHERE casefile_id IN (?)`, [case_ids]);
    await conn.query(`DELETE FROM sms_logs WHERE casefile_id IN (?)`, [case_ids]);
    await conn.query(`DELETE FROM mail_logs WHERE casefile_id IN (?)`, [case_ids]);

    // Finally delete case_files
    const [result] = await conn.query(`DELETE FROM case_files WHERE cfid IN (?)`, [case_ids]);

    await conn.commit();
    return res.json({ message: `Deleted ${result.affectedRows} case(s) and all linked data` });
  } catch (err) {
    await conn.rollback();
    console.error("Error deleting cases:", err);
    return res.status(500).json({ message: "Error deleting cases" });
  } finally {
    conn.release();
  }
};

exports.allocateCases = async (req, res) => {
  const { case_ids, user_id } = req.body;
  const userRole = req.user.role; // 'admin', 'team_leader', 'staff'
  const performedBy = req.user.id;

  // Role restriction
  if (userRole === "staff") {
    return res.status(403).json({ message: "Staff are not allowed to allocate cases." });
  }

  if (!Array.isArray(case_ids) || case_ids.length === 0 || !user_id) {
    return res.status(400).json({ message: "Invalid request data" });
  }

  try {
    // First update the case files allocation
    const [result] = await pool.query(
      `UPDATE case_files SET held_by = ? WHERE cfid IN (?)`,
      [user_id, case_ids]
    );

    // Fetch names for logging
    const [[allocatedTo]] = await pool.query(`SELECT first_name, last_name FROM staff WHERE id = ?`, [user_id]);
    const [[allocatedBy]] = await pool.query(`SELECT first_name, last_name FROM staff WHERE id = ?`, [performedBy]);

    const allocatedToName = allocatedTo?.first_name +' '+ allocatedTo?.last_name || "Unknown User";
    const allocatedByName = allocatedBy?.first_name +' '+ allocatedBy?.last_name || "Unknown User";

    // Log interaction for each case file
    for (const caseId of case_ids) {
      await logInteraction({
        casefile_id: caseId,
        created_by: performedBy,
        notes: `Casefile allocated to ${allocatedToName} by ${allocatedByName}`,
      });
    }

    return res.json({
      message: `Successfully allocated ${result.affectedRows} case(s) to ${allocatedToName}`,
    });
  } catch (err) {
    console.error("Error allocating cases:", err);
    return res.status(500).json({ message: "Error allocating cases" });
  }
};

exports.deleteCases = async (req, res) => {
  const { case_ids } = req.body;
  const userRole = req.user.role; // 'admin', 'team_leader', 'staff'

  // Role restriction
  if (userRole === "staff") {
    return res.status(403).json({ message: "Staff are not allowed to delete cases." });
  }

  if (!Array.isArray(case_ids) || case_ids.length === 0) {
    return res.status(400).json({ message: "Invalid request data" });
  }

  const conn = await pool.getConnection();
  try {
    // Safety check: Any confirmed payments?
    const [payments] = await conn.query(
      `SELECT DISTINCT casefile_id FROM payments WHERE casefile_id IN (?) AND status = 'confirmed'`,
      [case_ids]
    );

    if (payments.length > 0) {
      const blockedCases = payments.map(p => p.casefile_id);
      return res.status(400).json({
        message: `Cannot delete case(s) with confirmed payments: ${blockedCases.join(", ")}`
      });
    }

    await conn.beginTransaction();

     // Delete from child tables first
    await conn.query(`DELETE FROM payments WHERE casefile_id IN (?)`, [case_ids]);
    await conn.query(`DELETE FROM ptps WHERE casefile_id IN (?)`, [case_ids]);
    await conn.query(`DELETE FROM casefile_interactions WHERE casefile_id IN (?)`, [case_ids]);
    await conn.query(`DELETE FROM casefile_next_actions WHERE casefile_id IN (?)`, [case_ids]); 
    await conn.query(`DELETE FROM casefile_contacts WHERE casefile_id IN (?)`, [case_ids]); 
    await conn.query(`DELETE FROM progress_reports WHERE casefile_id IN (?)`, [case_ids]);
    await conn.query(`DELETE FROM sms_logs WHERE casefile_id IN (?)`, [case_ids]);
    await conn.query(`DELETE FROM mail_logs WHERE casefile_id IN (?)`, [case_ids]);

    // Finally delete case_files
    const [result] = await conn.query(`DELETE FROM case_files WHERE cfid IN (?)`, [case_ids]);

    await conn.commit();
    return res.json({ message: `Deleted ${result.affectedRows} case(s) and all linked data` });
  } catch (err) {
    await conn.rollback();
    console.error("Error deleting cases:", err);
    return res.status(500).json({ message: "Error deleting cases" });
  } finally {
    conn.release();
  }
};









