const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');
const {  addClient, addDebtCategory, getAllDebtCategory, addDebtType, getAllDebtTypes, addCurrency, getAllCurrencies
} = require('../controllers/appController');
const appController = require('../controllers/appController');



router.post('/add-client', authenticateToken, addClient);   
// Debt Entities
router.post('/add-debt-category', authenticateToken, appController.addDebtCategory);
router.get('/get-debt-categories', authenticateToken, appController.getAllDebtCategory);
router.post('/add-debt-type', authenticateToken, appController.addDebtType);
router.get('/get-debt-types', authenticateToken, appController.getAllDebtTypes);
router.post('/add-currency', authenticateToken, appController.addCurrency);
router.get('/get-currencies', authenticateToken, appController.getAllCurrencies);

// Client Types
router.post('/add-client-type', authenticateToken, appController.addClientType);
router.get('/get-client-types', authenticateToken, appController.getAllClientTypes);

// Debt Sub Types
router.post('/add-debt-sub-type', authenticateToken, appController.addDebtSubType);
router.get('/get-debt-sub-types', authenticateToken, appController.getAllDebtSubTypes);

// Products
router.post('/add-product', authenticateToken, appController.addClientProduct);
router.get('/get-products', authenticateToken, appController.getAllClientProducts);

// Contactability
router.post('/add-contactability', authenticateToken, appController.addContactability);
router.get('/get-contactabilities', authenticateToken, appController.getAllContactability);

// Contact Types
router.post('/add-contact-type', authenticateToken, appController.addContactType);
router.get('/get-contact-types', authenticateToken, appController.getAllContactTypes);

// Contact Statuses
router.post('/add-contact-status', authenticateToken, appController.addContactStatus);
router.get('/get-contact-statuses', authenticateToken, appController.getAllContactStatuses);

// Closure Reasons
router.post('/add-closure-reason', authenticateToken, appController.addClosureReason);
router.get('/get-closure-reasons', authenticateToken, appController.getAllClosureReasons);

// Next Actions
router.post('/add-next-action', authenticateToken, appController.addNextAction);
router.get('/get-next-actions', authenticateToken, appController.getAllNextActions);

// Call Types
router.post('/add-call-type', authenticateToken, appController.addCallType);
router.get('/get-call-types', authenticateToken, appController.getAllCallTypes);

// PTP Reschedule Reasons
router.post('/add-ptp-reschedule-reason', authenticateToken, appController.addPtpRescheduleReason);
router.get('/get-ptp-reschedule-reasons', authenticateToken, appController.getAllPtpRescheduleReasons);

module.exports = router;

