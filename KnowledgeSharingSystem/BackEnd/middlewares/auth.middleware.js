const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const tokenFromQuery = req.query?.token ? String(req.query.token).trim() : '';

        if ((!authHeader || !authHeader.startsWith('Bearer ')) && !tokenFromQuery) {
            const error = new Error('Authorization token is required.');
            error.statusCode = 401;
            throw error;
        }

        const token = authHeader?.startsWith('Bearer ')
            ? authHeader.split(' ')[1]
            : tokenFromQuery;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;
        next();
    } catch (error) {
        error.statusCode = error.statusCode || 401;
        next(error);
    }
};

module.exports = authMiddleware;
