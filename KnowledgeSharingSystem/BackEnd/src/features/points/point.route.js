const express = require('express');
const authMiddleware = require('../../../middlewares/auth.middleware');
const roleMiddleware = require('../../../middlewares/role.middleware');
const pointEventController = require('../../../controllers/point-event.controller');
const pointLedgerController = require('../../../controllers/point-ledger.controller');

const router = express.Router();

router.get(
    '/policy',
    authMiddleware,
    pointLedgerController.getPointPolicy
);

router.patch(
    '/policy',
    authMiddleware,
    roleMiddleware('admin'),
    pointLedgerController.updatePointPolicy
);

router.delete(
    '/policy/:settingKey',
    authMiddleware,
    roleMiddleware('admin'),
    pointLedgerController.deletePointPolicySetting
);

router.get(
    '/me/summary',
    authMiddleware,
    pointLedgerController.getMyPointSummary
);

router.get(
    '/me/transactions',
    authMiddleware,
    pointLedgerController.getMyPointTransactions
);

router.get(
    '/me/events',
    authMiddleware,
    pointLedgerController.getMyPointEvents
);

router.get(
    '/events/pending',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    pointEventController.getPendingPointEvents
);

router.get(
    '/events/qa-ratings/reviewed',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    pointEventController.getReviewedQaRatingEvents
);

router.delete(
    '/events/qa-ratings/:eventId',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    pointEventController.deleteQaRatingEvent
);

router.patch(
    '/events/:eventId/review',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    pointEventController.reviewPointEvent
);

module.exports = router;
