const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const pointEventController = require('../controllers/point-event.controller');
const pointLedgerController = require('../controllers/point-ledger.controller');

const router = express.Router();

router.get(
    '/policy',
    authMiddleware,
    pointLedgerController.getPointPolicy
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

router.patch(
    '/events/:eventId/review',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    pointEventController.reviewPointEvent
);

module.exports = router;
