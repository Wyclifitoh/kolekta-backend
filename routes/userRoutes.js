const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');
const {
  createStaff,
  getAllStaff,
  uploadCaseFile,
  getAllCaseFiles,
  getCaseInteractions,
  getCaseFileByID,
  getNotesByCaseFile,
  addNote,
  getCasefileContacts,
  addCaseFileContact,
  getPhoneContacts,
  addPhoneContact,
  getProgressReports,
  addProgressReport,
  getSmsData,
  addSms,
  getPTPData,
  addPTP,
  getPayments,
  getPendingPayments,
  addPayment,
  getCallTypes,
  addCallType,
  getContactTypes,
  addContactType,
  getContactStatuses,
  addContactStatus,
  getNextActions,
  getSMSTemplates
} = require('../controllers/userController');

  
// === Staff & Case Files ===
router.post('/staff', authenticateToken, createStaff);
router.get('/staff', authenticateToken, getAllStaff);
router.post('/upload-case-file', authenticateToken, upload.single('file'), uploadCaseFile);
router.get('/casefile', authenticateToken, getCaseFileByID); 

router.get('/case-files', authenticateToken, getAllCaseFiles);
router.get('/logs', authenticateToken, getCaseInteractions);

// === Notes ===
router.get('/case-file/notes/:cfid', authenticateToken, getNotesByCaseFile);
router.post('/case-file/notes', authenticateToken, addNote);

// === Phone Contacts ===
router.get('/case-file/contacts/:cfid', authenticateToken, getPhoneContacts);
router.post('/case-file/contacts', authenticateToken, addPhoneContact);

// === Progress ===
router.get('/casefile/progress', authenticateToken, getProgressReports);
router.post('/casefile/progress', authenticateToken, addProgressReport);

// === Contacts === 
router.get('/casefile/contacts', authenticateToken, getCasefileContacts); 
router.post('/casefile/contact', authenticateToken, addCaseFileContact);

// === SMS ===
router.get('/case-file/sms-data/:cfid', authenticateToken, getSmsData);
router.post('/case-file/sms', authenticateToken, addSms);

// === Promise to Pay (PTP) ===
router.get('/casefile/ptp', authenticateToken, getPTPData);
router.post('/casefile/ptp', authenticateToken, addPTP);

// === Payments ===
router.get('/casefile/payments', authenticateToken, getPayments);
router.get('/casefile/payments/pending', authenticateToken, getPendingPayments);
router.post('/casefile/payments', authenticateToken, addPayment);

// === Reference Lookups ===
router.get('/call-types', authenticateToken, getCallTypes);
router.post('/call-types', authenticateToken, addCallType);

router.get('/contact-types', authenticateToken, getContactTypes);
router.post('/contact-types', authenticateToken, addContactType);

router.get('/contact-statuses', authenticateToken, getContactStatuses);
router.post('/contact-statuses', authenticateToken, addContactStatus); 

router.get('/next-actions', authenticateToken, getNextActions);  
// router.post('/contact-statuses', authenticateToken, addContactStatus); 

router.get('/sms-templates', authenticateToken, getSMSTemplates); 
// router.post('/sms-templates', authenticateToken, addContactStatus); 

module.exports = router;
