const store = new Map();
const MAX_TRACKED_BUCKETS = Number(process.env.RATE_LIMIT_MAX_BUCKETS || 5000);

const getClientKey = (req) =>
    String(req.headers['x-forwarded-for'] || '')
        .split(',')[0]
        .trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    'unknown';

const cleanupExpiredBuckets = (now) => {
    if (store.size <= MAX_TRACKED_BUCKETS) return;

    for (const [key, bucket] of store.entries()) {
        if (!bucket || bucket.expiresAt <= now) {
            store.delete(key);
        }
    }
};

const createRateLimiter = ({
    keyPrefix,
    windowMs,
    maxRequests,
    message,
}) => {
    return (req, res, next) => {
        const now = Date.now();
        cleanupExpiredBuckets(now);
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
            const retryAfterSeconds = Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000));
            res.setHeader('Retry-After', String(retryAfterSeconds));
            return res.status(429).json({
                success: false,
                message,
                retryAfterSeconds,
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
