const bcrypt = require('bcrypt');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const userModel = require('../../../models/user.model');
const registrationOtpModel = require('../../../models/registration-otp.model');
const adminActionLogModel = require('../../../models/admin-action-log.model');
const notificationModel = require('../../../models/notification.model');
const { sendAdditionalEmailOtpEmail } = require('../../../services/mail.service');
const { VALIDATION_RULES } = require('../../../config/validation-rules');
const {
    normalizeRequiredText,
    normalizeOptionalText,
    normalizeEmail,
    normalizePassword,
} = require('../../../utils/input-sanitizer');

const OTP_EXPIRE_MINUTES = Number(process.env.OTP_EXPIRE_MINUTES || 10);

const buildAdditionalEmailOtpUsername = (userId) => `additional_email:${Number(userId)}`;

const requestAdditionalEmailOtp = async (req, res, next) => {
    try {
        const email = normalizeEmail({
            value: req.body?.email,
            maxLength: VALIDATION_RULES.auth.emailMax,
        });
        const currentProfile = await userModel.getUserProfileById(req.user.userId);

        if (!currentProfile) {
            const error = new Error('User not found.');
            error.statusCode = 404;
            throw error;
        }

        if (String(currentProfile.email || '').toLowerCase() === email.toLowerCase()) {
            const error = new Error('Recovery email must be different from primary email.');
            error.statusCode = 400;
            throw error;
        }

        const emailUsedByAnother = await userModel.isEmailUsedByAnotherUser({
            email,
            userId: req.user.userId,
        });

        if (emailUsedByAnother) {
            const error = new Error('This email is already used by another account.');
            error.statusCode = 409;
            throw error;
        }

        const otpCode = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);

        await registrationOtpModel.createOrReplaceAdditionalEmailOtp({
            userId: req.user.userId,
            email,
            otpCode,
            expiresAt,
        });

        const mailResult = await sendAdditionalEmailOtpEmail({
            toEmail: email,
            otpCode,
            expiresMinutes: OTP_EXPIRE_MINUTES,
        });

        res.json({
            success: true,
            message: 'Recovery email OTP has been sent.',
            data: {
                email,
                ...(mailResult.fallback ? { otpPreview: mailResult.otpCode } : {}),
            },
        });
    } catch (error) {
        next(error);
    }
};

