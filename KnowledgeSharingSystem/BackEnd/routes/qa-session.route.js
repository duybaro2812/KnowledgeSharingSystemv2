const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { commentRateLimiter } = require('../middlewares/rate-limit.middleware');
const qaSessionController = require('../controllers/qa-session.controller');

const router = express.Router();

router.post('/', authMiddleware, commentRateLimiter, qaSessionController.createSession);
router.get('/my', authMiddleware, qaSessionController.getMySessions);
router.get('/:id/messages', authMiddleware, qaSessionController.getSessionMessages);
router.post('/:id/messages', authMiddleware, commentRateLimiter, qaSessionController.sendMessage);
router.patch('/:id/close', authMiddleware, qaSessionController.closeSession);
router.post('/:id/rate', authMiddleware, commentRateLimiter, qaSessionController.rateSession);

module.exports = router;
