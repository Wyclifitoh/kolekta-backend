const CaseFile = require('../models/casefileModel');
const Interactions = require('../models/interactionsModel');
const PTPs = require('../models/ptpsModel');
const ProgressReports = require('../models/progressModel');
const Payments = require('../models/paymentsModel');
const SMS = require('../services/smsService');
const Mail = require('../services/mailService');
const Contacts = require('../models/contactsModel');
const { logInteraction } = require('../helpers/casefileInteractions');
const pool = require('../config/db');
//  Create Case File
exports.createCaseFile = async (req, res) => {
  try {
    console.log('[CaseFile] Creating new case file...');
    const caseFileData = { ...req.body, created_by: req.user.id, updated_by: req.user.id };
    const newCaseFile = await CaseFile.create(caseFileData);

    await logInteraction({
      casefile_id: newCaseFile.id,
      created_by: req.user.id,
      notes: `Case File ${newCaseFile.cfid} created`
    });

    return res.status(201).json({ message: 'Case file created successfully', data: newCaseFile });
  } catch (error) {
    console.error('[CaseFile] Create error:', error);
    return res.status(500).json({ message: 'Failed to create case file', error: error.message });
  }
};

exports.addInteraction = async (req, res) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const {
      casefile_id,
      contact_type_id,
      contact_status_id,
      call_type_id,
      next_action_id,
      next_action_date,
      notes,
      last_ptp_outcome,
      ptp // optional { amount, date, fullFinal }
    } = req.body;
    const createdBy = req.user.id;

    let newPTP = null;


    // 1. Update/Insert into casefile_next_actions if next action provided
    if (next_action_id && next_action_date) {
      await conn.query(
        `INSERT INTO casefile_next_actions (casefile_id, next_action_id, next_action_date, staff_id, updated_by)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           next_action_id = VALUES(next_action_id),
           next_action_date = VALUES(next_action_date),
           updated_by = VALUES(updated_by),
           updated_at = NOW()`,
        [casefile_id, next_action_id, next_action_date, createdBy, createdBy]
      );
    }

    // 2. If last PTP outcome is provided, update the previous active PTP
    if (last_ptp_outcome) {
      await conn.query(
        `UPDATE ptps 
         SET ptp_status = ?, updated_at = NOW() 
         WHERE casefile_id = ? AND is_active = 1 
         ORDER BY created_at DESC LIMIT 1`,
        [last_ptp_outcome, casefile_id]
      );
    }

    // 3. If PTP is provided, insert it
    if (ptp && ptp.amount && ptp.date) {
      const [result] = await conn.query(
        `INSERT INTO ptps 
          (casefile_id, ptp_date, ptp_amount, ptp_type, ptp_status, affirm_status, is_active, ptp_by, created_at) 
         VALUES (?, ?, ?, ?, 'Not Honoured', 'Not Affirmed', 1, ?, NOW())`,
        [
          casefile_id,
          ptp.date,
          ptp.amount,
          ptp.fullFinal ? 'Full & Final' : 'Normal',
          createdBy
        ]
      );

      const [ptpData] = await conn.query(`SELECT * FROM ptps WHERE id = ?`, [result.insertId]);
      newPTP = ptpData[0];
    }

    // 4. Log Interaction (link PTP if present)
    const newInteraction = await logInteraction({
      casefile_id,
      created_by: createdBy,
      notes,
      contact_type_id,
      contact_status_id,
      call_type_id,
      next_action_id,
      next_action_date,
      ptp_id: newPTP ? newPTP.id : null
    }, conn);

    

    await conn.commit();

    return res.status(201).json({
      message: 'Interaction logged successfully',
      data: { interaction: newInteraction, ptp: newPTP }
    });

  } catch (error) {
    await conn.rollback();
    console.error('[Interaction] Add error:', error);
    return res.status(500).json({ message: 'Failed to log interaction', error: error.message });
  } finally {
    conn.release();
  }
};


