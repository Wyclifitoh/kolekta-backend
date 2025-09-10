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
        const [clientResult] = await db.query(
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

            await db.query(
                'INSERT INTO client_contacts (client_id, name, designation, branch_department, phone, email) VALUES ?;',
                [contactValues]
            );
        }

        res.status(200).json({ message: 'Client created successfully', clientID });
    } catch (error) {
        res.status(500).json({ message: `Error creating client: ${error}` });
    }
};


// ---------------------- Debt Categories ----------------------
exports.addDebtCategory = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const newCategory = await App.addDebtCategory({ title,  description });
    return res.status(201).json({ message: 'Debt category added', data: newCategory });
  } catch (error) {
    console.error('Add Debt Category Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllDebtCategory = async (req, res) => {
  try {
    const categories = await App.getAllDebtCategory();
    return res.status(200).json(categories);
  } catch (error) {
    console.error('Get Debt Categories Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ---------------------- Debt Types ----------------------
exports.addDebtType = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ message: 'Name is required' });

    const newType = await App.addDebtType( title, description );
    return res.status(201).json({ message: 'Debt type added', data: newType });
  } catch (error) {
    console.error('Add Debt Type Error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllDebtTypes = async (req, res) => {
  try {
    const types = await App.getAllDebtTypes();
    return res.status(200).json(types);
  } catch (error) {
    console.error('Get Debt Types Error:', error);
    return res.status(500).json({ message: 'Server error' });
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

// ---------- Client Types ----------
exports.addClientType = async (req, res) => {
  const { type, description } = req.body;
  try {
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

exports.getAllClientTypes = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM client_types ORDER BY id DESC`);
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching client types' });
  }
};
 

// ---------- Client Products ----------
exports.addClientProduct = async (req, res) => {
  const { client_id, title, description, general_target, paybill, status } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO client_products (client_id, title, description, general_target, paybill, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [client_id, title, description, general_target, paybill, status || 'active']
    );
    res.status(201).json({ id: result.insertId, client_id, title, description, status });
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
    const [rows] = await pool.query(`SELECT * FROM contact_types ORDER BY id DESC`);
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching contact types' });
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
    const [rows] = await pool.query(`SELECT * FROM contact_statuses ORDER BY id DESC`);
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching contact statuses' });
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