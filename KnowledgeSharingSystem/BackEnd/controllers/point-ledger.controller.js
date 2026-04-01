const pointLedgerModel = require('../models/point-ledger.model');

const parseLimit = (rawLimit, defaultLimit = 50) => {
    const parsed = Number(rawLimit);
    if (!Number.isInteger(parsed) || parsed <= 0) return defaultLimit;
    return Math.min(parsed, 200);
};

const getMyPointSummary = async (req, res, next) => {
    try {
        const summary = await pointLedgerModel.getMyPointSummary(req.user.userId);

        if (!summary) {
            const error = new Error('User not found.');
            error.statusCode = 404;
            throw error;
        }

        res.json({
            success: true,
            message: 'Point summary fetched successfully.',
            data: summary,
        });
    } catch (error) {
        next(error);
    }
};

const getMyPointTransactions = async (req, res, next) => {
    try {
        const limit = parseLimit(req.query.limit, 50);
        const transactions = await pointLedgerModel.getMyPointTransactions({
            userId: req.user.userId,
            limit,
        });

        res.json({
            success: true,
            message: 'Point transactions fetched successfully.',
            data: transactions,
        });
    } catch (error) {
        next(error);
    }
};

const getMyPointEvents = async (req, res, next) => {
    try {
        const limit = parseLimit(req.query.limit, 50);
        const status = req.query.status || null;

        if (status && !['pending', 'approved', 'rejected'].includes(status)) {
            const error = new Error("status must be one of 'pending', 'approved', 'rejected'.");
            error.statusCode = 400;
            throw error;
        }

        const events = await pointLedgerModel.getMyPointEvents({
            userId: req.user.userId,
            status,
            limit,
        });

        res.json({
            success: true,
            message: 'Point events fetched successfully.',
            data: events,
        });
    } catch (error) {
        next(error);
    }
};

const getPointPolicy = async (req, res, next) => {
    try {
        const policy = pointLedgerModel.getPointPolicy();
        res.json({
            success: true,
            message: 'Point policy fetched successfully.',
            data: policy,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMyPointSummary,
    getMyPointTransactions,
    getMyPointEvents,
    getPointPolicy,
};

