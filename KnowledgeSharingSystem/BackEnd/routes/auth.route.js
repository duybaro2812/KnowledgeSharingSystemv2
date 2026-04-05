const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authRateLimiter } = require('../middlewares/rate-limit.middleware');

const router = express.Router();

router.post('/register', authRateLimiter, authController.register);
router.post('/register/request-otp', authRateLimiter, authController.requestRegisterOtp);
router.post('/register/verify-otp', authRateLimiter, authController.verifyRegisterOtp);
router.post('/forgot-password/request-otp', authRateLimiter, authController.requestForgotPasswordOtp);
router.post('/forgot-password/reset', authRateLimiter, authController.resetPasswordWithOtp);
router.post('/login', authRateLimiter, authController.login);
router.post('/login/admin', authRateLimiter, authController.adminLogin);
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
