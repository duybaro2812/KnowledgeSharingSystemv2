const jwt = require('jsonwebtoken');
const runtimeMetricsService = require('../services/runtime-metrics.service');

const isQueryTokenAllowed = (req) => {
    const method = String(req.method || '').toUpperCase();
    if (method !== 'GET') return false;

    const safeOriginalPath = String(req.originalUrl || '').split('?')[0];
    return /^\/api\/documents\/\d+\/viewer\/content$/i.test(safeOriginalPath);
};

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const tokenFromQuery = req.query?.token ? String(req.query.token).trim() : '';
        const canUseQueryToken = tokenFromQuery && isQueryTokenAllowed(req);

        if ((!authHeader || !authHeader.startsWith('Bearer ')) && !canUseQueryToken) {
            const error = new Error('Authorization token is required.');
            error.statusCode = 401;
            throw error;
        }

        const token = authHeader?.startsWith('Bearer ')
            ? authHeader.split(' ')[1]
            : canUseQueryToken
                ? tokenFromQuery
                : '';

        if (!token) {
            const error = new Error('Authorization token is required.');
            error.statusCode = 401;
            throw error;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;
        next();
    } catch (error) {
        runtimeMetricsService.recordAuthFailure();
        error.statusCode = error.statusCode || 401;
        next(error);
    }
};

module.exports = authMiddleware;
