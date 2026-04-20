const documentAccessModel = require('../models/document-access.model');
const documentPreviewService = require('../services/document-preview.service');
const { POINT_POLICY } = require('../config/point-policy');

const parseDocumentId = (id) => {
    const documentId = Number(id);

    if (!Number.isInteger(documentId) || documentId <= 0) {
        const error = new Error('A valid document id is required.');
        error.statusCode = 400;
        throw error;
    }

    return documentId;
};

const buildGuestLockedOverlay = () => ({
    title: 'Bạn chưa đăng nhập',
    message: 'Bạn chưa đăng nhập, vui lòng đăng nhập hoặc đăng ký tài khoản.',
    helperText: 'Đăng nhập hoặc tạo tài khoản để kiếm điểm, xem đầy đủ và tải tài liệu.',
    requiredPoints: POINT_POLICY.unlock.previewThreshold,
});

const toViewerPayload = ({
    documentId,
    preparedViewer,
    canFullView = false,
}) => {
    const previewViewerUrl = preparedViewer.viewerUrl
        ? `/api/documents/${documentId}/preview/content`
        : '';

    return {
        ...preparedViewer,
        viewerUrl:
            canFullView && preparedViewer.viewerUrl
                ? `/api/documents/${documentId}/viewer/content`
                : '',
        previewViewerUrl,
        blockedByPolicy: !canFullView,
    };
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
                viewer: toViewerPayload({
                    documentId,
                    preparedViewer,
                    canFullView: policy.canFullView,
                }),
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
                viewer: toViewerPayload({
                    documentId,
                    preparedViewer,
                    canFullView: true,
                }),
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
            await documentPreviewService.getPreparedDocumentViewer({
                documentId,
                fileUrl: document.fileUrl,
                originalFileName: document.originalFileName,
                mimeType: document.mimeType,
                title: document.title,
                forcePrepare: true,
            });
        }

        const preparedViewerFile = viewerFile || await documentPreviewService.getPreparedDocumentViewerFile(documentId);

        if (!preparedViewerFile) {
            const error = new Error('Prepared viewer file is not available yet.');
            error.statusCode = 404;
            throw error;
        }

        res.setHeader('Content-Type', preparedViewerFile.mimeType);
        res.setHeader('Cache-Control', 'private, max-age=60');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('Content-Disposition', 'inline');
        res.sendFile(preparedViewerFile.absolutePath);
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
                viewer: toViewerPayload({
                    documentId,
                    preparedViewer,
                    canFullView: policy.canFullView,
                }),
            },
        });
    } catch (error) {
        next(error);
    }
};

const getPublicDocumentPreview = async (req, res, next) => {
    try {
        const documentId = parseDocumentId(req.params.id);
        const document = await documentAccessModel.getDocumentForAccess(documentId);

        if (!document || document.status !== 'approved') {
            const error = new Error('Document not found.');
            error.statusCode = 404;
            throw error;
        }

        const preparedViewer = await documentPreviewService.getPreparedDocumentViewer({
            documentId,
            fileUrl: document.fileUrl,
            originalFileName: document.originalFileName,
            mimeType: document.mimeType,
            title: document.title,
        });

        res.json({
            success: true,
            message: 'Public preview fetched successfully.',
            data: {
                documentId,
                documentTitle: document.title,
                originalFileName: document.originalFileName,
                accessState: 'guest_locked',
                points: 0,
                requiredPoints: POINT_POLICY.unlock.previewThreshold,
                previewPageLimit: POINT_POLICY.unlock.previewPageLimitWhenLocked || 5,
                isLocked: true,
                canPreview: true,
                canFullView: false,
                canDownload: false,
                canComment: true,
                canDiscuss: true,
                canAskQuestion: true,
                tier: 'guest_locked',
                reason: 'Please login/register to unlock full access.',
                lockedOverlay: buildGuestLockedOverlay(),
                viewer: {
                    ...preparedViewer,
                    viewerUrl: '',
                    previewViewerUrl: preparedViewer.viewerUrl
                        ? `/api/documents/${documentId}/preview/content`
                        : '',
                    blockedByPolicy: true,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const streamPublicPreviewContent = async (req, res, next) => {
    try {
        const documentId = parseDocumentId(req.params.id);
        const document = await documentAccessModel.getDocumentForAccess(documentId);

        if (!document || document.status !== 'approved') {
            const error = new Error('Document not found.');
            error.statusCode = 404;
            throw error;
        }

        const viewerFile = await documentPreviewService.getPreparedDocumentViewerFile(documentId);

        if (!viewerFile) {
            await documentPreviewService.getPreparedDocumentViewer({
                documentId,
                fileUrl: document.fileUrl,
                originalFileName: document.originalFileName,
                mimeType: document.mimeType,
                title: document.title,
                forcePrepare: true,
            });
        }

        const preparedViewerFile =
            viewerFile || (await documentPreviewService.getPreparedDocumentViewerFile(documentId));

        if (!preparedViewerFile) {
            const error = new Error('Prepared preview file is not available yet.');
            error.statusCode = 404;
            throw error;
        }

        res.setHeader('Content-Type', preparedViewerFile.mimeType);
        res.setHeader('Cache-Control', 'public, max-age=120');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('Content-Disposition', 'inline');
        res.sendFile(preparedViewerFile.absolutePath);
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
    getPublicDocumentPreview,
    streamPublicPreviewContent,
};
