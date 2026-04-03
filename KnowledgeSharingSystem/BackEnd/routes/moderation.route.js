const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const moderationController = require('../controllers/moderation.controller');

const router = express.Router();

router.get(
    '/stats',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    moderationController.getModerationStats
);

router.get(
    '/timeline',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    moderationController.getModerationTimeline
);

router.get(
    '/queue',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    moderationController.getModerationQueue
);

module.exports = router;
