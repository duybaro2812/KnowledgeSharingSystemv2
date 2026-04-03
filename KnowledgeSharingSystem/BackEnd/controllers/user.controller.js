const bcrypt = require('bcrypt');
const userModel = require('../models/user.model');
const adminActionLogModel = require('../models/admin-action-log.model');

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

        const beforeProfile = await userModel.getUserProfileById(userId);

        await userModel.setUserActiveStatus({
            userId,
            isActive,
        });

        const updatedProfile = await userModel.getUserProfileById(userId);

        if (beforeProfile && updatedProfile) {
            await adminActionLogModel.createAdminActionLog({
                actorUserId: req.user.userId,
                targetUserId: userId,
                actionType: isActive ? 'user_unlocked' : 'user_locked',
                oldValue: {
                    isActive: beforeProfile.isActive,
                    role: beforeProfile.role,
                },
                newValue: {
                    isActive: updatedProfile.isActive,
                    role: updatedProfile.role,
                },
                note: isActive ? 'Admin unlocked user account.' : 'Admin locked user account.',
            });
        }

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

        const beforeProfile = await userModel.getUserProfileById(userId);

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

        if (beforeProfile && updatedProfile) {
            await adminActionLogModel.createAdminActionLog({
                actorUserId: req.user.userId,
                targetUserId: userId,
                actionType: role === 'moderator' ? 'user_promoted_moderator' : 'user_demoted_user',
                oldValue: {
                    role: beforeProfile.role,
                    isActive: beforeProfile.isActive,
                },
                newValue: {
                    role: updatedProfile.role,
                    isActive: updatedProfile.isActive,
                },
                note: role === 'moderator' ? 'Admin promoted user to moderator.' : 'Admin demoted user to basic user role.',
            });
        }

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

        const beforeProfile = await userModel.getUserProfileById(userId);

        const affectedRows = await userModel.softDeleteUserByAdmin({ userId });

        if (!affectedRows) {
            const error = new Error('User not found or admin account cannot be deleted.');
            error.statusCode = 404;
            throw error;
        }

        const updatedProfile = await userModel.getUserProfileById(userId);

        if (beforeProfile && updatedProfile) {
            await adminActionLogModel.createAdminActionLog({
                actorUserId: req.user.userId,
                targetUserId: userId,
                actionType: 'user_soft_deleted',
                oldValue: {
                    username: beforeProfile.username,
                    email: beforeProfile.email,
                    role: beforeProfile.role,
                    isActive: beforeProfile.isActive,
                    isVerified: beforeProfile.isVerified,
                },
                newValue: {
                    username: updatedProfile.username,
                    email: updatedProfile.email,
                    role: updatedProfile.role,
                    isActive: updatedProfile.isActive,
                    isVerified: updatedProfile.isVerified,
                },
                note: 'Admin performed soft delete user action.',
            });
        }

        res.json({
            success: true,
            message: 'User account has been deleted (soft delete) successfully.',
            data: updatedProfile,
        });
    } catch (error) {
        next(error);
    }
};

const getAdminActionLogs = async (req, res, next) => {
    try {
        const page = Number(req.query.page || 1);
        const pageSize = Number(req.query.pageSize || 30);

        const logs = await adminActionLogModel.getAdminActionLogs({
            page: Number.isInteger(page) ? page : 1,
            pageSize: Number.isInteger(pageSize) ? pageSize : 30,
        });

        res.json({
            success: true,
            message: 'Admin action logs fetched successfully.',
            data: logs,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUsers,
    getAdminActionLogs,
    setUserActiveStatus,
    updateUserRole,
    updateMyProfile,
    changeMyPassword,
    deleteUserAccount,
};
