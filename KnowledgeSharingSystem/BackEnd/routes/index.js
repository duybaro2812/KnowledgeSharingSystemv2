const express = require('express');
const authRoutes = require('./auth.route');
const categoryRoutes = require('./category.route');
const commentRoutes = require('./comment.route');
const documentRoutes = require('./document.route');
const moderationRoutes = require('./moderation.route');
const notificationRoutes = require('./notification.route');
const pointRoutes = require('./point.route');
const qaSessionRoutes = require('./qa-session.route');
const userRoutes = require('./user.route');
const runtimeMetricsService = require('../services/runtime-metrics.service');
const { isConnected, pingDB } = require('../utils/db');

const router = express.Router();

router.get('/health', async (req, res) => {
    const runtime = runtimeMetricsService.getSnapshot();
    let dbReady = false;

    try {
        dbReady = await pingDB();
    } catch (error) {
        dbReady = false;
    }

    const status = dbReady ? 'ok' : 'degraded';

    res.status(dbReady ? 200 : 503).json({
        success: dbReady,
        message: dbReady ? 'API is healthy.' : 'API is running but database is unavailable.',
        data: {
            status,
            db: {
                connected: isConnected(),
                ready: dbReady,
            },
            runtime,
        },
    });
});

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/', commentRoutes);
router.use('/documents', documentRoutes);
router.use('/moderation', moderationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/points', pointRoutes);
router.use('/qa-sessions', qaSessionRoutes);
router.use('/users', userRoutes);

module.exports = router;