const verifyAdditionalEmailOtp = async (req, res, next) => {
    try {
        const email = normalizeEmail({
            value: req.body?.email,
            maxLength: VALIDATION_RULES.auth.emailMax,
        });
        const otp = normalizeRequiredText({
            value: req.body?.otp,
            fieldName: 'OTP',
            minLength: VALIDATION_RULES.auth.otpLength,
            maxLength: VALIDATION_RULES.auth.otpLength,
        });
        const currentProfile = await userModel.getUserProfileById(req.user.userId);

        if (!currentProfile) {
            const error = new Error('User not found.');
            error.statusCode = 404;
            throw error;
        }

        if (String(currentProfile.email || '').toLowerCase() === email.toLowerCase()) {
            const error = new Error('Recovery email must be different from primary email.');
            error.statusCode = 400;
            throw error;
        }

        const emailUsedByAnother = await userModel.isEmailUsedByAnotherUser({
            email,
            userId: req.user.userId,
        });

        if (emailUsedByAnother) {
            const error = new Error('This email is already used by another account.');
            error.statusCode = 409;
            throw error;
        }

        const otpRecord = await registrationOtpModel.findLatestActiveOtpByEmailAndUsername({
            email,
            username: buildAdditionalEmailOtpUsername(req.user.userId),
        });

        if (!otpRecord) {
            const error = new Error('OTP request not found. Please request OTP again.');
            error.statusCode = 404;
            throw error;
        }

        if (new Date(otpRecord.expiresAt).getTime() < Date.now()) {
            const error = new Error('OTP has expired. Please request a new OTP.');
            error.statusCode = 400;
            throw error;
        }

        if (otpRecord.otpCode !== otp) {
            const error = new Error('Invalid OTP.');
            error.statusCode = 400;
            throw error;
        }

        await userModel.updateMyProfile({
            userId: req.user.userId,
            name: currentProfile.name,
            bio: currentProfile.bio,
            school: currentProfile.school,
            major: currentProfile.major,
            startedYear: currentProfile.startedYear,
            language: currentProfile.language,
            region: currentProfile.region,
            additionalEmail: email,
            notifyComments: currentProfile.notifyComments !== false,
            notifyDocumentApproved: currentProfile.notifyDocumentApproved !== false,
            notifyQaMessages: currentProfile.notifyQaMessages !== false,
            notifyPoints: currentProfile.notifyPoints !== false,
        });
        await registrationOtpModel.markOtpAsUsed(otpRecord.otpId);

        const updatedProfile = await userModel.getUserProfileById(req.user.userId);

        res.json({
            success: true,
            message: 'Recovery email verified successfully.',
            data: updatedProfile,
        });
    } catch (error) {
        next(error);
    }
};

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

        if (Number(req.user?.userId) === userId) {
            const error = new Error('Admin cannot lock or unlock their own account.');
            error.statusCode = 400;
            throw error;
        }

        const beforeProfile = await userModel.getUserProfileById(userId);

        if (!beforeProfile) {
            const error = new Error('User not found.');
            error.statusCode = 404;
            throw error;
        }

        if (beforeProfile.role === 'admin') {
            const error = new Error('Admin accounts cannot be locked or unlocked by this endpoint.');
            error.statusCode = 400;
            throw error;
        }

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

        try {
            await notificationModel.createNotification({
                userId,
                type: isActive ? 'account_unlocked' : 'account_locked',
                title: isActive ? 'Account unlocked' : 'Account locked',
                message: isActive
                    ? 'Your account has been unlocked by admin.'
                    : 'Your account has been locked by admin.',
                metadata: {
                    target: { type: 'user', id: userId },
                    action: isActive ? 'user.unlocked' : 'user.locked',
                    sourceUserId: req.user.userId,
                    adminUserId: req.user.userId,
                    isActive,
                },
            });
        } catch (notifyError) {
            console.error('Failed to create account status notification:', notifyError.message);
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
        const role = normalizeRequiredText({
            value: req.body?.role,
            fieldName: 'Role',
            maxLength: 20,
        }).toLowerCase();

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

        if (!beforeProfile) {
            const error = new Error('User not found.');
            error.statusCode = 404;
            throw error;
        }

        if (beforeProfile.role === 'admin') {
            const error = new Error('Admin role cannot be changed.');
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

        try {
            await notificationModel.createNotification({
                userId,
                type: role === 'moderator' ? 'role_promoted_moderator' : 'role_changed_user',
                title: role === 'moderator' ? 'Role updated to moderator' : 'Role changed to user',
                message:
                    role === 'moderator'
                        ? 'Your account has been promoted to moderator by admin.'
                        : 'Your account role has been changed to user by admin.',
                metadata: {
                    target: { type: 'user', id: userId },
                    action: role === 'moderator' ? 'user.promoted_moderator' : 'user.demoted_user',
                    sourceUserId: req.user.userId,
                    adminUserId: req.user.userId,
                    role,
                },
            });
        } catch (notifyError) {
            console.error('Failed to create role update notification:', notifyError.message);
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
        const { username } = req.body || {};
        const currentProfile = await userModel.getUserProfileById(req.user.userId);
        if (!currentProfile) {
            const error = new Error('User not found.');
            error.statusCode = 404;
            throw error;
        }
        const name = normalizeRequiredText({
            value: req.body?.name,
            fieldName: 'Name',
            maxLength: VALIDATION_RULES.user.nameMax,
        });
        const bio = normalizeOptionalText({
            value: req.body?.bio,
            fieldName: 'Bio',
            maxLength: VALIDATION_RULES.user.bioMax,
        });
        const school = normalizeOptionalText({
            value: req.body?.school,
            fieldName: 'School',
            maxLength: 150,
        });
        const major = normalizeOptionalText({
            value: req.body?.major,
            fieldName: 'Major',
            maxLength: 150,
        });
        const startedYear = normalizeOptionalText({
            value: req.body?.startedYear,
            fieldName: 'Started year',
            maxLength: 10,
        });
        const additionalEmail = normalizeOptionalText({
            value: req.body?.additionalEmail,
            fieldName: 'Additional email',
            maxLength: VALIDATION_RULES.auth.emailMax,
        });
        if (additionalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(additionalEmail)) {
            const error = new Error('Additional email must be a valid email address.');
            error.statusCode = 400;
            throw error;
        }
        if (
            String(additionalEmail || '').toLowerCase() !==
            String(currentProfile.additionalEmail || '').toLowerCase()
        ) {
            const error = new Error('Please verify recovery email with OTP before saving it.');
            error.statusCode = 400;
            throw error;
        }
        const requestedLanguage = String(req.body?.language || '').toLowerCase();
        const language = ['vi', 'en'].includes(requestedLanguage)
            ? requestedLanguage
            : currentProfile.language || 'vi';
        const region = normalizeOptionalText({
            value: req.body?.region,
            fieldName: 'Region',
            maxLength: 80,
        }) || currentProfile.region || 'Vietnam';
        const notificationPreferences = req.body?.notificationPreferences || {};
        const parseBooleanDefault = (value, defaultValue) =>
            typeof value === 'boolean' ? value : defaultValue;

        if (typeof username !== 'undefined') {
            const error = new Error('Username cannot be changed.');
            error.statusCode = 400;
            throw error;
        }

        await userModel.updateMyProfile({
            userId: req.user.userId,
            name,
            bio,
            school,
            major,
            startedYear,
            language,
            region,
            additionalEmail,
            notifyComments:
                typeof notificationPreferences.comments === 'boolean'
                    ? notificationPreferences.comments
                    : parseBooleanDefault(req.body?.notifyComments, currentProfile.notifyComments !== false),
            notifyDocumentApproved:
                typeof notificationPreferences.documentApproved === 'boolean'
                    ? notificationPreferences.documentApproved
                    : parseBooleanDefault(req.body?.notifyDocumentApproved, currentProfile.notifyDocumentApproved !== false),
            notifyQaMessages:
                typeof notificationPreferences.qaMessages === 'boolean'
                    ? notificationPreferences.qaMessages
                    : parseBooleanDefault(req.body?.notifyQaMessages, currentProfile.notifyQaMessages !== false),
            notifyPoints:
                typeof notificationPreferences.points === 'boolean'
                    ? notificationPreferences.points
                    : parseBooleanDefault(req.body?.notifyPoints, currentProfile.notifyPoints !== false),
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

const uploadMyAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            const error = new Error('An avatar image is required.');
            error.statusCode = 400;
            throw error;
        }

        const extensionByMime = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'image/gif': '.gif',
        };
        const extension = extensionByMime[req.file.mimetype] || path.extname(req.file.originalname || '').toLowerCase();
        const safeExtension = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension) ? extension : '.png';
        const uploadRoot = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads', 'avatars');
        await fs.mkdir(uploadRoot, { recursive: true });

        const fileName = `user-${req.user.userId}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExtension}`;
        const absolutePath = path.join(uploadRoot, fileName);
        await fs.writeFile(absolutePath, req.file.buffer);

        const avatarUrl = `/uploads/avatars/${fileName}`;
        await userModel.updateMyAvatar({
            userId: req.user.userId,
            avatarUrl,
        });

        const updatedProfile = await userModel.getUserProfileById(req.user.userId);

        res.json({
            success: true,
            message: 'Avatar updated successfully.',
            data: updatedProfile,
        });
    } catch (error) {
        next(error);
    }
};

