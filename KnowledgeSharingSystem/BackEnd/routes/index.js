const express = require('express');
const authRoutes = require('./auth.route');
const documentRoutes = require('./document.route');
const notificationRoutes = require('./notification.route');
const userRoutes = require('./user.route');

const router = express.Router();

router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is healthy.',
    });
});

router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/users', userRoutes);

module.exports = router;
