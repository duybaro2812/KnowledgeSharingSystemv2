const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');

const createLoginHandler = (options = {}) => async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            const error = new Error('Username and password are required.');
            error.statusCode = 400;
            throw error;
        }

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

const register = async (req, res, next) => {
    try {
        const { username, name, email, password } = req.body;

        if (!username || !name || !email || !password) {
            const error = new Error('Username, name, email, and password are required.');
            error.statusCode = 400;
            throw error;
        }

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
    login,
    adminLogin,
    getMe,
};
