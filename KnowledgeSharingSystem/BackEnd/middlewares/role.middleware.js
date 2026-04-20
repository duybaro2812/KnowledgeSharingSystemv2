const roleMiddleware = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                const error = new Error('Authentication is required.');
                error.statusCode = 401;
                throw error;
            }

            const normalizedRole = String(req.user.role || '').trim().toLowerCase();
            const normalizedAllowedRoles = allowedRoles
                .map((role) => String(role || '').trim().toLowerCase())
                .filter(Boolean);

            if (!normalizedAllowedRoles.includes(normalizedRole)) {
                const error = new Error('You do not have permission to perform this action.');
                error.statusCode = 403;
                throw error;
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = roleMiddleware;