const changeMyPassword = async (req, res, next) => {
    try {
        const currentPassword = normalizePassword({
            value: req.body?.currentPassword,
            minLength: VALIDATION_RULES.auth.passwordMin,
            maxLength: VALIDATION_RULES.auth.passwordMax,
            fieldName: 'currentPassword',
        });
        const newPassword = normalizePassword({
            value: req.body?.newPassword,
            minLength: VALIDATION_RULES.auth.passwordMin,
            maxLength: VALIDATION_RULES.auth.passwordMax,
            fieldName: 'newPassword',
        });

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
            data: {
                userId: req.user.userId,
                passwordChanged: true,
            },
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

        if (!beforeProfile) {
            const error = new Error('User not found.');
            error.statusCode = 404;
            throw error;
        }

        if (beforeProfile.role === 'admin') {
            const error = new Error('Admin account cannot be deleted.');
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

        try {
            await notificationModel.createNotification({
                userId,
                type: 'account_soft_deleted',
                title: 'Account deactivated by admin',
                message: 'Your account has been deactivated by admin.',
                metadata: {
                    target: { type: 'user', id: userId },
                    action: 'user.soft_deleted',
                    sourceUserId: req.user.userId,
                    adminUserId: req.user.userId,
                },
            });
        } catch (notifyError) {
            console.error('Failed to create soft delete notification:', notifyError.message);
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
    requestAdditionalEmailOtp,
    verifyAdditionalEmailOtp,
    setUserActiveStatus,
    updateUserRole,
    updateMyProfile,
    uploadMyAvatar,
    changeMyPassword,
    deleteUserAccount,
};
