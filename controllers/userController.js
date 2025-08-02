const Staff = require('../models/User'); 
const bcrypt = require('bcryptjs');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const validator = require('validator');
const generateUid = require('../utils/utils');
const xlsx = require('xlsx');
const path = require('path'); 
const pool = require('../config/db');

exports.createStaff = async (req, res) => {
    const { first_name, last_name, email_address, phone_number, dialing_id, role, permission, password } = req.body;

    if (!first_name || !last_name || !email_address || !phone_number || !role || !password) {
        return res.status(400).json({ message: 'All required fields must be provided' });
    }

    try {
        // Check if user with this email already exists
        const existingStaff = await Staff.findByEmail(email_address);
        if (existingStaff) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        const latestStaff = await Staff.findLatestStaffId();
        let newStaffId = 1000;  

        if (latestStaff && latestStaff.staff_id) {
            newStaffId = latestStaff.staff_id + 1;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the staff user
        const newStaff = await Staff.createStaff({
            staff_id: newStaffId,
            first_name,
            last_name,
            email_address,
            phone_number,
            dialing_id,
            role,
            permission: JSON.stringify(permission), 
            password: hashedPassword
        });

        res.status(201).json({ message: 'Staff created successfully', staffId: newStaff.id });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: `Error creating staff`, error: error.message });
    }
};

exports.getAllStaff = async (req, res) => {
    try {
        const staffList = await Staff.findAllStaff();
        res.status(200).json({staff: staffList});
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: `Error fetching staff: ${error.message}` });
    }
};

exports.uploadCaseFile = async (req, res) => {
    try {
      const {
        client_id,
        product_id,
        debt_category,
        debt_type,
        currency_id,
        batch_no
      } = req.body;
  
      const file = req.file;
  
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      const dateFormat = 'YYYY-MM-DD';
      let outsource_date = moment().format(dateFormat);
      const workbook = xlsx.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

      const latestFile = await Staff.findLatestFileId();
        let newFileId = 1000;  

        if (latestFile && latestFile.cfid) {
            newFileId = latestFile.cfid + 1;
        }
  
      const caseRecords = data.map(row => ({
        client_id,
        cfid: newFileId,
        product_id,
        debt_category,
        debt_type,
        currency_id,
        batch_no,
        full_names: row.full_names,
        amount: row.amount,
        principal_amount: row.principal_amount,
        amount_repaid: row.amount_repaid,
        arrears: row.arrears,
        account_number: row.account_number,
        contract_no: row.contract_no,
        customer_id: row.customer_id, 
        identification: row.identification,
        phones: row.phones,
        emails: row.emails,
        loan_taken_date: row.loan_taken_date ? new Date(row.loan_taken_date) : null,
        loan_due_date: row.loan_due_date ? new Date(row.loan_due_date) : null,
        dpd: row.dpd,
        last_paid_amount: row.last_paid_amount,
        last_paid_date: row.last_paid_date ? new Date(row.last_paid_date) : null,
        loan_counter: row.loan_counter,
        risk_category: row.risk_category,
        branch: row.branch,
        physical_address: row.physical_address,
        postal_address: row.postal_address,
        employer_and_address: row.employer_and_address,
        nok_full_names: row.nok_full_names,
        nok_relationship: row.nok_relationship,
        nok_phones: row.nok_phones,
        nok_address: row.nok_address,
        nok_emails: row.nok_emails,
        gua_full_names: row.gua_full_names,
        gua_phones: row.gua_phones,
        gua_emails: row.gua_emails,
        gua_address: row.gua_address,
        outsource_date: outsource_date
      }));
  
      // Save all records in bulk
      await Staff.caseFileBulkInsert(caseRecords);
  
      res.status(200).json({ message: 'Case file uploaded and records inserted successfully' });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Upload failed', error: error.message });
    }
  };

exports.getAllCaseFiles = async (req, res) => {
    const { client_id, product_id, debt_category, debt_type, currency_id } = req.query;
  
    try {
      const files = await Staff.findAll({ client_id, product_id, debt_category, debt_type, currency_id });
      res.status(200).json({files});
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error fetching case files' });
    }
  };

exports.getCaseFileByID = async (req, res) => {
  const { cfid } = req.query;

  try {
    const file = await Staff.findCaseFileByID(cfid);

    if (!file) {
      return res.status(404).json({ message: 'Case file not found' });
    }

    res.status(200).json({ file });
  } catch (error) {
    console.error('Error fetching case file by ID:', error);
    res.status(500).json({ message: 'Server error fetching case file' });
  }
};

