const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');
const registrationOtpModel = require('../models/registration-otp.model');
const { sendRegisterOtpEmail, sendPasswordResetOtpEmail } = require('../services/mail.service');
const runtimeMetricsService = require('../services/runtime-metrics.service');
const { VALIDATION_RULES } = require('../config/validation-rules');
const {
    normalizeRequiredText,
    normalizeOptionalText,
    normalizeEmail,
    normalizeUsername,
    normalizePassword,
} = require('../utils/input-sanitizer');

const OTP_EXPIRE_MINUTES = Number(process.env.OTP_EXPIRE_MINUTES || 10);
const AUTH_MAX_FAILED_ATTEMPTS = Number(process.env.AUTH_MAX_FAILED_ATTEMPTS || 5);
const AUTH_LOCKOUT_WINDOW_MINUTES = Number(process.env.AUTH_LOCKOUT_WINDOW_MINUTES || 15);
const AUTH_LOCKOUT_DURATION_MINUTES = Number(process.env.AUTH_LOCKOUT_DURATION_MINUTES || 15);
const AUTH_ATTEMPT_STORE_MAX_SIZE = Number(process.env.AUTH_ATTEMPT_STORE_MAX_SIZE || 20000);
const authAttemptStore = new Map();

const getClientIp = (req) =>
    String(req.headers['x-forwarded-for'] || '')
        .split(',')[0]
        .trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    'unknown';

const getAuthAttemptKey = (req, username) =>
    `${String(username || '').toLowerCase()}:${getClientIp(req)}`;

const cleanupAuthAttempts = (now) => {
    if (authAttemptStore.size <= AUTH_ATTEMPT_STORE_MAX_SIZE) return;

    for (const [key, entry] of authAttemptStore.entries()) {
        if (!entry) {
            authAttemptStore.delete(key);
            continue;
        }

        const windowExpired = Number(entry.windowStartedAt || 0) + AUTH_LOCKOUT_WINDOW_MINUTES * 60 * 1000 <= now;
        const lockExpired = Number(entry.lockedUntil || 0) <= now;

        if (windowExpired && lockExpired) {
            authAttemptStore.delete(key);
        }
    }
};

const readAuthAttemptState = (req, username) => {
    const now = Date.now();
    cleanupAuthAttempts(now);

    const key = getAuthAttemptKey(req, username);
    const entry = authAttemptStore.get(key);

    if (!entry) {
        return { key, count: 0, lockedUntil: 0, isLocked: false, retryAfterSeconds: 0 };
    }

    const windowExpired = Number(entry.windowStartedAt || 0) + AUTH_LOCKOUT_WINDOW_MINUTES * 60 * 1000 <= now;

    if (windowExpired && Number(entry.lockedUntil || 0) <= now) {
        authAttemptStore.delete(key);
        return { key, count: 0, lockedUntil: 0, isLocked: false, retryAfterSeconds: 0 };
    }

    const isLocked = Number(entry.lockedUntil || 0) > now;
    const retryAfterSeconds = isLocked ? Math.max(1, Math.ceil((entry.lockedUntil - now) / 1000)) : 0;

    return {
        key,
        count: Number(entry.count || 0),
        lockedUntil: Number(entry.lockedUntil || 0),
        isLocked,
        retryAfterSeconds,
    };
};

const registerAuthFailure = (req, username) => {
    const now = Date.now();
    const key = getAuthAttemptKey(req, username);
    const existing = authAttemptStore.get(key);

    if (!existing || Number(existing.windowStartedAt || 0) + AUTH_LOCKOUT_WINDOW_MINUTES * 60 * 1000 <= now) {
        authAttemptStore.set(key, {
            count: 1,
            windowStartedAt: now,
            lockedUntil: 0,
        });
        return { isLocked: false, retryAfterSeconds: 0 };
    }

    const nextCount = Number(existing.count || 0) + 1;
    const nextEntry = {
        ...existing,
        count: nextCount,
    };

    if (nextCount >= AUTH_MAX_FAILED_ATTEMPTS) {
        nextEntry.lockedUntil = now + AUTH_LOCKOUT_DURATION_MINUTES * 60 * 1000;
    }

    authAttemptStore.set(key, nextEntry);

    const isLocked = Number(nextEntry.lockedUntil || 0) > now;
    return {
        isLocked,
        retryAfterSeconds: isLocked
            ? Math.max(1, Math.ceil((nextEntry.lockedUntil - now) / 1000))
            : 0,
    };
};

const clearAuthFailures = (req, username) => {
    const key = getAuthAttemptKey(req, username);
    authAttemptStore.delete(key);
};

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
        const attemptState = readAuthAttemptState(req, username);

        if (attemptState.isLocked) {
            runtimeMetricsService.recordAuthFailure();
            const error = new Error('Too many failed login attempts. Please try again later.');
            error.statusCode = 429;
            error.retryAfterSeconds = attemptState.retryAfterSeconds;
            throw error;
        }

        const user = await userModel.findUserByUsername(username);

        if (!user) {
            const failed = registerAuthFailure(req, username);
            runtimeMetricsService.recordAuthFailure();
            const error = new Error('Invalid username or password.');
            error.statusCode = failed.isLocked ? 429 : 401;
            if (failed.retryAfterSeconds) {
                error.retryAfterSeconds = failed.retryAfterSeconds;
            }
            throw error;
        }

        const isPasswordMatched = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordMatched) {
            const failed = registerAuthFailure(req, username);
            runtimeMetricsService.recordAuthFailure();
            const error = new Error('Invalid username or password.');
            error.statusCode = failed.isLocked ? 429 : 401;
            if (failed.retryAfterSeconds) {
                error.retryAfterSeconds = failed.retryAfterSeconds;
            }
            throw error;
        }

        if (options.adminOnly && user.role !== 'admin') {
            registerAuthFailure(req, username);
            runtimeMetricsService.recordAuthFailure();
            const error = new Error('Only admin accounts can use this login.');
            error.statusCode = 403;
            throw error;
        }

        if (options.excludeAdmin && user.role === 'admin') {
            registerAuthFailure(req, username);
            runtimeMetricsService.recordAuthFailure();
            const error = new Error('Please use the admin login endpoint.');
            error.statusCode = 403;
            throw error;
        }

        if (!user.isActive) {
            registerAuthFailure(req, username);
            runtimeMetricsService.recordAuthFailure();
            const error = new Error('Your account has been locked.');
            error.statusCode = 403;
            throw error;
        }

        clearAuthFailures(req, username);

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
