const jwt = require('jsonwebtoken');

const optionalAuthMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            next();
            return;
        }

        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        next();
    }
};

module.exports = optionalAuthMiddleware;
