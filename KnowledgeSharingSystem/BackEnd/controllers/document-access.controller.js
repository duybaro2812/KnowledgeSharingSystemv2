const documentAccessModel = require('../models/document-access.model');
const documentPreviewService = require('../services/document-preview.service');

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
        const preparedViewer = await documentPreviewService.getPreparedDocumentViewer({
            documentId,
            fileUrl: document.fileUrl,
            originalFileName: document.originalFileName,
            mimeType: document.mimeType,
            title: document.title,
        });

        res.json({
            success: true,
            message: 'Document access policy fetched successfully.',
            data: {
                documentId,
                documentTitle: document.title,
                originalFileName: document.originalFileName,
                viewer: {
                    ...preparedViewer,
                    viewerUrl:
                        policy.canFullView && preparedViewer.viewerUrl
                            ? `/api/documents/${documentId}/viewer/content`
                            : '',
                    blockedByPolicy: !policy.canFullView,
                },
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
        const preparedViewer = await documentPreviewService.getPreparedDocumentViewer({
            documentId,
            fileUrl: document.fileUrl,
            originalFileName: document.originalFileName,
            mimeType: document.mimeType,
            title: document.title,
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
                viewer: {
                    ...preparedViewer,
                    viewerUrl: preparedViewer.viewerUrl
                        ? `/api/documents/${documentId}/viewer/content`
                        : '',
                    blockedByPolicy: false,
                },
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
        const preparedViewer = await documentPreviewService.getPreparedDocumentViewer({
            documentId,
            fileUrl: document.fileUrl,
            originalFileName: document.originalFileName,
            mimeType: document.mimeType,
            title: document.title,
        });

        if (preparedViewer.status !== 'ready' || preparedViewer.viewerKind !== 'pdf' || !preparedViewer.viewerUrl) {
            const error = new Error(
                preparedViewer.reason ||
                    'This document cannot be converted to PDF for download right now.'
            );
            error.statusCode = 400;
            throw error;
        }

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

        const suggestedFileName = `${document.title || 'document'}`
            .replace(/[\\/:*?"<>|]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim() || 'document';

        res.json({
            success: true,
            message: 'Download access granted. Prepared PDF is ready.',
            data: {
                documentId,
                documentTitle: document.title,
                originalFileName: document.originalFileName,
                fileUrl: preparedViewer.viewerUrl,
                fileFormat: 'pdf',
                suggestedFileName: `${suggestedFileName}.pdf`,
                chargedPoints,
                remainingPoints,
                downloadConfirmation: chargedPoints > 0
                    ? {
                        accepted: true,
                        message: `Đã trừ ${chargedPoints} điểm để tải tài liệu "${document.title}".`,
                    }
                    : null,
            },
        });
    } catch (error) {
        next(error);
    }
};

const streamPreparedViewerContent = async (req, res, next) => {
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

        const viewerFile = await documentPreviewService.getPreparedDocumentViewerFile(documentId);

        if (!viewerFile) {
            const error = new Error('Prepared viewer file is not available yet.');
            error.statusCode = 404;
            throw error;
        }

        res.setHeader('Content-Type', viewerFile.mimeType);
        res.setHeader('Cache-Control', 'private, max-age=60');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('Content-Disposition', 'inline');
        res.sendFile(viewerFile.absolutePath);
    } catch (error) {
        next(error);
    }
};

const getDocumentViewer = async (req, res, next) => {
    try {
        const documentId = parseDocumentId(req.params.id);
        const document = await documentAccessModel.getDocumentForAccess(documentId);

        const policy = await documentAccessModel.buildAccessPolicy({
            userId: req.user.userId,
            role: req.user.role,
            document,
        });
        const preparedViewer = await documentPreviewService.getPreparedDocumentViewer({
            documentId,
            fileUrl: document.fileUrl,
            originalFileName: document.originalFileName,
            mimeType: document.mimeType,
            title: document.title,
        });

        res.json({
            success: true,
            message: 'Prepared document viewer fetched successfully.',
            data: {
                documentId,
                documentTitle: document.title,
                originalFileName: document.originalFileName,
                policy,
                viewer: {
                    ...preparedViewer,
                    viewerUrl:
                        policy.canFullView && preparedViewer.viewerUrl
                            ? `/api/documents/${documentId}/viewer/content`
                            : '',
                    blockedByPolicy: !policy.canFullView,
                },
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
    streamPreparedViewerContent,
    getDocumentViewer,
};
