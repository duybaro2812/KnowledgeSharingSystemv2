const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const notificationController = require('../controllers/notification.controller');

const router = express.Router();

router.get('/stream', notificationController.streamNotifications);
router.get('/summary', authMiddleware, notificationController.getMyNotificationSummary);
router.get('/my', authMiddleware, notificationController.getMyNotifications);
router.patch('/read-all', authMiddleware, notificationController.markAllNotificationsAsRead);
router.patch('/:id/read', authMiddleware, notificationController.markNotificationAsRead);

module.exports = router;
