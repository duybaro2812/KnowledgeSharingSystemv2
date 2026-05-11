const fs = require('fs/promises');
const documentAccessModel = require('../../../models/document-access.model');
const documentPreviewService = require('../../../services/document-preview.service');
const { POINT_POLICY } = require('../../../config/point-policy');
const pdfParse = require('pdf-parse');

const LOCKED_PREVIEW_MIN_TOTAL_PAGES = 5;
const LOCKED_PREVIEW_PAGE_LIMIT = 3;

const parseDocumentId = (id) => {
    const documentId = Number(id);

    if (!Number.isInteger(documentId) || documentId <= 0) {
        const error = new Error('A valid document id is required.');
        error.statusCode = 400;
        throw error;
    }

    return documentId;
};

const buildSafePdfFileName = (title) => {
    const safeBaseName = String(title || 'document')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, '')
        .replace(/[\\/:*?"<>|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || 'document';

    return `${safeBaseName}.pdf`;
};

const buildAttachmentDisposition = (title) => {
    const asciiFileName = buildSafePdfFileName(title).replace(/"/g, '');
    const utf8FileName = `${String(title || 'document')
        .replace(/[\\/:*?"<>|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || 'document'}.pdf`;

    return `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(utf8FileName)}`;
};

const buildGuestLockedOverlay = () => ({
    title: 'Bạn chưa đăng nhập',
    message: 'Bạn chưa đăng nhập, vui lòng đăng nhập hoặc đăng ký tài khoản.',
    helperText: 'Đăng nhập hoặc tạo tài khoản để kiếm điểm, xem đầy đủ và tải tài liệu.',
    requiredPoints: POINT_POLICY.unlock.previewThreshold,
});

const buildGuestLoginRequiredOverlay = () => ({
    title: 'Vui lòng đăng nhập',
    message: 'Vui lòng đăng nhập để tiếp tục xem tài liệu này.',
    helperText: 'Tài liệu dưới 5 trang yêu cầu đăng nhập để truy cập.',
    requiredPoints: POINT_POLICY.unlock.previewThreshold,
});

const buildLockedInsufficientPointsOverlay = () => ({
    title: 'Không đủ điểm',
    message: `Bạn cần tối thiểu ${POINT_POLICY.unlock.previewThreshold} điểm để truy cập tài liệu này.`,
    helperText: 'Tài liệu dưới 5 trang không cho phép xem trước khi chưa đủ điểm.',
    requiredPoints: POINT_POLICY.unlock.previewThreshold,
});

const getPreparedViewerTotalPages = async ({ documentId, preparedViewer }) => {
    if (String(preparedViewer?.viewerKind || '').toLowerCase() !== 'pdf') {
        return null;
    }

    const viewerFile = await documentPreviewService.getPreparedDocumentViewerFile(documentId);
    if (!viewerFile?.absolutePath) {
        return null;
    }

    const buffer = await fs.readFile(viewerFile.absolutePath);
    const parsed = await pdfParse(buffer);
    const pageCount = Number(parsed?.numpages || 0);

    return Number.isInteger(pageCount) && pageCount > 0 ? pageCount : null;
};

const applyLockedPreviewPolicyByPageCount = ({
    policy,
    totalPages,
    mode,
}) => {
    if (!policy || !policy.isLocked) {
        return policy;
    }

    if (!Number.isInteger(totalPages) || totalPages <= 0) {
        return {
            ...policy,
            canPreview: false,
            previewPageLimit: 0,
        };
    }

    if (totalPages > LOCKED_PREVIEW_MIN_TOTAL_PAGES) {
        return {
            ...policy,
            canPreview: true,
            previewPageLimit: LOCKED_PREVIEW_PAGE_LIMIT,
        };
    }

    if (mode === 'guest') {
        return {
            ...policy,
            canPreview: false,
            previewPageLimit: 0,
            reason: 'Vui lòng đăng nhập.',
            lockedOverlay: buildGuestLoginRequiredOverlay(),
        };
    }

    return {
        ...policy,
        canPreview: false,
        previewPageLimit: 0,
        reason: `Bạn cần tối thiểu ${POINT_POLICY.unlock.previewThreshold} điểm để truy cập tài liệu này.`,
        lockedOverlay: buildLockedInsufficientPointsOverlay(),
    };
};

const toViewerPayload = ({
    documentId,
    preparedViewer,
    canPreview = true,
    canFullView = false,
}) => {
    const previewViewerUrl = canPreview && preparedViewer.viewerUrl
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
        const totalPages = await getPreparedViewerTotalPages({
            documentId,
            preparedViewer,
        });
        const effectivePolicy =
            policy.accessState === 'locked_points'
                ? applyLockedPreviewPolicyByPageCount({
                    policy,
                    totalPages,
                    mode: 'points',
                })
                : policy;

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
                    canPreview: effectivePolicy.canPreview,
                    canFullView: effectivePolicy.canFullView,
                }),
                totalPages,
                ...effectivePolicy,
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

        const viewLogResult =
            policy.accessState === 'limited_full'
                ? await documentAccessModel.createLimitedFullViewAccessLog({
                    documentId,
                    viewerUserId: req.user.userId,
                    dailyViewLimit: policy.dailyViewLimit,
                    pointsCost: 0,
                })
                : await documentAccessModel.createAccessLog({
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
                viewLog: viewLogResult || null,
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

        const hasRecentDownloadAccess = await documentAccessModel.hasRecentDownloadAccess({
            userId: req.user.userId,
            documentId,
        });

        if (!policy.canDownload && !hasRecentDownloadAccess) {
            const error = new Error(policy.reason || 'Download is locked for this account.');
            error.statusCode = 403;
            throw error;
        }

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

        res.json({
            success: true,
            message: 'Download access granted. Open the protected download URL to receive the file.',
            data: {
                documentId,
                documentTitle: document.title,
                originalFileName: document.originalFileName,
                fileUrl: `/api/documents/${documentId}/download/content`,
                fileFormat: 'pdf',
                suggestedFileName: buildSafePdfFileName(document.title),
                chargedPoints: 0,
                remainingPoints: policy.points,
                willChargePoints: hasRecentDownloadAccess ? 0 : Number(policy.downloadCost || 0),
                hasRecentDownloadAccess,
                downloadConfirmation: policy.downloadConfirmation,
            },
        });
    } catch (error) {
        next(error);
    }
};
const streamPreparedDownloadContent = async (req, res, next) => {
    try {
        const documentId = parseDocumentId(req.params.id);
        const document = await documentAccessModel.getDocumentForAccess(documentId);
        const policy = await documentAccessModel.buildAccessPolicy({
            userId: req.user.userId,
            role: req.user.role,
            document,
        });
        const hasRecentDownloadAccess = await documentAccessModel.hasRecentDownloadAccess({
            userId: req.user.userId,
            documentId,
        });

        if (!policy.canDownload && !hasRecentDownloadAccess) {
            const error = new Error(policy.reason || 'Download is locked for this account.');
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

        const preparedViewerFile =
            viewerFile || (await documentPreviewService.getPreparedDocumentViewerFile(documentId));

        if (!preparedViewerFile) {
            const error = new Error('Prepared download file is not available yet.');
            error.statusCode = 404;
            throw error;
        }

        let chargedPoints = 0;
        let remainingPoints = policy.points;
        if (!hasRecentDownloadAccess && policy.downloadCost && policy.downloadCost > 0) {
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

        res.setHeader('Content-Type', preparedViewerFile.mimeType);
        res.setHeader('Cache-Control', 'private, max-age=60');
        res.setHeader('X-Download-Charged-Points', String(chargedPoints));
        res.setHeader('X-Download-Remaining-Points', String(remainingPoints));
        res.setHeader(
            'Content-Disposition',
            buildAttachmentDisposition(document.title)
        );
        res.sendFile(preparedViewerFile.absolutePath);
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
        const totalPages = await getPreparedViewerTotalPages({
            documentId,
            preparedViewer,
        });
        const guestPolicy = applyLockedPreviewPolicyByPageCount({
            policy: {
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
            },
            totalPages,
            mode: 'guest',
        });

        res.json({
            success: true,
            message: 'Public preview fetched successfully.',
            data: {
                documentId,
                documentTitle: document.title,
                originalFileName: document.originalFileName,
                totalPages,
                ...guestPolicy,
                viewer: {
                    ...preparedViewer,
                    viewerUrl: '',
                    previewViewerUrl: guestPolicy.canPreview && preparedViewer.viewerUrl
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

        if (String(preparedViewerFile.kind || '').toLowerCase() === 'pdf') {
            const buffer = await fs.readFile(preparedViewerFile.absolutePath);
            const parsed = await pdfParse(buffer);
            const totalPages = Number(parsed?.numpages || 0);
            const canPreview =
                Number.isInteger(totalPages) && totalPages > LOCKED_PREVIEW_MIN_TOTAL_PAGES;
            if (!canPreview) {
                const error = new Error('Preview is unavailable for documents with 5 pages or fewer.');
                error.statusCode = 403;
                throw error;
            }
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
    streamPreparedDownloadContent,
    streamPreparedViewerContent,
    getDocumentViewer,
    getPublicDocumentPreview,
    streamPublicPreviewContent,
};
