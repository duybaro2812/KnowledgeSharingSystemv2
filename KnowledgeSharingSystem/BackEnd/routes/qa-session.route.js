const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const qaSessionController = require('../controllers/qa-session.controller');

const router = express.Router();

router.post('/', authMiddleware, qaSessionController.createSession);
router.get('/my', authMiddleware, qaSessionController.getMySessions);
router.get('/:id/messages', authMiddleware, qaSessionController.getSessionMessages);
router.post('/:id/messages', authMiddleware, qaSessionController.sendMessage);
router.patch('/:id/close', authMiddleware, qaSessionController.closeSession);
router.post('/:id/rate', authMiddleware, qaSessionController.rateSession);

module.exports = router;
