const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { isAuthenticated } = require('../middleware/auth');

router.post('/mark-read/:id', isAuthenticated, notificationController.markAsRead);
router.post('/mark-all-read', isAuthenticated, notificationController.markAllAsRead);

module.exports = router;
