const Staff = require("../models/User");
const bcrypt = require("bcryptjs");
const moment = require("moment");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const validator = require("validator");
const generateUid = require("../utils/utils");
const xlsx = require("xlsx");
const path = require("path");
const pool = require("../config/db");
const fs = require("fs");
const { logInteraction } = require("../helpers/casefileInteractions");

exports.createStaff = async (req, res) => {
  const {
    first_name,
    last_name,
    email_address,
    phone_number,
    dialing_id,
    role,
    permission,
    password,
  } = req.body;

  if (
    !first_name ||
    !last_name ||
    !email_address ||
    !phone_number ||
    !role ||
    !password
  ) {
    return res
      .status(400)
      .json({ message: "All required fields must be provided" });
  }

  try {
    // Check if user with this email already exists
    const existingStaff = await Staff.findByEmail(email_address);
    if (existingStaff) {
      return res.status(409).json({ message: "Email already exists" });
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
      password: hashedPassword,
    });

    res
      .status(201)
      .json({ message: "Staff created successfully", staffId: newStaff.id });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: `Error creating staff`, error: error.message });
  }
};

exports.getAllStaff = async (req, res) => {
  try {
    const staffList = await Staff.findAllStaff();
    res.status(200).json({ staff: staffList });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `Error fetching staff: ${error.message}` });
  }
};

