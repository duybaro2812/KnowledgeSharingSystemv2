const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const apiRoutes = require('./routes');
const authController = require('./controllers/auth.controller');
const notificationModel = require('./models/notification.model');
const runtimeMetricsService = require('./services/runtime-metrics.service');
const { authRateLimiter } = require('./middlewares/rate-limit.middleware');

const app = express();
const enableAccessLog = process.env.ENABLE_ACCESS_LOG !== 'false';
const slowRequestThresholdMs = Number(process.env.SLOW_REQUEST_THRESHOLD_MS || 1200);

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '*')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
const uploadEmbedOrigins = allowedOrigins.includes('*')
    ? ["'self'", 'http://localhost:5173']
    : ["'self'", ...allowedOrigins];

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
    const requestId =
        req.headers['x-request-id'] ||
        (typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.round(Math.random() * 1e6)}`);
    req.requestId = String(requestId);
    res.setHeader('X-Request-Id', req.requestId);
    next();
});

app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
        const finishedAt = process.hrtime.bigint();
        const durationMs = Number(finishedAt - startedAt) / 1e6;
        runtimeMetricsService.recordRequest({
            statusCode: res.statusCode,
            durationMs,
        });

        const shouldLog =
            enableAccessLog &&
            (res.statusCode >= 400 || durationMs >= slowRequestThresholdMs);

        if (shouldLog) {
            const durationLabel = `${durationMs.toFixed(1)}ms`;
            const userLabel = req.user?.userId ? ` user=${req.user.userId}` : '';
            const requestIdLabel = req.requestId ? ` reqId=${req.requestId}` : '';
            const ipLabel = req.ip ? ` ip=${req.ip}` : '';
            console.log(
                `${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationLabel})${userLabel}${ipLabel}${requestIdLabel}`
            );
        }
    });

    next();
});

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    const isEmbeddablePreviewRoute =
        req.path.startsWith('/uploads/') ||
        /^\/api\/documents\/\d+\/viewer\/content$/.test(req.path);

    if (isEmbeddablePreviewRoute) {
        res.setHeader(
            'Content-Security-Policy',
            `frame-ancestors ${uploadEmbedOrigins.join(' ')};`
        );
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        next();
        return;
    }

    res.setHeader('X-Frame-Options', 'DENY');
    next();
});

app.use(
    cors({
        origin(origin, callback) {
            if (
                !origin ||
                allowedOrigins.includes('*') ||
                allowedOrigins.includes(origin)
            ) {
                return callback(null, true);
            }

            return callback(new Error('CORS origin is not allowed.'));
        },
        credentials: true,
    })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));

app.post('/login', authRateLimiter, authController.login);
app.post('/login/admin', authRateLimiter, authController.adminLogin);

app.use('/api', apiRoutes);

app.use(async (error, req, res, next) => {
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal server error.';
    const isDocumentUploadApi = req.method === 'POST' && req.originalUrl.startsWith('/api/documents');
    const isUploadValidationError =
        error.code === 'LIMIT_FILE_SIZE' ||
        message === 'A document file is required.' ||
        message.startsWith('Only document files are allowed');

    if (error.code === 'LIMIT_FILE_SIZE') {
        statusCode = 400;
        message = 'Document file upload failed due to size policy.';
    }

    if (isDocumentUploadApi && isUploadValidationError && req.user?.userId) {
        try {
            await notificationModel.createNotification({
                userId: req.user.userId,
                type: 'document_upload_rejected',
                title: 'Upload Rejected',
                message: message === 'A document file is required.' ? 'Your document upload was rejected because no file was provided.' : `Your document upload was rejected: ${message}`,
                metadata: {
                    reason: message,
                },
            });
        } catch (notifyError) {
            console.error('Failed to create upload rejected notification:', notifyError.message);
        }
    }

    if (statusCode >= 500) {
        console.error(`[${req.requestId}] ${req.method} ${req.originalUrl} -> ${statusCode}: ${message}`);
    }

    if (Number(error.retryAfterSeconds) > 0) {
        res.setHeader('Retry-After', String(Number(error.retryAfterSeconds)));
    }

    res.status(statusCode).json({
        success: false,
        message,
        requestId: req.requestId,
        ...(Number(error.retryAfterSeconds) > 0
            ? { retryAfterSeconds: Number(error.retryAfterSeconds) }
            : {}),
    });
});

module.exports = app;
