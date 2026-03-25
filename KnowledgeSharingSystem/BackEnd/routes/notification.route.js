const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const notificationController = require('../controllers/notification.controller');

const router = express.Router();

router.get('/my', authMiddleware, notificationController.getMyNotifications);
router.patch('/:id/read', authMiddleware, notificationController.markNotificationAsRead);

module.exports = router;