exports.updateStaff = async (req, res) => {
  const { id } = req.params;
  const {
    first_name,
    last_name,
    email_address,
    phone_number,
    dialing_id,
    role,
    permission,
    password,
  } = req.body;

  try {
    // Check if staff exists
    const existingStaff = await Staff.findStaffById(id);
    if (!existingStaff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    // Prepare update data
    const updateData = {};
    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (email_address) updateData.email_address = email_address;
    if (phone_number) updateData.phone_number = phone_number;
    if (dialing_id !== undefined) updateData.dialing_id = dialing_id;
    if (role) updateData.role = role;
    if (permission) updateData.permission = permission;
    if (password) updateData.password = password;

    // Update staff
    const result = await Staff.updateStaff(id, updateData);

    if (result.affectedRows === 0) {
      return res
        .status(400)
        .json({ message: "No changes made or staff not found" });
    }

    res.status(200).json({
      message: "Staff updated successfully",
      staffId: id,
    });
  } catch (error) {
    console.error(error);
    if (error.message === "Email already exists") {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({
      message: `Error updating staff: ${error.message}`,
    });
  }
};

exports.deleteStaff = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if staff exists
    const existingStaff = await Staff.findStaffById(id);
    if (!existingStaff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    // Optional: Prevent deletion of admin or own account
    const currentUserId = req.user.id; // Assuming you have user info in req.user
    if (parseInt(id) === parseInt(currentUserId)) {
      return res
        .status(400)
        .json({ message: "Cannot delete your own account" });
    }

    if (existingStaff.role === "admin") {
      return res.status(400).json({ message: "Cannot delete admin accounts" });
    }

    // Delete staff
    const result = await Staff.deleteStaff(id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    res.status(200).json({
      message: "Staff deleted successfully",
      staffId: id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `Error deleting staff: ${error.message}`,
    });
  }
};

exports.toggleStaffStatus = async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  if (typeof is_active !== "boolean") {
    return res
      .status(400)
      .json({ message: "is_active must be a boolean value" });
  }

  try {
    // Check if staff exists
    const existingStaff = await Staff.findStaffById(id);
    if (!existingStaff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    // Prevent self-deactivation
    const currentUserId = req.user.id;
    if (parseInt(id) === parseInt(currentUserId) && !is_active) {
      return res
        .status(400)
        .json({ message: "Cannot deactivate your own account" });
    }

    // Toggle status
    const result = await Staff.toggleStaffStatus(id, is_active);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    res.status(200).json({
      message: `Staff ${is_active ? "activated" : "deactivated"} successfully`,
      staffId: id,
      is_active: is_active,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `Error updating staff status: ${error.message}`,
    });
  }
};

exports.getStaffById = async (req, res) => {
  const { id } = req.params;

  try {
    const staff = await Staff.findStaffById(id);

    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    // Remove sensitive information
    const { password, ...staffWithoutPassword } = staff;

    res.status(200).json({
      staff: staffWithoutPassword,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `Error fetching staff details: ${error.message}`,
    });
  }
};

exports.uploadCaseFileV1 = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const {
      client_id,
      product_id,
      debt_category_id,
      debt_type_id,
      debt_sub_type_id,
      currency_id,
      batch_no,
      user_id, // for created_by
    } = req.body;

    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file uploaded" });

    const outsource_date = moment().format("YYYY-MM-DD");

    // Read Excel
    const workbook = xlsx.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Get latest CFID
    const latestFile = await Staff.findLatestFileId();
    let nextCFID = latestFile && latestFile.cfid ? latestFile.cfid + 1 : 1000;

    const caseRecords = data.map((row) => ({
      client_id,
      product_id,
      debt_category_id,
      debt_type_id,
      debt_sub_type_id,
      currency_id,
      cfid: nextCFID++,
      batch_no,
      full_names: row.full_names || "",
      identification: row.identification || "",
      customer_id: row.customer_id || "",
      account_number: row.account_number || "",
      contract_no: row.contract_no || "",
      phones: row.phones || "",
      emails: row.emails || "",
      physical_address: row.physical_address || "",
      postal_address: row.postal_address || "",
      branch: row.branch || "",
      employer_and_address: row.employer_and_address || "",
      nok_full_names: row.nok_full_names || "",
      nok_relationship: row.nok_relationship || "",
      nok_phones: row.nok_phones || "",
      nok_address: row.nok_address || "",
      nok_emails: row.nok_emails || "",
      gua_full_names: row.gua_full_names || "",
      gua_phones: row.gua_phones || "",
      gua_emails: row.gua_emails || "",
      gua_address: row.gua_address || "",
      amount: row.amount || 0,
      principal_amount: row.principal_amount || 0,
      amount_repaid: row.amount_repaid || 0,
      arrears: row.arrears || 0,
      loan_taken_date: row.loan_taken_date
        ? moment(row.loan_taken_date).toDate()
        : null,
      loan_due_date: row.loan_due_date
        ? moment(row.loan_due_date).toDate()
        : null,
      dpd: row.dpd || 0,
      last_paid_amount: row.last_paid_amount || 0,
      last_paid_date: row.last_paid_date
        ? moment(row.last_paid_date).toDate()
        : null,
      loan_counter: row.loan_counter || 0,
      risk_category: row.risk_category || "",
      status: "active",
      outsource_date,
      days_since_outsource: 0,
      created_by: user_id,
      updated_by: user_id,
    }));

    await connection.beginTransaction();
    await Staff.caseFileBulkInsert(connection, caseRecords);
    await connection.commit();

    fs.unlinkSync(file.path);

    res.status(200).json({ message: "Case file uploaded successfully" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "Upload failed", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.uploadCaseFile = async (req, res) => {
  let connection;
  try {
    console.log("[Upload] Starting uploadCaseFile..."); // Debug log start
    connection = await pool.getConnection();
    console.log("[DB] Database connection established.");
    const user_id = req.user.id;
    const debt_sub_type_id = 1;
    const {
      client_id,
      product_id,
      debt_category_id,
      debt_type_id,
      currency_id,
      batch_no,
    } = req.body;

    console.log("[Request Body]", {
      client_id,
      product_id,
      debt_category_id,
      debt_type_id,
      debt_sub_type_id,
      currency_id,
      batch_no,
      user_id,
    });

    const file = req.file;
    if (!file) {
      console.error("[Upload] No file uploaded.");
      return res.status(400).json({ message: "No file uploaded" });
    }
    console.log("[Upload] File received:", file.originalname);

    const outsource_date = moment().format("YYYY-MM-DD");

    // Read Excel
    const workbook = xlsx.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    console.log("[Excel] Sheet found:", sheetName);

    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log(`[Excel] Rows found: ${data.length}`);

    // Get latest CFID
    const latestFile = await Staff.findLatestFileId();
    let nextCFID = latestFile && latestFile.cfid ? latestFile.cfid + 1 : 1000;
    console.log(`[CFID] Starting CFID: ${nextCFID}`);

    const caseRecords = data.map((row, index) => ({
      client_id,
      product_id,
      debt_category_id,
      debt_type_id,
      debt_sub_type_id: debt_sub_type_id || null,
      currency_id,
      cfid: nextCFID++,
      batch_no,
      full_names: row.full_names || "",
      identification: row.identification || "",
      customer_id: row.customer_id || "",
      account_number: row.account_number || "",
      contract_no: row.contract_no || "",
      phones: row.phones || "",
      emails: row.emails || "",
      physical_address: row.physical_address || "",
      postal_address: row.postal_address || "",
      branch: row.branch || "",
      employer_and_address: row.employer_and_address || "",
      nok_full_names: row.nok_full_names || "",
      nok_relationship: row.nok_relationship || "",
      nok_phones: row.nok_phones || "",
      nok_address: row.nok_address || "",
      nok_emails: row.nok_emails || "",
      gua_full_names: row.gua_full_names || "",
      gua_phones: row.gua_phones || "",
      gua_emails: row.gua_emails || "",
      gua_address: row.gua_address || "",
      amount: row.amount || 0,
      principal_amount: row.principal_amount || 0,
      amount_repaid: row.amount_repaid || 0,
      arrears: row.arrears || 0,
      loan_taken_date: row.loan_taken_date
        ? moment(row.loan_taken_date).toDate()
        : null,
      loan_due_date: row.loan_due_date
        ? moment(row.loan_due_date).toDate()
        : null,
      dpd: row.dpd || 0,
      last_paid_amount: row.last_paid_amount || 0,
      last_paid_date: row.last_paid_date
        ? moment(row.last_paid_date).toDate()
        : null,
      loan_counter: row.loan_counter || 0,
      risk_category: row.risk_category || "",
      status: "active",
      outsource_date,
      days_since_outsource: 0,
      created_by: user_id,
      updated_by: user_id,
    }));

    console.log(
      `[Processing] Prepared ${caseRecords.length} records for insert.`
    );

    await connection.beginTransaction();
    console.log("[DB] Transaction started.");

    await Staff.caseFileBulkInsert(connection, caseRecords);
    console.log("[DB] Bulk insert successful.");

    await connection.commit();
    console.log("[DB] Transaction committed.");

    fs.unlinkSync(file.path);
    console.log("[Cleanup] Temporary file deleted.");

    res.status(200).json({ message: "Case file uploaded successfully" });
  } catch (error) {
    if (connection) {
      console.error("[DB] Rolling back transaction due to error.");
      await connection.rollback();
    }
    console.error("[Error] Upload failed:", error);
    res.status(500).json({ message: "Upload failed", error: error.message });
  } finally {
    if (connection) {
      connection.release();
      console.log("[DB] Connection released.");
    }
  }
};

exports.getAllCaseFiles = async (req, res) => {
  try {
    const {
      client_id,
      product_id,
      debt_category_id,
      debt_type_id,
      currency_id,
      status,
      held_by,
      startDate,
      endDate,
      searchTerm,
      limit = 50,
      page = 1,
      sortBy = "cfid",
      order = "DESC",
    } = req.query;

    const pageInt = parseInt(page, 10);
    const limitInt = Math.min(parseInt(limit, 10), 100);
    const offset = (pageInt - 1) * limitInt;

    const filters = {
      client_id,
      product_id,
      debt_category_id,
      debt_type_id,
      currency_id,
      status,
      held_by,
      startDate,
      endDate,
      searchTerm,
      limit: limitInt,
      offset,
      sortBy,
      order,
    };

    const files = await Staff.findAll(filters);

    res.status(200).json({
      files,
      page: pageInt,
      limit: limitInt,
      count: files.length,
    });
  } catch (error) {
    console.error("[getAllCaseFiles] Error:", error);
    res.status(500).json({ message: "Server error fetching case files" });
  }
};

exports.getCaseInteractions = async (req, res) => {
  try {
    const { cfid } = req.query;

    const query = `
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
      WHERE ci.casefile_id = ?
      ORDER BY ci.date_created DESC
    `;

    const [logs] = await pool.query(query, [cfid]);
    res.status(200).json({ logs });
  } catch (error) {
    console.error("[Interactions] Fetch error:", error);
    return res.status(500).json({
      message: "Failed to fetch case interactions",
      error: error.message,
    });
  }
};

exports.getCaseFileByID = async (req, res) => {
  const { cfid } = req.query;

  try {
    const file = await Staff.findCaseFileByID(cfid);

    if (!file) {
      return res.status(404).json({ message: "Case file not found" });
    }

    res.status(200).json({ file });
  } catch (error) {
    console.error("Error fetching case file by ID:", error);
    res.status(500).json({ message: "Server error fetching case file" });
  }
};

// GET all notes for a case file
exports.getNotesByCaseFile = async (req, res) => {
  const { cfid } = req.params;

  try {
    const [notes] = await pool.query(
      `
      SELECT 
        cn.id,
        cn.cfid,
        cn.note_text,
        cn.note_date,
        cn.note_type,
        cn.next_action,
        cn.next_action_date,
        cn.call_type_id,
        cn.contact_type_id,
        cn.contact_status_id,
        cn.created_by,
        cn.created_at,
        ct.title AS call_type,
        ctt.title AS contact_type,
        cs.title AS contact_status
      FROM case_notes cn
      LEFT JOIN call_types ct ON cn.call_type_id = ct.id
      LEFT JOIN contact_types ctt ON cn.contact_type_id = ctt.id
      LEFT JOIN contact_statuses cs ON cn.contact_status_id = cs.id
      WHERE cn.cfid = ?
      ORDER BY cn.created_at DESC
    `,
      [cfid]
    );

    res.status(200).json({ notes });
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({ message: "Server error fetching notes" });
  }
};

// POST a new note
exports.addNoteV1 = async (req, res) => {
  const {
    cfid,
    notes,
    note_date,
    call_type_id,
    contact_type_id,
    contact_status_id,
    created_by,
  } = req.body;
  try {
    await pool.query(
      `
      INSERT INTO case_notes (cfid, note_text, note_date, call_type_id, contact_type_id, contact_status_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        cfid,
        notes,
        note_date,
        call_type_id,
        contact_type_id,
        contact_status_id,
        created_by,
      ]
    );

    res.status(201).json({ message: "Note added successfully" });
  } catch (error) {
    console.error("Error adding note:", error);
    res.status(500).json({ message: "Server error adding note" });
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
    full_final,
  } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check if the contact status means "Promise To Pay"
    const [statusRes] = await connection.query(
      `SELECT title FROM contact_statuses WHERE id = ? LIMIT 1`,
      [contact_status_id]
    );
    const contactStatusName = statusRes[0]?.title;

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
        created_by || null,
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
          ptp_status || "Pending",
          full_final || "No",
        ]
      );
    }

    await connection.commit();
    res.status(201).json({
      message:
        "Note saved successfully" +
        (contactStatusName === "Promise To Pay" ? " with PTP" : ""),
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error saving note and/or PTP:", error);
    res.status(500).json({
      message: "Server error saving note and/or PTP",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.getPhoneContacts = async (req, res) => {
  const { cfid } = req.params;
  try {
    const [contacts] = await pool.query(
      `SELECT * FROM phone_contacts WHERE cfid = ?`,
      [cfid]
    );
    res.status(200).json({ contacts });
  } catch (err) {
    console.error("Error fetching phone contacts:", err);
    res.status(500).json({ message: "Server error fetching contacts" });
  }
};

exports.addPhoneContact = async (req, res) => {
  const { cfid, phone, type, status } = req.body;
  try {
    await pool.query(
      `INSERT INTO phone_contacts (cfid, phone, type, status) VALUES (?, ?, ?, ?)`,
      [cfid, phone, type, status]
    );
    res.status(201).json({ message: "Contact added successfully" });
  } catch (err) {
    console.error("Error adding contact:", err);
    res.status(500).json({ message: "Server error adding contact" });
  }
};

exports.getCaseProgress = async (req, res) => {
  const { cfid } = req.params;
  try {
    const [progress] = await pool.query(
      `
      SELECT cp.*, cs.title AS contact_status 
      FROM case_progress cp 
      LEFT JOIN contact_statuses cs ON cp.contact_status_id = cs.id 
      WHERE cp.cfid = ?
      ORDER BY cp.date_updated DESC
    `,
      [cfid]
    );
    res.status(200).json({ progress });
  } catch (err) {
    console.error("Error fetching progress:", err);
    res.status(500).json({ message: "Server error fetching progress" });
  }
};

exports.addProgressReport = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { casefile_id, contact_status_id, report } = req.body;
    const updated_by = req.user.id;

    // Insert new progress report
    const [result] = await conn.query(
      `INSERT INTO progress_reports (casefile_id, contact_status_id, report, updated_by) 
       VALUES (?, ?, ?, ?)`,
      [casefile_id, contact_status_id, report, updated_by]
    );

    const newInteraction = await logInteraction(
      {
        casefile_id,
        created_by: updated_by,
        notes: report,
        contact_status_id,
      },
      conn
    );

    // Fetch full details for the newly created report
    const [newReport] = await conn.query(
      `SELECT pr.id, pr.report, pr.created_at, cs.title AS contact_status, u.first_name AS updated_by
       FROM progress_reports pr
       LEFT JOIN contact_statuses cs ON pr.contact_status_id = cs.id
       LEFT JOIN staff u ON pr.updated_by = u.id
       WHERE pr.id = ?`,
      [result.insertId]
    );

    return res.status(201).json(newReport[0]);
  } catch (error) {
    console.error("[Progress] Add error:", error);
    return res
      .status(500)
      .json({ message: "Failed to add progress report", error: error.message });
  } finally {
    conn.release();
  }
};

exports.getSmsData = async (req, res) => {
  const { cfid } = req.params;
  try {
    const [sms] = await pool.query(
      `SELECT * FROM case_sms WHERE cfid = ? ORDER BY date_sent DESC`,
      [cfid]
    );
    res.status(200).json({ sms });
  } catch (err) {
    console.error("Error fetching SMS:", err);
    res.status(500).json({ message: "Server error fetching SMS" });
  }
};

exports.addSms = async (req, res) => {
  const { cfid, message, date, status, sent_by } = req.body;
  try {
    await pool.query(
      `INSERT INTO case_sms (cfid, message, date, status, sent_by) VALUES (?, ?, ?, ?, ?)`,
      [cfid, message, date, status, sent_by]
    );
    res.status(201).json({ message: "SMS saved successfully" });
  } catch (err) {
    console.error("Error adding SMS:", err);
    res.status(500).json({ message: "Server error adding SMS" });
  }
};

exports.getPTPData = async (req, res) => {
  const { cfid } = req.query;
  try {
    const query = `
      SELECT 
        p.id,
        p.ptp_date,
        p.ptp_amount,
        p.ptp_type,
        p.ptp_status,
        p.affirm_status,
        p.is_active,
        p.created_at,
        u.first_name AS ptp_by_name
      FROM ptps p
      LEFT JOIN staff u ON p.ptp_by = u.id
      WHERE p.casefile_id = ?
      ORDER BY p.created_at DESC
    `;

    const [ptps] = await pool.query(query, [cfid]);

    res.status(200).json({ ptps });
  } catch (err) {
    console.error("Error fetching PTPs:", err);
    res.status(500).json({ message: "Server error fetching PTPs" });
  }
};

exports.addPTP = async (req, res) => {
  const {
    cfid,
    ptp_date,
    ptp_amount,
    ptp_by,
    ptp_type,
    ptp_status,
    affirm_status,
  } = req.body;
  try {
    await pool.query(
      `
      INSERT INTO promise_to_pay (cfid, ptp_date, ptp_amount, ptp_by, ptp_type, ptp_status, affirm_status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [cfid, ptp_date, ptp_amount, ptp_by, ptp_type, ptp_status, affirm_status]
    );

    res.status(201).json({ message: "PTP added successfully" });
  } catch (err) {
    console.error("Error adding PTP:", err);
    res.status(500).json({ message: "Server error adding PTP" });
  }
};

exports.getPaymentsData = async (req, res) => {
  const { cfid } = req.params;
  try {
    const [payments] = await pool.query(
      `SELECT * FROM case_payments WHERE cfid = ? ORDER BY payment_date DESC`,
      [cfid]
    );
    res.status(200).json({ payments });
  } catch (err) {
    console.error("Error fetching payments:", err);
    res.status(500).json({ message: "Server error fetching payments" });
  }
};

exports.getCallTypes = async (req, res) => {
  try {
    const [callTypes] = await pool.query(
      `SELECT * FROM call_types ORDER BY id DESC`
    );
    res.status(200).json({ callTypes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch call types" });
  }
};

exports.addCallType = async (req, res) => {
  const { title } = req.body;
  try {
    await pool.query(`INSERT INTO call_types (title) VALUES (?)`, [title]);
    res.status(201).json({ message: "Call type added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add call type" });
  }
};

exports.getContactTypes = async (req, res) => {
  try {
    const [contactTypes] = await pool.query(
      `SELECT * FROM contact_types ORDER BY id DESC`
    );
    res.status(200).json({ contactTypes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch contact types" });
  }
};

exports.addContactType = async (req, res) => {
  const { title } = req.body;
  try {
    await pool.query(`INSERT INTO contact_types (title) VALUES (?)`, [title]);
    res.status(201).json({ message: "Contact type added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add contact type" });
  }
};

exports.getContactStatuses = async (req, res) => {
  try {
    const [contactStatuses] = await pool.query(
      `SELECT * FROM contact_statuses ORDER BY id DESC`
    );
    res.status(200).json({ contactStatuses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch contact statuses" });
  }
};

exports.getNextActions = async (req, res) => {
  try {
    const [nextActions] = await pool.query(
      `SELECT * FROM next_actions ORDER BY id DESC`
    );
    res.status(200).json({ nextActions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch contact statuses" });
  }
};

exports.addContactStatus = async (req, res) => {
  const { title } = req.body;
  try {
    await pool.query(`INSERT INTO contact_statuses (title) VALUES (?)`, [
      title,
    ]);
    res.status(201).json({ message: "Contact status added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add contact status" });
  }
};

exports.getProgressReports = async (req, res) => {
  const { cfid } = req.query;
  try {
    const query = `
      SELECT 
        pr.id,
        pr.report,
        pr.created_at,
        cs.title AS contact_status,
        u.first_name AS updated_by_name
      FROM progress_reports pr
      LEFT JOIN contact_statuses cs ON pr.contact_status_id = cs.id
      LEFT JOIN staff u ON pr.updated_by = u.id
      WHERE pr.casefile_id = ?
      ORDER BY pr.created_at DESC
    `;

    const [progressReports] = await pool.query(query, [cfid]);
    res.status(200).json({ progressReports });
  } catch (err) {
    console.error("Error fetching progress reports:", err);
    res.status(500).json({ message: "Server error fetching progress reports" });
  }
};

exports.addPaymentV1 = async (req, res) => {
  const staff = req.user.id;
  const { cfid, date, amount, channel, reference, comment } = req.body;
  try {
    await pool.query(
      `
      INSERT INTO payments (casefile_id, amount_paid, date_paid, receipt_no, payment_channel, comment, posted_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [cfid, amount, date, reference, channel, comment, staff]
    );

    res.status(201).json({ message: "Payment recorded successfully" });
  } catch (err) {
    console.error("Error adding payment:", err);
    res.status(500).json({ message: "Server error adding payment" });
  }
};

exports.addPayment = async (req, res) => {
  const staff = req.user.id;
  const userRole = req.user.role;
  const { cfid, date, amount, channel, reference, comment } = req.body;

  try {
    const status =
      userRole === "admin" || userRole === "team_leader"
        ? "confirmed"
        : "pending";

    await pool.query(
      `
      INSERT INTO payments 
        (casefile_id, amount_paid, date_paid, receipt_no, payment_channel, comment, posted_by, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [cfid, amount, date, reference, channel, comment, staff, status]
    );

    res.status(201).json({ message: `Payment recorded as ${status}` });
  } catch (err) {
    console.error("Error adding payment:", err);
    res.status(500).json({ message: "Server error adding payment" });
  }
};

// Get confirmed payments
exports.getPayments = async (req, res) => {
  const { cfid } = req.query;
  try {
    const query = `
      SELECT 
        p.id,
        p.amount_paid,
        p.date_paid,
        p.receipt_no,
        p.payment_channel,
        p.comment,
        p.created_at,
        u.first_name AS posted_by_name
      FROM payments p
      LEFT JOIN staff u ON p.posted_by = u.id
      WHERE p.casefile_id = ? AND p.status = 'confirmed'
      ORDER BY p.date_paid DESC
    `;

    const [payments] = await pool.query(query, [cfid]);
    res.status(200).json({ payments });
  } catch (err) {
    console.error("Error fetching confirmed payments:", err);
    res
      .status(500)
      .json({ message: "Server error fetching confirmed payments" });
  }
};

// Get pending payments
exports.getPendingPayments = async (req, res) => {
  const { cfid } = req.query;
  try {
    const query = `
      SELECT 
        p.id,
        p.amount_paid,
        p.date_paid,
        p.receipt_no,
        p.payment_channel,
        p.comment,
        p.created_at,
        u.first_name AS posted_by_name
      FROM payments p
      LEFT JOIN staff u ON p.posted_by = u.id
      WHERE p.casefile_id = ? AND p.status = 'pending'
      ORDER BY p.date_paid DESC
    `;

    const [payments] = await pool.query(query, [cfid]);
    res.status(200).json({ payments });
  } catch (err) {
    console.error("Error fetching pending payments:", err);
    res.status(500).json({ message: "Server error fetching pending payments" });
  }
};

exports.getCasefileContacts = async (req, res) => {
  const { cfid } = req.query;
  try {
    const query = `
      SELECT 
        c.id,
        c.full_name,
        c.relationship,
        c.phones,
        c.emails,
        c.address,
        c.created_at
      FROM casefile_contacts c
      WHERE c.casefile_id = ?
      ORDER BY c.created_at DESC
    `;

    const [contacts] = await pool.query(query, [cfid]);
    res.status(200).json({ contacts });
  } catch (err) {
    console.error("Error fetching contacts:", err);
    res.status(500).json({ message: "Server error fetching contacts" });
  }
};

exports.addCaseFileContact = async (req, res) => {
  const posted_by = req.user.id;
  const {
    casefile_id,
    full_name,
    relationship,
    phones,
    emails,
    address = "",
    isPrimary,
  } = req.body;
  try {
    await pool.query(
      `
      INSERT INTO casefile_contacts (casefile_id, full_name, relationship, phones, emails, address, posted_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [casefile_id, full_name, relationship, phones, emails, address, posted_by]
    );

    res.status(201).json({ message: "Contact added successfully" });
  } catch (err) {
    console.error("Error adding contact:", err);
    res.status(500).json({ message: "Server error adding contact" });
  }
};

exports.getSMSTemplates = async (req, res) => {
  try {
    const query = `
      SELECT 
        st.id,
        st.title,
        st.content,
        c.name AS client_name,
        p.title AS product,
        d.title AS debt_category,
        st.bulk_only,
        u.first_name AS created_by,
        st.created_at
      FROM sms_templates st
      LEFT JOIN clients c ON st.client_id = c.id
      LEFT JOIN client_products p ON st.product_id = p.id
      LEFT JOIN debt_categories d ON st.debt_category_id = d.id
      LEFT JOIN staff u ON st.created_by = u.id
      ORDER BY st.created_at DESC
    `;

    const [templates] = await pool.query(query);
    return res.status(200).json({ templates });
  } catch (error) {
    console.error("[SMS Templates] Fetch error:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch SMS templates", error: error.message });
  }
};
