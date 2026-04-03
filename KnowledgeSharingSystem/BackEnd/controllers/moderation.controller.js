const commentModel = require('../models/comment.model');
const reportModel = require('../models/report.model');
const pointEventModel = require('../models/point-event.model');
const moderationModel = require('../models/moderation.model');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const toPositiveInt = (value, fallback) => {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const toNonNegativeInt = (value, fallback) => {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

const parseInclude = (rawInclude) => {
    if (!rawInclude || !String(rawInclude).trim()) {
        return {
            comments: true,
            reports: true,
            points: true,
        };
    }

    const includeSet = new Set(
        String(rawInclude)
            .split(',')
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean)
    );

    return {
        comments: includeSet.has('comments'),
        reports: includeSet.has('reports'),
        points: includeSet.has('points'),
    };
};

const getModerationQueue = async (req, res, next) => {
    try {
        const include = parseInclude(req.query.include);
        const limitInput = toPositiveInt(req.query.limit, DEFAULT_LIMIT);
        const offsetInput = toNonNegativeInt(req.query.offset, 0);
        const documentIdInput = toPositiveInt(req.query.documentId, null);
        const reportStatus = req.query.reportStatus ? String(req.query.reportStatus).trim().toLowerCase() : 'open';

        if (limitInput === null) {
            const error = new Error('limit must be a positive integer.');
            error.statusCode = 400;
            throw error;
        }

        if (offsetInput === null) {
            const error = new Error('offset must be a non-negative integer.');
            error.statusCode = 400;
            throw error;
        }

        if (req.query.documentId !== undefined && documentIdInput === null) {
            const error = new Error('documentId must be a positive integer.');
            error.statusCode = 400;
            throw error;
        }

        const limit = Math.min(limitInput, MAX_LIMIT);
        const offset = offsetInput;

        const [comments, reports, pointEvents] = await Promise.all([
            include.comments
                ? commentModel.getPendingCommentsForModeration({
                    limit,
                    offset,
                    documentId: documentIdInput,
                })
                : Promise.resolve([]),
            include.reports
                ? reportModel.getPendingDocumentReportQueue({
                    reportStatus,
                    limit,
                    offset,
                })
                : Promise.resolve([]),
            include.points
                ? pointEventModel
                    .getPendingPointEvents()
                    .then((events) => events.slice(offset, offset + limit))
                : Promise.resolve([]),
        ]);

        const summary = {
            commentsPending: include.comments ? comments.length : null,
            reportsPending: include.reports ? reports.length : null,
            pointEventsPending: include.points ? pointEvents.length : null,
            totalPending:
                (include.comments ? comments.length : 0) +
                (include.reports ? reports.length : 0) +
                (include.points ? pointEvents.length : 0),
        };

        res.json({
            success: true,
            message: 'Moderation queue fetched successfully.',
            data: {
                summary,
                queue: {
                    comments,
                    reports,
                    pointEvents,
                },
                filters: {
                    include,
                    limit,
                    offset,
                    documentId: documentIdInput,
                    reportStatus,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const getModerationStats = async (req, res, next) => {
    try {
        const dateFrom = req.query.dateFrom ? String(req.query.dateFrom).trim() : null;
        const dateTo = req.query.dateTo ? String(req.query.dateTo).trim() : null;

        if (dateFrom && Number.isNaN(Date.parse(dateFrom))) {
            const error = new Error('dateFrom must be a valid date (YYYY-MM-DD).');
            error.statusCode = 400;
            throw error;
        }

        if (dateTo && Number.isNaN(Date.parse(dateTo))) {
            const error = new Error('dateTo must be a valid date (YYYY-MM-DD).');
            error.statusCode = 400;
            throw error;
        }

        const stats = await moderationModel.getModerationStats({
            dateFrom,
            dateTo,
        });

        res.json({
            success: true,
            message: 'Moderation stats fetched successfully.',
            data: stats,
        });
    } catch (error) {
        next(error);
    }
};

const getModerationTimeline = async (req, res, next) => {
    try {
        const dateFrom = req.query.dateFrom ? String(req.query.dateFrom).trim() : null;
        const dateTo = req.query.dateTo ? String(req.query.dateTo).trim() : null;
        const source = req.query.source ? String(req.query.source).trim().toLowerCase() : null;
        const actorUserId = req.query.actorUserId ? Number(req.query.actorUserId) : null;
        const limit = req.query.limit ? Number(req.query.limit) : 50;
        const offset = req.query.offset ? Number(req.query.offset) : 0;

        if (dateFrom && Number.isNaN(Date.parse(dateFrom))) {
            const error = new Error('dateFrom must be a valid date (YYYY-MM-DD).');
            error.statusCode = 400;
            throw error;
        }

        if (dateTo && Number.isNaN(Date.parse(dateTo))) {
            const error = new Error('dateTo must be a valid date (YYYY-MM-DD).');
            error.statusCode = 400;
            throw error;
        }

        if (req.query.actorUserId !== undefined && (!Number.isInteger(actorUserId) || actorUserId <= 0)) {
            const error = new Error('actorUserId must be a positive integer.');
            error.statusCode = 400;
            throw error;
        }

        if (!Number.isInteger(limit) || limit <= 0) {
            const error = new Error('limit must be a positive integer.');
            error.statusCode = 400;
            throw error;
        }

        if (!Number.isInteger(offset) || offset < 0) {
            const error = new Error('offset must be a non-negative integer.');
            error.statusCode = 400;
            throw error;
        }

        if (
            source &&
            !['admin_action', 'document_action', 'report_review', 'comment_review', 'point_review'].includes(
                source
            )
        ) {
            const error = new Error(
                "source must be one of: admin_action, document_action, report_review, comment_review, point_review."
            );
            error.statusCode = 400;
            throw error;
        }

        const timeline = await moderationModel.getModerationTimeline({
            dateFrom,
            dateTo,
            limit,
            offset,
            actorUserId,
            source,
        });

        res.json({
            success: true,
            message: 'Moderation timeline fetched successfully.',
            data: timeline,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getModerationQueue,
    getModerationStats,
    getModerationTimeline,
};
