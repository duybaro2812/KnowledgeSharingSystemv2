const bcrypt = require('bcrypt');
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

const updateMyProfile = async (req, res, next) => {
    try {
        const { name, username } = req.body;

        if (!name) {
            const error = new Error('Name is required.');
            error.statusCode = 400;
            throw error;
        }

        if (typeof username !== 'undefined') {
            const error = new Error('Username cannot be changed.');
            error.statusCode = 400;
            throw error;
        }

        await userModel.updateMyProfile({
            userId: req.user.userId,
            name,
        });

        const updatedProfile = await userModel.getUserProfileById(req.user.userId);

        res.json({
            success: true,
            message: 'Profile updated successfully.',
            data: updatedProfile,
        });
    } catch (error) {
        next(error);
    }
};

const changeMyPassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            const error = new Error('Current password and new password are required.');
            error.statusCode = 400;
            throw error;
        }

        if (newPassword.length < 6) {
            const error = new Error('New password must be at least 6 characters long.');
            error.statusCode = 400;
            throw error;
        }

        const user = await userModel.getUserAuthById(req.user.userId);

        if (!user) {
            const error = new Error('User not found.');
            error.statusCode = 404;
            throw error;
        }

        const isPasswordMatched = await bcrypt.compare(currentPassword, user.passwordHash);

        if (!isPasswordMatched) {
            const error = new Error('Current password is incorrect.');
            error.statusCode = 401;
            throw error;
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await userModel.updatePassword({
            userId: req.user.userId,
            passwordHash: newPasswordHash,
        });

        res.json({
            success: true,
            message: 'Password changed successfully.',
        });
    } catch (error) {
        next(error);
    }
};

const deleteUserAccount = async (req, res, next) => {
    try {
        const userId = Number(req.params.id);

        if (!Number.isInteger(userId) || userId <= 0) {
            const error = new Error('A valid user id is required.');
            error.statusCode = 400;
            throw error;
        }

        if (Number(req.user?.userId) === userId) {
            const error = new Error('Admin cannot delete their own account.');
            error.statusCode = 400;
            throw error;
        }

        const affectedRows = await userModel.softDeleteUserByAdmin({ userId });

        if (!affectedRows) {
            const error = new Error('User not found or admin account cannot be deleted.');
            error.statusCode = 404;
            throw error;
        }

        const updatedProfile = await userModel.getUserProfileById(userId);

        res.json({
            success: true,
            message: 'User account has been deleted (soft delete) successfully.',
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
    updateMyProfile,
    changeMyPassword,
    deleteUserAccount,
};
