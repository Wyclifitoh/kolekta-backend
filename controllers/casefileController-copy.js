const CaseFile = require('../models/casefileModel');
const Interactions = require('../models/interactionsModel');
const PTPs = require('../models/ptpsModel');
const ProgressReports = require('../models/progressModel');
const Payments = require('../models/paymentsModel');
const SMS = require('../services/smsService');
const Mail = require('../services/mailService');
const Contacts = require('../models/contactsModel');

exports.createCaseFile = async (req, res) => {
  try {
    console.log('[CaseFile] Creating new case file...');
    const caseFileData = req.body;
    caseFileData.created_by = req.user.id;
    caseFileData.updated_by = req.user.id;

    const newCaseFile = await CaseFile.create(caseFileData);
    return res.status(201).json({ message: 'Case file created successfully', data: newCaseFile });
  } catch (error) {
    console.error('[CaseFile] Create error:', error);
    return res.status(500).json({ message: 'Failed to create case file', error: error.message });
  }
};

exports.getCaseFileDetails = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[CaseFile] Fetching case file details for ID: ${id}`);
    const caseFile = await CaseFile.findById(id);

    if (!caseFile) return res.status(404).json({ message: 'Case file not found' });

    return res.status(200).json(caseFile);
  } catch (error) {
    console.error('[CaseFile] Get details error:', error);
    return res.status(500).json({ message: 'Failed to fetch case file details', error: error.message });
  }
};

exports.getAllCaseFiles = async (req, res) => {
  try {
    console.log('[CaseFile] Fetching all case files...');
    const filters = req.query; // Optional filters in URL params
    const caseFiles = await CaseFile.findAll(filters);

    return res.status(200).json(caseFiles);
  } catch (error) {
    console.error('[CaseFile] Get all error:', error);
    return res.status(500).json({ message: 'Failed to fetch case files', error: error.message });
  }
};

// Add interaction (NOTES + UPDATE tab)
exports.addInteraction = async (req, res) => {
  try {
    const data = { ...req.body, created_by: req.user.id };
    const newInteraction = await Interactions.create(data);
    return res.status(201).json({ message: 'Interaction logged successfully', data: newInteraction });
  } catch (error) {
    console.error('[Interaction] Add error:', error);
    return res.status(500).json({ message: 'Failed to log interaction', error: error.message });
  }
};

// Get interactions for a case
exports.getInteractionsByCase = async (req, res) => {
  try {
    const { casefile_id } = req.params;
    const interactions = await Interactions.findByCase(casefile_id);
    return res.status(200).json(interactions);
  } catch (error) {
    console.error('[Interaction] Get error:', error);
    return res.status(500).json({ message: 'Failed to fetch interactions', error: error.message });
  }
};

// Add PTP
exports.addPTP = async (req, res) => {
  try {
    const data = { ...req.body, ptp_by: req.user.id };
    const newPTP = await PTPs.create(data);
    return res.status(201).json({ message: 'PTP added successfully', data: newPTP });
  } catch (error) {
    console.error('[PTP] Add error:', error);
    return res.status(500).json({ message: 'Failed to add PTP', error: error.message });
  }
};

// Update PTP status
exports.updatePTP = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedPTP = await PTPs.updateStatus(id, req.body);
    return res.status(200).json({ message: 'PTP updated successfully', data: updatedPTP });
  } catch (error) {
    console.error('[PTP] Update error:', error);
    return res.status(500).json({ message: 'Failed to update PTP', error: error.message });
  }
};

// Reschedule PTP
exports.reschedulePTP = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedPTP = await PTPs.reschedule(id, req.body);
    return res.status(200).json({ message: 'PTP rescheduled successfully', data: updatedPTP });
  } catch (error) {
    console.error('[PTP] Reschedule error:', error);
    return res.status(500).json({ message: 'Failed to reschedule PTP', error: error.message });
  }
};

// Get all PTPs for a case
exports.getPTPsByCase = async (req, res) => {
  try {
    const { casefile_id } = req.params;
    const ptps = await PTPs.findByCase(casefile_id);
    return res.status(200).json(ptps);
  } catch (error) {
    console.error('[PTP] Get error:', error);
    return res.status(500).json({ message: 'Failed to fetch PTPs', error: error.message });
  }
};

// Progress Reports
exports.getProgressReports = async (req, res) => {
  try {
    const { casefile_id } = req.params;
    const reports = await ProgressReports.findByCase(casefile_id);
    return res.status(200).json(reports);
  } catch (error) {
    console.error('[ProgressReports] Error:', error);
    return res.status(500).json({ message: 'Failed to fetch progress reports', error: error.message });
  }
};

// Payments
exports.addPayment = async (req, res) => {
  try {
    const data = { ...req.body, created_by: req.user.id };
    const newPayment = await Payments.create(data);
    return res.status(201).json({ message: 'Payment added successfully', data: newPayment });
  } catch (error) {
    console.error('[Payments] Add error:', error);
    return res.status(500).json({ message: 'Failed to add payment', error: error.message });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const { casefile_id } = req.params;
    const payments = await Payments.findByCase(casefile_id);
    return res.status(200).json(payments);
  } catch (error) {
    console.error('[Payments] Get error:', error);
    return res.status(500).json({ message: 'Failed to fetch payments', error: error.message });
  }
};

// SMS
exports.sendSMS = async (req, res) => {
  try {
    const { casefile_id, phone, message } = req.body;
    await SMS.send(phone, message);
    return res.status(200).json({ message: 'SMS sent successfully' });
  } catch (error) {
    console.error('[SMS] Send error:', error);
    return res.status(500).json({ message: 'Failed to send SMS', error: error.message });
  }
};

// Mail
exports.sendMail = async (req, res) => {
  try {
    const { casefile_id, email, subject, body } = req.body;
    await Mail.send(email, subject, body);
    return res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('[Mail] Send error:', error);
    return res.status(500).json({ message: 'Failed to send email', error: error.message });
  }
};

// Contacts
exports.getContacts = async (req, res) => {
  try {
    const { casefile_id } = req.params;
    const contacts = await Contacts.findByCase(casefile_id);
    return res.status(200).json(contacts);
  } catch (error) {
    console.error('[Contacts] Get error:', error);
    return res.status(500).json({ message: 'Failed to fetch contacts', error: error.message });
  }
};

