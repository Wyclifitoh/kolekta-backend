const CaseFile = require('../models/casefileModel');
const Interactions = require('../models/interactionsModel');
const PTPs = require('../models/ptpsModel');
const ProgressReports = require('../models/progressModel');
const Payments = require('../models/paymentsModel');
const SMS = require('../services/smsService');
const Mail = require('../services/mailService');
const Contacts = require('../models/contactsModel');
const { logInteraction } = require('../helpers/casefileInteractions');

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

//  Add Interaction (UPDATE Tab)
exports.addInteraction = async (req, res) => {
  try {
    const data = { ...req.body, created_by: req.user.id };
    const newInteraction = await Interactions.create(data);

    await logInteraction({
      casefile_id: data.casefile_id,
      created_by: req.user.id,
      notes: data.notes,
      contact_type_id: data.contact_type_id,
      contact_status_id: data.contact_status_id,
      call_type_id: data.call_type_id,
      next_action_id: data.next_action_id,
      next_action_date: data.next_action_date
    });

    return res.status(201).json({ message: 'Interaction logged successfully', data: newInteraction });
  } catch (error) {
    console.error('[Interaction] Add error:', error);
    return res.status(500).json({ message: 'Failed to log interaction', error: error.message });
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
exports.reschedulePTP = async (req, res) => {
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
      notes: `Payment of ${data.amount_paid} recorded on ${data.date_paid}`
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