exports.reschedulePTP = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { ptpId } = req.query;
    const { casefile_id, newAmount, newDate, nextActionId, nextActionDate, reason } = req.body;
    const createdBy = req.user.id;

    await conn.beginTransaction();

    // Update PTP record with new date and amount
    await conn.query(
      `UPDATE ptps 
       SET new_amount = ?, new_date = ?, is_rescheduled = 1, updated_at = NOW()
       WHERE id = ?`,
      [newAmount, newDate, ptpId]
    );

    // Log interaction for reschedule
    const newInteraction = await logInteraction({
      casefile_id,
      created_by: createdBy,
      notes: reason,  
      next_action_id: nextActionId,
      next_action_date: nextActionDate,
      ptp_id: ptpId
    }, conn); 

    // await logInteraction({
    //   casefile_id: req.body.casefile_id,
    //   created_by: req.user.id,
    //   notes: `PTP Rescheduled: Old Amount ${req.body.old_amount}, New Amount ${req.body.new_amount}, New Date ${req.body.new_date}`
    // });

    await conn.commit();
    return res.status(200).json({ message: "PTP rescheduled successfully" });

  } catch (err) {
    await conn.rollback();
    console.error("[PTP Reschedule] Error:", err);
    return res.status(500).json({ message: "Failed to reschedule PTP" });
  } finally {
    conn.release();
  }
};



//  Add PTP
exports.addPTP = async (req, res) => {
  try {
    const data = { ...req.body, ptp_by: req.user.id };
    const newPTP = await PTPs.create(data);

    await logInteraction({
      casefile_id: data.casefile_id,
      created_by: req.user.id,
      notes: `Debtor promised to pay KES ${data.ptp_amount} on ${data.ptp_date}`,
      ptp_id: newPTP.id,
      contact_status_id: data.contact_status_id,
      call_type_id: data.call_type_id
    });

    return res.status(201).json({ message: 'PTP added successfully', data: newPTP });
  } catch (error) {
    console.error('[PTP] Add error:', error);
    return res.status(500).json({ message: 'Failed to add PTP', error: error.message });
  }
};

//  Reschedule PTP
exports.reschedulePTPV1 = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedPTP = await PTPs.reschedule(id, req.body);

    await logInteraction({
      casefile_id: req.body.casefile_id,
      created_by: req.user.id,
      notes: `PTP Rescheduled: Old Amount ${req.body.old_amount}, New Amount ${req.body.new_amount}, New Date ${req.body.new_date}`
    });

    return res.status(200).json({ message: 'PTP rescheduled successfully', data: updatedPTP });
  } catch (error) {
    console.error('[PTP] Reschedule error:', error);
    return res.status(500).json({ message: 'Failed to reschedule PTP', error: error.message });
  }
};

//  Add Payment
exports.addPayment = async (req, res) => {
  try {
    const data = { ...req.body, posted_by: req.user.id };
    const newPayment = await Payments.create(data);

    await logInteraction({
      casefile_id: data.casefile_id,
      created_by: req.user.id,
      notes: `Payment of Ksh. ${data.amount_paid} recorded on ${data.date_paid}`
    });

    return res.status(201).json({ message: 'Payment added successfully', data: newPayment });
  } catch (error) {
    console.error('[Payments] Add error:', error);
    return res.status(500).json({ message: 'Failed to add payment', error: error.message });
  }
};

//  Send SMS
exports.sendSMS = async (req, res) => {
  try {
    const { casefile_id, phone, message } = req.body;
    await SMS.send(phone, message);

    await logInteraction({
      casefile_id,
      created_by: req.user.id,
      notes: `SMS sent to ${phone}: ${message}`
    });

    return res.status(200).json({ message: 'SMS sent successfully' });
  } catch (error) {
    console.error('[SMS] Send error:', error);
    return res.status(500).json({ message: 'Failed to send SMS', error: error.message });
  }
};

//  Send Email
exports.sendMail = async (req, res) => {
  try {
    const { casefile_id, email, subject, body } = req.body;
    await Mail.send(email, subject, body);

    await logInteraction({
      casefile_id,
      created_by: req.user.id,
      notes: `Email sent to ${email} | Subject: ${subject}`
    });

    return res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('[Mail] Send error:', error);
    return res.status(500).json({ message: 'Failed to send email', error: error.message });
  }
};
