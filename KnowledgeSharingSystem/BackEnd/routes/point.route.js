const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const pointEventController = require('../controllers/point-event.controller');

const router = express.Router();

router.get(
    '/events/pending',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    pointEventController.getPendingPointEvents
);

router.patch(
    '/events/:eventId/review',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    pointEventController.reviewPointEvent
);

module.exports = router;
