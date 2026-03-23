const userModel = require('../models/user.model');

const setUserActiveStatus = async (req, res, next) => {
    try {
        const userId = Number(req.params.id);
        const { isActive } = req.body;

        if (!Number.isInteger(userId) || userId <= 0) {
            const error = new Error('A valid user id is required.');
            error.statusCode = 400;
            throw error;
        }

        if (typeof isActive !== 'boolean') {
            const error = new Error('isActive must be a boolean value.');
            error.statusCode = 400;
            throw error;
        }

        await userModel.setUserActiveStatus({
            userId,
            isActive,
        });

        const updatedProfile = await userModel.getUserProfileById(userId);

        res.json({
            success: true,
            message: isActive
                ? 'User account has been unlocked successfully.'
                : 'User account has been locked successfully.',
            data: updatedProfile,
        });
    } catch (error) {
        next(error);
    }
};

const getUsers = async (req, res, next) => {
    try {
        const users = await userModel.getUsers();

        res.json({
            success: true,
            message: 'User list fetched successfully.',
            data: users,
        });
    } catch (error) {
        next(error);
    }
};

const updateUserRole = async (req, res, next) => {
    try {
        const userId = Number(req.params.id);
        const { role } = req.body;

        if (!Number.isInteger(userId) || userId <= 0) {
            const error = new Error('A valid user id is required.');
            error.statusCode = 400;
            throw error;
        }

        if (role !== 'moderator' && role !== 'user') {
            const error = new Error('Role must be either "user" or "moderator".');
            error.statusCode = 400;
            throw error;
        }

        const affectedRows = await userModel.updateUserRole({
            userId,
            role,
        });

        if (!affectedRows) {
            const error = new Error('User not found or admin role cannot be changed.');
            error.statusCode = 404;
            throw error;
        }

        const updatedProfile = await userModel.getUserProfileById(userId);

        res.json({
            success: true,
            message:
                role === 'moderator'
                    ? 'User has been promoted to moderator successfully.'
                    : 'User role has been changed back to user successfully.',
            data: updatedProfile,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUsers,
    setUserActiveStatus,
    updateUserRole,
};
