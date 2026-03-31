const documentAccessModel = require('../models/document-access.model');

const parseDocumentId = (id) => {
    const documentId = Number(id);

    if (!Number.isInteger(documentId) || documentId <= 0) {
        const error = new Error('A valid document id is required.');
        error.statusCode = 400;
        throw error;
    }

    return documentId;
};

const getDocumentAccessPolicy = async (req, res, next) => {
    try {
        const documentId = parseDocumentId(req.params.id);
        const document = await documentAccessModel.getDocumentForAccess(documentId);

        const policy = await documentAccessModel.buildAccessPolicy({
            userId: req.user.userId,
            role: req.user.role,
            document,
        });

        res.json({
            success: true,
            message: 'Document access policy fetched successfully.',
            data: {
                documentId,
                ...policy,
            },
        });
    } catch (error) {
        next(error);
    }
};

const registerFullView = async (req, res, next) => {
    try {
        const documentId = parseDocumentId(req.params.id);
        const document = await documentAccessModel.getDocumentForAccess(documentId);

        const policy = await documentAccessModel.buildAccessPolicy({
            userId: req.user.userId,
            role: req.user.role,
            document,
        });

        if (!policy.canFullView) {
            const error = new Error(policy.reason || 'Full view is locked for this account.');
            error.statusCode = 403;
            throw error;
        }

        await documentAccessModel.createAccessLog({
            documentId,
            viewerUserId: req.user.userId,
            accessType: 'full_view',
            pointsCost: 0,
        });

        const refreshedPolicy = await documentAccessModel.buildAccessPolicy({
            userId: req.user.userId,
            role: req.user.role,
            document,
        });

        res.json({
            success: true,
            message: 'Full-view access granted.',
            data: {
                documentId,
                fileUrl: document.fileUrl,
                originalFileName: document.originalFileName,
                policy: refreshedPolicy,
            },
        });
    } catch (error) {
        next(error);
    }
};

const registerDownload = async (req, res, next) => {
    try {
        const documentId = parseDocumentId(req.params.id);
        const document = await documentAccessModel.getDocumentForAccess(documentId);

        const policy = await documentAccessModel.buildAccessPolicy({
            userId: req.user.userId,
            role: req.user.role,
            document,
        });

        if (!policy.canDownload) {
            const error = new Error(policy.reason || 'Download is locked for this account.');
            error.statusCode = 403;
            throw error;
        }

        let remainingPoints = policy.points;
        let chargedPoints = 0;

        if (policy.downloadCost && policy.downloadCost > 0) {
            remainingPoints = await documentAccessModel.chargeDownloadPoints({
                userId: req.user.userId,
                documentId,
                pointsCost: policy.downloadCost,
                description: `Download cost for document #${documentId}`,
            });
            chargedPoints = policy.downloadCost;
        }

        await documentAccessModel.createAccessLog({
            documentId,
            viewerUserId: req.user.userId,
            accessType: 'download',
            pointsCost: chargedPoints,
        });

        res.json({
            success: true,
            message: 'Download access granted.',
            data: {
                documentId,
                fileUrl: document.fileUrl,
                chargedPoints,
                remainingPoints,
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDocumentAccessPolicy,
    registerFullView,
    registerDownload,
};
