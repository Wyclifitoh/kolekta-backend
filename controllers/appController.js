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


exports.getSummaryV1 = async (req, res) => {
  try {
    const userId = req.user.id; // assuming you set user from auth middleware
    const userRole = req.user.role; // admin, team_leader, staff etc.

    // For staff, we filter case files by held_by
    const caseFilter = (userRole === 'staff') ? `WHERE held_by = ${userId}` : '';

    // For staff, payments should also be linked to only their cases
    const paymentFilter = (userRole === 'staff')
      ? `WHERE p.casefile_id IN (SELECT id FROM case_files WHERE held_by = ${userId})`
      : '';

    // 1. Cases count
    const [cases] = await pool.query(`SELECT COUNT(*) as total FROM case_files ${caseFilter}`);

    // 2. Active staff only for admins/team_leaders
    let activeStaffCount = 0;
    if (userRole !== 'staff') {
      const [activeStaff] = await pool.query(`SELECT COUNT(*) as total FROM staff WHERE is_active = 1`);
      activeStaffCount = activeStaff[0].total;
    }

    // 3. Total recovered
    const [recovered] = await pool.query(`
      SELECT IFNULL(SUM(amount), 0) as total
      FROM payments p
      ${paymentFilter}
      ${paymentFilter ? 'AND' : 'WHERE'} status = "completed"
    `);

    // 4. Overdue cases
    const [overdueCases] = await pool.query(`
      SELECT COUNT(*) as total FROM case_files
      ${caseFilter ? caseFilter + ' AND' : 'WHERE'} loan_due_date < NOW() AND status != "closed"
    `);

    // 5. Today's collections
    const [todaysCollections] = await pool.query(`
      SELECT IFNULL(SUM(amount), 0) as total
      FROM payments p
      ${paymentFilter}
      ${paymentFilter ? 'AND' : 'WHERE'} DATE(created_at)=CURDATE()
    `);

    // 6. Total debt
    const [totalDebt] = await pool.query(`
      SELECT IFNULL(SUM(amount), 0) as total
      FROM case_files
      ${caseFilter}
    `);

    const recoveryRate = totalDebt[0].total > 0
      ? ((recovered[0].total / totalDebt[0].total) * 100).toFixed(2)
      : 0;

    // 7. Staff performance only for admins/team leaders
    let staffPerformance = [];
    if (userRole !== 'staff') {
      [staffPerformance] = await pool.query(`
        SELECT u.first_name, u.last_name, SUM(p.amount) as total
        FROM payments p
        JOIN staff u ON p.user_id = u.id
        WHERE p.status = "completed"
        GROUP BY u.id
        ORDER BY total DESC
        LIMIT 5
      `);
    }

    // 8. Monthly recoveries
    const [monthlyRecoveries] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(amount) as total
      FROM payments p
      ${paymentFilter}
      ${paymentFilter ? 'AND' : 'WHERE'} status = "completed"
      GROUP BY month
      ORDER BY month ASC
    `);

    // 9. Recent activity - filter by staff cases if staff
    const interactionFilter = (userRole === 'staff')
      ? `WHERE ci.casefile_id IN (SELECT id FROM case_files WHERE held_by = ${userId})`
      : '';

    const [interactions] = await pool.query(`
      SELECT 
        ci.id,
        ci.notes,
        ci.date_created AS date,
        u.name AS created_by,
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
      ${interactionFilter}
      ORDER BY ci.date_created DESC
      LIMIT 10
    `);

    const formattedActivity = interactions.map(interaction => ({
      id: interaction.id,
      date: interaction.date,
      created_by: interaction.created_by,
      notes: formatInteractionNotes(interaction)
    }));

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
      SELECT IFNULL(SUM(amount), 0) as total
      FROM payments
      WHERE casefile_id IN (SELECT id FROM case_files ${caseFilter}) AND status = "completed"
    `);

    // Step 5: Overdue Cases
    const [overdueCases] = await pool.query(`
      SELECT COUNT(*) as total FROM case_files
      ${caseFilter} AND loan_due_date < NOW() AND status != "closed"
    `);

    // Step 6: Today's Collections
    const [todaysCollections] = await pool.query(`
      SELECT IFNULL(SUM(amount), 0) as total
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
        SELECT u.first_name, u.last_name, SUM(p.amount) as total
        FROM payments p
        JOIN staff u ON p.user_id = u.id
        WHERE p.status = "completed"
        GROUP BY u.id
        ORDER BY total DESC
        LIMIT 5
      `);
    }

    // Step 9: Monthly Recoveries
    const [monthlyRecoveries] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(amount) as total
      FROM payments
      WHERE casefile_id IN (SELECT id FROM case_files ${caseFilter})
      AND status = "completed"
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



