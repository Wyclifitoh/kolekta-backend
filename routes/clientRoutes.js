const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');
 
const { createClient, getAllClients, getAllClientTypes, createClientType, createClientProduct, 
    getAllClientProducts, getClientProductsByClientId, getDashboardStats } = require('../controllers/clientController');

router.post('/', authenticateToken, createClient);
router.get('/', authenticateToken, getAllClients);
router.post('/client-types', authenticateToken, createClientType);
router.get('/client-types', authenticateToken, getAllClientTypes);
router.post('/client-product', authenticateToken, createClientProduct);
router.get('/client-products', authenticateToken, getAllClientProducts);
router.get('/client-products/:client_id', authenticateToken, getClientProductsByClientId);
router.get('/stats', authenticateToken, getDashboardStats);
module.exports = router;
