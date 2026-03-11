const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const {
  addInteraction,
  reschedulePTP,
  addPTP,
  addPayment,
  sendSMS,
  sendMail,
  getPayments,
  closeCases,
  confirmPayment} = require('../controllers/casefileController');


// Interactions
router.post('/interactions', authenticateToken, addInteraction); 

// PTPs
router.post('/ptp', authenticateToken, addPTP); 
router.put('/ptp/reschedule', authenticateToken, reschedulePTP);

// Payments
router.post('/payments', authenticateToken, addPayment);
router.get('/payments', authenticateToken, getPayments)
router.put('/payments/:id/confirm', authenticateToken, confirmPayment)

// SMS
router.post('/sms', authenticateToken, sendSMS);

// Mail
router.post('/mail', authenticateToken, sendMail);

// Contacts
// router.get('/contacts/:casefile_id', authenticateToken, getContacts);

router.post('/close-cases', authenticateToken, closeCases);

module.exports = router;
