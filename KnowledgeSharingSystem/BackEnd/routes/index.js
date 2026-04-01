const express = require('express');
const authRoutes = require('./auth.route');
const categoryRoutes = require('./category.route');
const documentRoutes = require('./document.route');
const notificationRoutes = require('./notification.route');
const pointRoutes = require('./point.route');
const qaSessionRoutes = require('./qa-session.route');
const userRoutes = require('./user.route');

const router = express.Router();

router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is healthy.',
    });
});

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/documents', documentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/points', pointRoutes);
router.use('/qa-sessions', qaSessionRoutes);
router.use('/users', userRoutes);

module.exports = router;
