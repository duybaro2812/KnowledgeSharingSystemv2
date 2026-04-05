const DOCUMENT_STATUSES = Object.freeze({
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    HIDDEN: 'hidden',
});

const COMMENT_STATUSES = Object.freeze({
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    HIDDEN: 'hidden',
});

const POINT_EVENT_STATUSES = Object.freeze({
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
});

const QA_SESSION_STATUSES = Object.freeze({
    OPEN: 'open',
    CLOSED: 'closed',
});

const REPORT_QUEUE_STATUSES = Object.freeze({
    OPEN: 'open',
    PENDING: 'pending',
    CLOSED: 'closed',
});

module.exports = {
    DOCUMENT_STATUSES,
    COMMENT_STATUSES,
    POINT_EVENT_STATUSES,
    QA_SESSION_STATUSES,
    REPORT_QUEUE_STATUSES,
};
