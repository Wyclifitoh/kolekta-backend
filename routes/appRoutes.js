const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');
const {  addClient
} = require('../controllers/appController');
const appController = require('../controllers/appController');



router.post('/add-client', authenticateToken, addClient);   

// Debt Categories
router.post('/add-debt-category', authenticateToken, appController.addDebtCategory);
router.get('/get-debt-categories', authenticateToken, appController.getAllDebtCategory);
router.put('/update-debt-category/:id', authenticateToken, appController.updateDebtCategory);
router.delete('/delete-debt-category/:id', authenticateToken, appController.deleteDebtCategory);



// Debt Types
router.post('/add-debt-type', authenticateToken, appController.addDebtType);
router.get('/get-debt-types', authenticateToken, appController.getAllDebtTypes);
router.put('/update-debt-type/:id', authenticateToken, appController.updateDebtType);
router.delete('/delete-debt-type/:id', authenticateToken, appController.deleteDebtType);


router.post('/add-currency', authenticateToken, appController.addCurrency);
router.get('/get-currencies', authenticateToken, appController.getAllCurrencies);

// Client Types
router.post('/add-client-type', authenticateToken, appController.addClientType);
router.get('/get-client-types', authenticateToken, appController.getAllClientTypes);
router.put('/update-client-type/:id', authenticateToken, appController.updateClientType);
router.delete('/delete-client-type/:id', authenticateToken, appController.deleteClientType);


// Debt Sub Types
router.post('/add-debt-sub-type', authenticateToken, appController.addDebtSubType);
router.get('/get-debt-sub-types', authenticateToken, appController.getAllDebtSubTypes);

// Products
router.post('/add-product', authenticateToken, appController.addClientProduct);
router.get('/get-products', authenticateToken, appController.getAllClientProducts);
router.put('/update-product/:id', authenticateToken, appController.updateClientProduct);
router.delete('/delete-product/:id', authenticateToken, appController.deleteClientProduct);


// Contactability
router.post('/add-contactability', authenticateToken, appController.addContactability);
router.get('/get-contactabilities', authenticateToken, appController.getAllContactability);
router.put('/update-contactability/:id', authenticateToken, appController.updateContactability);
router.delete('/delete-contactability/:id', authenticateToken, appController.deleteContactability);


// Contact Types
router.post('/add-contact-type', authenticateToken, appController.addContactType);
router.get('/get-contact-types', authenticateToken, appController.getAllContactTypes);
router.put('/update-contact-type/:id', authenticateToken, appController.updateContactType);
router.delete('/delete-contact-type/:id', authenticateToken, appController.deleteContactType);


// Contact Statuses
router.post('/add-contact-status', authenticateToken, appController.addContactStatus);
router.get('/get-contact-statuses', authenticateToken, appController.getAllContactStatuses);
router.put('/update-contact-status/:id', authenticateToken, appController.updateContactStatus);
router.delete('/delete-contact-status/:id', authenticateToken, appController.deleteContactStatus);


// Closure Reasons
router.post('/add-closure-reason', authenticateToken, appController.addClosureReason);
router.get('/get-closure-reasons', authenticateToken, appController.getAllClosureReasons);
router.put('/update-closure-reason/:id', authenticateToken, appController.updateClosureReason);
router.delete('/delete-closure-reason/:id', authenticateToken, appController.deleteClosureReason);


// Next Actions
router.post('/add-next-action', authenticateToken, appController.addNextAction);
router.get('/get-next-actions', authenticateToken, appController.getAllNextActions);
router.put('/update-next-action/:id', authenticateToken, appController.updateNextAction);
router.delete('/delete-next-action/:id', authenticateToken, appController.deleteNextAction);



// Call Types
router.post('/add-call-type', authenticateToken, appController.addCallType);
router.get('/get-call-types', authenticateToken, appController.getAllCallTypes);
router.put('/update-call-type/:id', authenticateToken, appController.updateCallType);
router.delete('/delete-call-type/:id', authenticateToken, appController.deleteCallType);


// PTP Reschedule Reasons
router.post('/add-ptp-reschedule-reason', authenticateToken, appController.addPtpRescheduleReason);
router.get('/get-ptp-reschedule-reasons', authenticateToken, appController.getAllPtpRescheduleReasons);
router.put('/update-ptp-reschedule-reason/:id', authenticateToken, appController.updatePtpRescheduleReason);
router.delete('/delete-ptp-reschedule-reason/:id', authenticateToken, appController.deletePtpRescheduleReason);


router.get('/summary', authenticateToken, appController.getSummary);
router.get('/calendar', authenticateToken, appController.getCalendar);
router.get('/cases/next-case/:currentCaseId', authenticateToken, appController.getNextCaseFile);
router.get('/cases/task-list', authenticateToken, appController.getTaskList);



module.exports = router;