// GET all notes for a case file
exports.getNotesByCaseFile = async (req, res) => {
  const { cfid } = req.params;
  try {
    const [notes] = await pool.query(`
      SELECT cn.*, 
             ct.title AS call_type,
             ctt.title AS contact_type,
             cs.title AS contact_status
      FROM case_notes cn
      LEFT JOIN call_types ct ON cn.call_type_id = ct.id
      LEFT JOIN contact_types ctt ON cn.contact_type_id = ctt.id
      LEFT JOIN contact_statuses cs ON cn.contact_status_id = cs.id
      WHERE cn.cfid = ?
      ORDER BY cn.created_at DESC
    `, [cfid]);

    res.status(200).json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ message: 'Server error fetching notes' });
  }
};

// POST a new note
exports.addNoteV1 = async (req, res) => {
  const { cfid, notes, note_date, call_type_id, contact_type_id, contact_status_id, created_by } = req.body;
  try {
    await pool.query(`
      INSERT INTO case_notes (cfid, note_text, note_date, call_type_id, contact_type_id, contact_status_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [cfid, notes, note_date, call_type_id, contact_type_id, contact_status_id, created_by]);

    res.status(201).json({ message: 'Note added successfully' });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ message: 'Server error adding note' });
  }
};

exports.addNote = async (req, res) => {
  const {
    cfid,
    notes,
    note_date,
    note_type = "update",
    next_action,
    next_action_date,
    call_type_id,
    contact_type_id,
    contact_status_id,
    created_by,
    ptp_amount,
    ptp_date,
    ptp_by,
    ptp_type,
    ptp_status,
    full_final
  } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check if the contact status means "Promise To Pay"
    const [statusRes] = await connection.query(
      `SELECT name FROM contact_statuses WHERE id = ? LIMIT 1`,
      [contact_status_id]
    );
    const contactStatusName = statusRes[0]?.name;

    // Insert into case_notes
    const [noteResult] = await connection.query(
      `
      INSERT INTO case_notes (
        cfid,
        note_text,
        note_date,
        note_type,
        next_action,
        next_action_date,
        call_type_id,
        contact_type_id,
        contact_status_id,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        cfid,
        notes,
        note_date || new Date(),
        note_type,
        next_action || null,
        next_action_date || null,
        call_type_id || null,
        contact_type_id || null,
        contact_status_id || null,
        created_by || null
      ]
    );

    // Insert PTP only if status is "Promise To Pay"
    if (contactStatusName === "Promise To Pay") {
      await connection.query(
        `
        INSERT INTO promise_to_pay (
          cfid,
          ptp_date,
          ptp_amount,
          ptp_by,
          ptp_type,
          ptp_status,
          affirm_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          cfid,
          ptp_date || null,
          ptp_amount || 0,
          ptp_by || created_by,
          ptp_type || null,
          ptp_status || 'Pending',
          full_final || 'No'
        ]
      );
    }

    await connection.commit();
    res.status(201).json({ message: "Note saved successfully" + (contactStatusName === "Promise To Pay" ? " with PTP" : "") });
  } catch (error) {
    await connection.rollback();
    console.error("Error saving note and/or PTP:", error);
    res.status(500).json({ message: "Server error saving note and/or PTP", error: error.message });
  } finally {
    connection.release();
  }
};

exports.getPhoneContacts = async (req, res) => {
  const { cfid } = req.params;
  try {
    const [contacts] = await pool.query(`SELECT * FROM phone_contacts WHERE cfid = ?`, [cfid]);
    res.status(200).json({ contacts });
  } catch (err) {
    console.error('Error fetching phone contacts:', err);
    res.status(500).json({ message: 'Server error fetching contacts' });
  }
};

exports.addPhoneContact = async (req, res) => {
  const { cfid, phone, type, status } = req.body;
  try {
    await pool.query(`INSERT INTO phone_contacts (cfid, phone, type, status) VALUES (?, ?, ?, ?)`, [cfid, phone, type, status]);
    res.status(201).json({ message: 'Contact added successfully' });
  } catch (err) {
    console.error('Error adding contact:', err);
    res.status(500).json({ message: 'Server error adding contact' });
  }
};

exports.getCaseProgress = async (req, res) => {
  const { cfid } = req.params;
  try {
    const [progress] = await pool.query(`
      SELECT cp.*, cs.title AS contact_status 
      FROM case_progress cp 
      LEFT JOIN contact_statuses cs ON cp.contact_status_id = cs.id 
      WHERE cp.cfid = ?
      ORDER BY cp.date_updated DESC
    `, [cfid]);
    res.status(200).json({ progress });
  } catch (err) {
    console.error('Error fetching progress:', err);
    res.status(500).json({ message: 'Server error fetching progress' });
  }
};

exports.addCaseProgress = async (req, res) => {
  const { cfid, report, date_updated, contact_status_id, updated_by } = req.body;
  try {
    await pool.query(`INSERT INTO case_progress (cfid, report, date_updated, contact_status_id, updated_by) VALUES (?, ?, ?, ?, ?)`, 
      [cfid, report, date_updated, contact_status_id, updated_by]);
    res.status(201).json({ message: 'Progress added successfully' });
  } catch (err) {
    console.error('Error adding progress:', err);
    res.status(500).json({ message: 'Server error adding progress' });
  }
};

exports.getSmsData = async (req, res) => {
  const { cfid } = req.params;
  try {
    const [sms] = await pool.query(`SELECT * FROM case_sms WHERE cfid = ? ORDER BY date_sent DESC`, [cfid]);
    res.status(200).json({ sms });
  } catch (err) {
    console.error('Error fetching SMS:', err);
    res.status(500).json({ message: 'Server error fetching SMS' });
  }
};

exports.addSms = async (req, res) => {
  const { cfid, message, date, status, sent_by } = req.body;
  try {
    await pool.query(`INSERT INTO case_sms (cfid, message, date, status, sent_by) VALUES (?, ?, ?, ?, ?)`, 
      [cfid, message, date, status, sent_by]);
    res.status(201).json({ message: 'SMS saved successfully' });
  } catch (err) {
    console.error('Error adding SMS:', err);
    res.status(500).json({ message: 'Server error adding SMS' });
  }
};

exports.getPTPData = async (req, res) => {
  const { cfid } = req.params;
  try {
    const [ptps] = await pool.query(`SELECT * FROM promise_to_pay WHERE cfid = ? ORDER BY ptp_date DESC`, [cfid]);
    res.status(200).json({ ptps });
  } catch (err) {
    console.error('Error fetching PTPs:', err);
    res.status(500).json({ message: 'Server error fetching PTPs' });
  }
};

exports.addPTP = async (req, res) => {
  const { cfid, ptp_date, ptp_amount, ptp_by, ptp_type, ptp_status, affirm_status } = req.body;
  try {
    await pool.query(`
      INSERT INTO promise_to_pay (cfid, ptp_date, ptp_amount, ptp_by, ptp_type, ptp_status, affirm_status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [cfid, ptp_date, ptp_amount, ptp_by, ptp_type, ptp_status, affirm_status]);

    res.status(201).json({ message: 'PTP added successfully' });
  } catch (err) {
    console.error('Error adding PTP:', err);
    res.status(500).json({ message: 'Server error adding PTP' });
  }
};

exports.getPaymentsData = async (req, res) => {
  const { cfid } = req.params;
  try {
    const [payments] = await pool.query(`SELECT * FROM case_payments WHERE cfid = ? ORDER BY payment_date DESC`, [cfid]);
    res.status(200).json({ payments });
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ message: 'Server error fetching payments' });
  }
};

