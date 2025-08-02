const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');
const {  addClient
} = require('../controllers/appController');



router.post('/add-client', authenticateToken, addClient);  

module.exports = router;

