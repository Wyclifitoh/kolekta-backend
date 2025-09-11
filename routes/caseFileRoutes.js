const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const {
  createCaseFile,
  getCaseFileDetails,
  getAllCaseFiles,
  addInteraction,
  getInteractionsByCase,
  addPTP,
  updatePTP,
  reschedulePTP,
  getPTPsByCase,
  getProgressReports,
  addPayment,
  getPayments,
  sendSMS,
  sendMail,
  getContacts
} = require('../controllers/casefileController');


// router.post('/', authenticateToken, createCaseFile);
// router.get('/', authenticateToken, getAllCaseFiles);
// router.get('/:id', authenticateToken, getCaseFileDetails);

// Interactions
router.post('/interactions', authenticateToken, addInteraction);
// router.get('/interactions/:casefile_id', authenticateToken, getInteractionsByCase);

// PTPs
router.post('/ptp', authenticateToken, addPTP);
// router.put('/ptp/:id', authenticateToken, updatePTP);
router.put('/ptp/:id/reschedule', authenticateToken, reschedulePTP);
// router.get('/ptp/:casefile_id', authenticateToken, getPTPsByCase);

// Progress Reports
// router.get('/progress/:casefile_id', authenticateToken, getProgressReports);

// Payments
router.post('/payments', authenticateToken, addPayment);
// router.get('/payments/:casefile_id', authenticateToken, getPayments);

// SMS
router.post('/sms', authenticateToken, sendSMS);

// Mail
router.post('/mail', authenticateToken, sendMail);

// Contacts
// router.get('/contacts/:casefile_id', authenticateToken, getContacts);

module.exports = router;
