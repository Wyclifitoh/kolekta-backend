const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const {
  addInteraction,
  reschedulePTP,
  addPTP,
  addPayment,
  sendSMS,
  sendMail} = require('../controllers/casefileController');


// Interactions
router.post('/interactions', authenticateToken, addInteraction); 

// PTPs
router.post('/ptp', authenticateToken, addPTP); 
router.put('/ptp/reschedule', authenticateToken, reschedulePTP);

// Payments
router.post('/payments', authenticateToken, addPayment);

// SMS
router.post('/sms', authenticateToken, sendSMS);

// Mail
router.post('/mail', authenticateToken, sendMail);

// Contacts
// router.get('/contacts/:casefile_id', authenticateToken, getContacts);

module.exports = router;
