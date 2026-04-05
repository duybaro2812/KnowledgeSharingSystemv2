const store = new Map();

const getClientKey = (req) =>
    req.ip ||
    req.headers['x-forwarded-for'] ||
    req.connection?.remoteAddress ||
    'unknown';

const createRateLimiter = ({
    keyPrefix,
    windowMs,
    maxRequests,
    message,
}) => {
    return (req, res, next) => {
        const now = Date.now();
        const clientKey = `${keyPrefix}:${getClientKey(req)}`;
        const bucket = store.get(clientKey);

        if (!bucket || bucket.expiresAt <= now) {
            store.set(clientKey, {
                count: 1,
                expiresAt: now + windowMs,
            });
            return next();
        }

        if (bucket.count >= maxRequests) {
            return res.status(429).json({
                success: false,
                message,
            });
        }

        bucket.count += 1;
        store.set(clientKey, bucket);
        return next();
    };
};

const authRateLimiter = createRateLimiter({
    keyPrefix: 'auth',
    windowMs: 15 * 60 * 1000,
    maxRequests: 20,
    message: 'Too many authentication requests. Please try again later.',
});

const uploadRateLimiter = createRateLimiter({
    keyPrefix: 'upload',
    windowMs: 10 * 60 * 1000,
    maxRequests: 10,
    message: 'Too many upload attempts. Please wait before uploading again.',
});

const reportRateLimiter = createRateLimiter({
    keyPrefix: 'report',
    windowMs: 10 * 60 * 1000,
    maxRequests: 20,
    message: 'Too many report requests. Please try again later.',
});

const commentRateLimiter = createRateLimiter({
    keyPrefix: 'comment',
    windowMs: 5 * 60 * 1000,
    maxRequests: 30,
    message: 'Too many comment requests. Please slow down and try again later.',
});

module.exports = {
    createRateLimiter,
    authRateLimiter,
    uploadRateLimiter,
    reportRateLimiter,
    commentRateLimiter,
};
