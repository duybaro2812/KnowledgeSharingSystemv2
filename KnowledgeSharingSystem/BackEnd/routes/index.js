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
const { isConnected, pingDB, isPostgresClient } = require('../utils/db');

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
            dbClient: 'postgres',
            db: {
                connected: isConnected(),
                ready: dbReady,
            },
            runtime,
        },
    });
});

router.use((req, res, next) => {
    if (!isPostgresClient()) {
        next();
        return;
    }

    const requestPath = req.path || '/';
    const method = req.method || 'GET';
    const allowPostgresPhase3Paths = [
        { method: 'GET', test: (path) => path === '/health' },
        { method: 'POST', test: (path) => path === '/auth/login' },
        { method: 'POST', test: (path) => path === '/auth/login/admin' },
        { method: 'POST', test: (path) => path === '/auth/register' },
        { method: 'POST', test: (path) => path === '/auth/register/request-otp' },
        { method: 'POST', test: (path) => path === '/auth/register/verify-otp' },
        { method: 'POST', test: (path) => path === '/auth/forgot-password/request-otp' },
        { method: 'POST', test: (path) => path === '/auth/forgot-password/reset' },
        { method: 'GET', test: (path) => path === '/auth/me' },
        { method: 'GET', test: (path) => path === '/categories' },
        { method: 'POST', test: (path) => path === '/categories' },
        { method: 'GET', test: (path) => path === '/documents' },
        { method: 'GET', test: (path) => path === '/documents/all-uploaded' },
        { method: 'GET', test: (path) => path === '/documents/my-uploaded' },
        { method: 'GET', test: (path) => path === '/documents/pending' },
        { method: 'GET', test: (path) => path === '/documents/reports/pending' },
        { method: 'GET', test: (path) => /^\/documents\/\d+\/reports$/.test(path) },
        { method: 'GET', test: (path) => /^\/documents\/\d+\/plagiarism-check$/.test(path) },
        { method: 'POST', test: (path) => /^\/documents\/\d+\/plagiarism-recheck$/.test(path) },
        { method: 'GET', test: (path) => /^\/documents\/\d+\/check-duplicate$/.test(path) },
        { method: 'PATCH', test: (path) => /^\/documents\/\d+\/review$/.test(path) },
        { method: 'PATCH', test: (path) => /^\/documents\/\d+\/plagiarism-resolution$/.test(path) },
        { method: 'PATCH', test: (path) => /^\/documents\/\d+\/lock$/.test(path) },
        { method: 'PATCH', test: (path) => /^\/documents\/\d+\/unlock$/.test(path) },
        { method: 'DELETE', test: (path) => /^\/documents\/\d+$/.test(path) },
        { method: 'PATCH', test: (path) => /^\/documents\/\d+\/report-resolution$/.test(path) },
        { method: 'GET', test: (path) => /^\/documents\/\d+$/.test(path) },
        { method: 'GET', test: (path) => /^\/documents\/\d+\/preview$/.test(path) },
        { method: 'GET', test: (path) => /^\/documents\/\d+\/preview\/content$/.test(path) },
        { method: 'GET', test: (path) => /^\/documents\/\d+\/access$/.test(path) },
        { method: 'GET', test: (path) => /^\/documents\/\d+\/viewer$/.test(path) },
        { method: 'GET', test: (path) => /^\/documents\/\d+\/viewer\/content$/.test(path) },
        { method: 'POST', test: (path) => /^\/documents\/\d+\/view$/.test(path) },
        { method: 'POST', test: (path) => /^\/documents\/\d+\/download$/.test(path) },
        { method: 'POST', test: (path) => path === '/documents' },
        { method: 'PUT', test: (path) => /^\/documents\/\d+$/.test(path) },
        { method: 'GET', test: (path) => /^\/documents\/\d+\/duplicate-candidates$/.test(path) },
        { method: 'POST', test: (path) => /^\/documents\/\d+\/report$/.test(path) },
        { method: 'GET', test: (path) => /^\/documents\/\d+\/engagement$/.test(path) },
        { method: 'PATCH', test: (path) => /^\/documents\/\d+\/reaction$/.test(path) },
        { method: 'PATCH', test: (path) => /^\/documents\/\d+\/save$/.test(path) },
        { method: 'GET', test: (path) => /^\/documents\/\d+\/comments$/.test(path) },
        { method: 'POST', test: (path) => /^\/documents\/\d+\/comments$/.test(path) },
        { method: 'POST', test: (path) => /^\/comments\/\d+\/replies$/.test(path) },
        { method: 'DELETE', test: (path) => /^\/comments\/\d+$/.test(path) },
        {
            method: 'GET',
            test: (path) =>
                path === '/comments/moderation/pending',
        },
        { method: 'PATCH', test: (path) => /^\/comments\/\d+\/review$/.test(path) },
        { method: 'PATCH', test: (path) => /^\/comments\/\d+\/hide$/.test(path) },
        {
            method: 'POST',
            test: (path) => /^\/comments\/\d+\/point-events\/ensure$/.test(path),
        },
        { method: 'GET', test: (path) => path === '/notifications/my' },
        { method: 'GET', test: (path) => path === '/notifications/stream' },
        { method: 'GET', test: (path) => path === '/notifications/summary' },
        { method: 'PATCH', test: (path) => path === '/notifications/read-all' },
        { method: 'PATCH', test: (path) => /^\/notifications\/\d+\/read$/.test(path) },
        { method: 'GET', test: (path) => path === '/points/policy' },
        { method: 'GET', test: (path) => path === '/points/me/summary' },
        { method: 'GET', test: (path) => path === '/points/me/transactions' },
        { method: 'GET', test: (path) => path === '/points/me/events' },
        { method: 'GET', test: (path) => path === '/points/events/pending' },
        { method: 'PATCH', test: (path) => /^\/points\/events\/\d+\/review$/.test(path) },
        { method: 'GET', test: (path) => path === '/moderation/stats' },
        { method: 'GET', test: (path) => path === '/moderation/timeline' },
        { method: 'GET', test: (path) => path === '/moderation/queue' },
        { method: 'POST', test: (path) => path === '/qa-sessions' },
        { method: 'GET', test: (path) => path === '/qa-sessions/my' },
        { method: 'GET', test: (path) => /^\/qa-sessions\/\d+\/messages$/.test(path) },
        { method: 'POST', test: (path) => /^\/qa-sessions\/\d+\/messages$/.test(path) },
        { method: 'PATCH', test: (path) => /^\/qa-sessions\/\d+\/close$/.test(path) },
        { method: 'POST', test: (path) => /^\/qa-sessions\/\d+\/rate$/.test(path) },
        { method: 'PATCH', test: (path) => path === '/users/me' },
        { method: 'PATCH', test: (path) => path === '/users/me/password' },
        { method: 'GET', test: (path) => path === '/users' },
        { method: 'GET', test: (path) => path === '/users/audit-logs' },
        { method: 'PATCH', test: (path) => /^\/users\/\d+\/active-status$/.test(path) },
        { method: 'PATCH', test: (path) => /^\/users\/\d+\/role$/.test(path) },
        { method: 'DELETE', test: (path) => /^\/users\/\d+$/.test(path) },
    ];

    const isAllowed = allowPostgresPhase3Paths.some(
        (rule) => rule.method === method && rule.test(requestPath)
    );

    if (isAllowed) {
        next();
        return;
    }

    res.status(501).json({
        success: false,
        message:
            'PostgreSQL migration is in progress. This endpoint is not enabled yet on PostgreSQL.',
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
