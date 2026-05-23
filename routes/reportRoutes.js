const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { isAuthenticated } = require('../middleware/auth');

router.post('/', isAuthenticated, reportController.postReport);

module.exports = router;
