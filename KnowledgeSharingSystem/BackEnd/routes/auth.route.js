const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', authController.register);
router.post('/register/request-otp', authController.requestRegisterOtp);
router.post('/register/verify-otp', authController.verifyRegisterOtp);
router.post('/login', authController.login);
router.post('/login/admin', authController.adminLogin);
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