exports.addPayment = async (req, res) => {
  const { cfid, date, amount, channel, reference, staff } = req.body;
  try {
    await pool.query(`
      INSERT INTO case_payments (cfid, payment_date, amount, channel, reference, received_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [cfid, date, amount, channel, reference, staff]);

    res.status(201).json({ message: 'Payment recorded successfully' });
  } catch (err) {
    console.error('Error adding payment:', err);
    res.status(500).json({ message: 'Server error adding payment' });
  }
};

exports.getCallTypes = async (req, res) => {
  try {
    const [callTypes] = await pool.query(`SELECT * FROM call_types ORDER BY id DESC`);
    res.status(200).json({ callTypes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch call types' });
  }
};

exports.addCallType = async (req, res) => {
  const { title } = req.body;
  try {
    await pool.query(`INSERT INTO call_types (title) VALUES (?)`, [title]);
    res.status(201).json({ message: 'Call type added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add call type' });
  }
};

exports.getContactTypes = async (req, res) => {
  try {
    const [contactTypes] = await pool.query(`SELECT * FROM contact_types ORDER BY id DESC`);
    res.status(200).json({ contactTypes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch contact types' });
  }
};

exports.addContactType = async (req, res) => {
  const { title } = req.body;
  try {
    await pool.query(`INSERT INTO contact_types (title) VALUES (?)`, [title]);
    res.status(201).json({ message: 'Contact type added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add contact type' });
  }
};

exports.getContactStatuses = async (req, res) => {
  try {
    const [contactStatuses] = await pool.query(`SELECT * FROM contact_statuses ORDER BY id DESC`);
    res.status(200).json({ contactStatuses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch contact statuses' });
  }
};

exports.addContactStatus = async (req, res) => {
  const { title } = req.body;
  try {
    await pool.query(`INSERT INTO contact_statuses (title) VALUES (?)`, [title]);
    res.status(201).json({ message: 'Contact status added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add contact status' });
  }
};

