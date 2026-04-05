const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');
const registrationOtpModel = require('../models/registration-otp.model');
const { sendRegisterOtpEmail, sendPasswordResetOtpEmail } = require('../services/mail.service');
const { VALIDATION_RULES } = require('../config/validation-rules');
const {
    normalizeRequiredText,
    normalizeOptionalText,
    normalizeEmail,
    normalizeUsername,
    normalizePassword,
} = require('../utils/input-sanitizer');

const OTP_EXPIRE_MINUTES = Number(process.env.OTP_EXPIRE_MINUTES || 10);

const createLoginHandler = (options = {}) => async (req, res, next) => {
    try {
        const username = normalizeUsername({
            value: req.body?.username,
            minLength: VALIDATION_RULES.auth.usernameMin,
            maxLength: VALIDATION_RULES.auth.usernameMax,
        });
        const password = normalizePassword({
            value: req.body?.password,
            minLength: VALIDATION_RULES.auth.passwordMin,
            maxLength: VALIDATION_RULES.auth.passwordMax,
        });

        const user = await userModel.findUserByUsername(username);

        if (!user) {
            const error = new Error('Invalid username or password.');
            error.statusCode = 401;
            throw error;
        }

        const isPasswordMatched = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordMatched) {
            const error = new Error('Invalid username or password.');
            error.statusCode = 401;
            throw error;
        }

        if (options.adminOnly && user.role !== 'admin') {
            const error = new Error('Only admin accounts can use this login.');
            error.statusCode = 403;
            throw error;
        }

        if (options.excludeAdmin && user.role === 'admin') {
            const error = new Error('Please use the admin login endpoint.');
            error.statusCode = 403;
            throw error;
        }

        if (!user.isActive) {
            const error = new Error('Your account has been locked.');
            error.statusCode = 403;
            throw error;
        }

        const token = jwt.sign(
            {
                userId: user.userId,
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || '1d',
            }
        );

        res.json({
            success: true,
            message: 'Login successful.',
            data: {
                token,
                user: {
                    userId: user.userId,
                    username: user.username,
                    name: user.name,
                    email: user.email,
                    points: user.points,
                    role: user.role,
                    isActive: user.isActive,
                    isVerified: user.isVerified,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const validateRegisterPayload = ({ username, name, email, password, confirmPassword }) => {
    const normalizedUsername = normalizeUsername({
        value: username,
        minLength: VALIDATION_RULES.auth.usernameMin,
        maxLength: VALIDATION_RULES.auth.usernameMax,
    });
    const normalizedName = normalizeRequiredText({
        value: name,
        fieldName: 'Name',
        maxLength: VALIDATION_RULES.auth.nameMax,
    });
    const normalizedEmail = normalizeEmail({
        value: email,
        maxLength: VALIDATION_RULES.auth.emailMax,
    });
    const normalizedPassword = normalizePassword({
        value: password,
        minLength: VALIDATION_RULES.auth.passwordMin,
        maxLength: VALIDATION_RULES.auth.passwordMax,
    });
    const normalizedConfirmPassword = normalizePassword({
        value: confirmPassword,
        minLength: VALIDATION_RULES.auth.passwordMin,
        maxLength: VALIDATION_RULES.auth.passwordMax,
        fieldName: 'confirmPassword',
    });

    if (normalizedPassword !== normalizedConfirmPassword) {
        const error = new Error('Password and confirmPassword do not match.');
        error.statusCode = 400;
        throw error;
    }

    return {
        username: normalizedUsername,
        name: normalizedName,
        email: normalizedEmail,
        password: normalizedPassword,
        confirmPassword: normalizedConfirmPassword,
    };
};

const ensureUniqueUserIdentity = async ({ username, email }) => {
    const existingByUsername = await userModel.findUserByUsername(username);
    if (existingByUsername) {
        const error = new Error('Username already exists.');
        error.statusCode = 409;
        throw error;
    }

    const existingByEmail = await userModel.findUserByEmail(email);
    if (existingByEmail) {
        const error = new Error('Email already exists.');
        error.statusCode = 409;
        throw error;
    }
};

const requestRegisterOtp = async (req, res, next) => {
    try {
        const { username, name, email, password } = validateRegisterPayload(req.body || {});
        await ensureUniqueUserIdentity({ username, email });

        const passwordHash = await bcrypt.hash(password, 10);
        const otpCode = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);

        await registrationOtpModel.createOrReplaceRegistrationOtp({
            username,
            name,
            email,
            passwordHash,
            otpCode,
            expiresAt,
        });

        const mailResult = await sendRegisterOtpEmail({
            toEmail: email,
            otpCode,
            expiresMinutes: OTP_EXPIRE_MINUTES,
        });

        res.json({
            success: true,
            message: 'OTP has been sent to your email.',
            data: {
                email,
                ...(mailResult.fallback ? { otpPreview: mailResult.otpCode } : {}),
            },
        });
    } catch (error) {
        next(error);
    }
};

const verifyRegisterOtp = async (req, res, next) => {
    try {
        const normalizedEmail = normalizeEmail({
            value: req.body?.email,
            maxLength: VALIDATION_RULES.auth.emailMax,
        });
        const normalizedOtp = normalizeRequiredText({
            value: req.body?.otp,
            fieldName: 'OTP',
            minLength: VALIDATION_RULES.auth.otpLength,
            maxLength: VALIDATION_RULES.auth.otpLength,
        });
        const otpRecord = await registrationOtpModel.findLatestActiveOtpByEmail(normalizedEmail);

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

        if (otpRecord.otpCode !== normalizedOtp) {
            const error = new Error('Invalid OTP.');
            error.statusCode = 400;
            throw error;
        }

        await ensureUniqueUserIdentity({
            username: otpRecord.username,
            email: otpRecord.email,
        });

        const userId = await userModel.registerUser({
            username: otpRecord.username,
            name: otpRecord.name,
            email: otpRecord.email,
            passwordHash: otpRecord.passwordHash,
            role: 'user',
        });

        await userModel.setUserVerified(userId);
        await registrationOtpModel.markOtpAsUsed(otpRecord.otpId);

        const profile = await userModel.getUserProfileById(userId);

        res.status(201).json({
            success: true,
            message: 'User registered successfully.',
            data: profile,
        });
    } catch (error) {
        next(error);
    }
};

const requestForgotPasswordOtp = async (req, res, next) => {
    try {
        const normalizedEmail = normalizeEmail({
            value: req.body?.email,
            maxLength: VALIDATION_RULES.auth.emailMax,
        });
        const existingUser = await userModel.findUserByEmail(normalizedEmail);

        if (!existingUser) {
            const error = new Error('Account with this email does not exist.');
            error.statusCode = 404;
            throw error;
        }

        const otpCode = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);

        await registrationOtpModel.createOrReplaceForgotPasswordOtp({
            username: existingUser.username,
            name: existingUser.name,
            email: existingUser.email,
            passwordHash: existingUser.passwordHash,
            otpCode,
            expiresAt,
        });

        const mailResult = await sendPasswordResetOtpEmail({
            toEmail: existingUser.email,
            otpCode,
            expiresMinutes: OTP_EXPIRE_MINUTES,
        });

        res.json({
            success: true,
            message: 'Password reset OTP has been sent to your email.',
            data: {
                email: existingUser.email,
                ...(mailResult.fallback ? { otpPreview: mailResult.otpCode } : {}),
            },
        });
    } catch (error) {
        next(error);
    }
};

const resetPasswordWithOtp = async (req, res, next) => {
    try {
        const normalizedEmail = normalizeEmail({
            value: req.body?.email,
            maxLength: VALIDATION_RULES.auth.emailMax,
        });
        const normalizedOtp = normalizeRequiredText({
            value: req.body?.otp,
            fieldName: 'OTP',
            minLength: VALIDATION_RULES.auth.otpLength,
            maxLength: VALIDATION_RULES.auth.otpLength,
        });
        const normalizedNewPassword = normalizePassword({
            value: req.body?.newPassword,
            minLength: VALIDATION_RULES.auth.passwordMin,
            maxLength: VALIDATION_RULES.auth.passwordMax,
            fieldName: 'newPassword',
        });
        const normalizedConfirmPassword = normalizePassword({
            value: req.body?.confirmPassword,
            minLength: VALIDATION_RULES.auth.passwordMin,
            maxLength: VALIDATION_RULES.auth.passwordMax,
            fieldName: 'confirmPassword',
        });

        if (normalizedNewPassword !== normalizedConfirmPassword) {
            const error = new Error('newPassword and confirmPassword do not match.');
            error.statusCode = 400;
            throw error;
        }

        const otpRecord = await registrationOtpModel.findLatestActiveOtpByEmail(normalizedEmail);

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

        if (otpRecord.otpCode !== normalizedOtp) {
            const error = new Error('Invalid OTP.');
            error.statusCode = 400;
            throw error;
        }

        const existingUser = await userModel.findUserByEmail(normalizedEmail);
        if (!existingUser) {
            const error = new Error('Account with this email does not exist.');
            error.statusCode = 404;
            throw error;
        }

        const newPasswordHash = await bcrypt.hash(normalizedNewPassword, 10);

        await userModel.updatePassword({
            userId: existingUser.userId,
            passwordHash: newPasswordHash,
        });

        await registrationOtpModel.markOtpAsUsed(otpRecord.otpId);

        res.json({
            success: true,
            message: 'Password reset successfully. Please login with your new password.',
            data: {
                email: normalizedEmail,
                passwordReset: true,
            },
        });
    } catch (error) {
        next(error);
    }
};

const register = async (req, res, next) => {
    try {
        const username = normalizeUsername({
            value: req.body?.username,
            minLength: VALIDATION_RULES.auth.usernameMin,
            maxLength: VALIDATION_RULES.auth.usernameMax,
        });
        const name = normalizeRequiredText({
            value: req.body?.name,
            fieldName: 'Name',
            maxLength: VALIDATION_RULES.auth.nameMax,
        });
        const email = normalizeEmail({
            value: req.body?.email,
            maxLength: VALIDATION_RULES.auth.emailMax,
        });
        const password = normalizePassword({
            value: req.body?.password,
            minLength: VALIDATION_RULES.auth.passwordMin,
            maxLength: VALIDATION_RULES.auth.passwordMax,
        });

        await ensureUniqueUserIdentity({ username, email });

        const passwordHash = await bcrypt.hash(password, 10);

        const userId = await userModel.registerUser({
            username,
            name,
            email,
            passwordHash,
            role: 'user',
        });

        const profile = await userModel.getUserProfileById(userId);

        res.status(201).json({
            success: true,
            message: 'User registered successfully.',
            data: profile,
        });
    } catch (error) {
        next(error);
    }
};

const login = createLoginHandler({ excludeAdmin: true });
const adminLogin = createLoginHandler({ adminOnly: true });

const getMe = async (req, res, next) => {
    try {
        const profile = await userModel.getUserProfileById(req.user.userId);

        res.json({
            success: true,
            message: 'Current user profile fetched successfully.',
            data: profile,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    requestRegisterOtp,
    verifyRegisterOtp,
    requestForgotPasswordOtp,
    resetPasswordWithOtp,
    login,
    adminLogin,
    getMe,
};
