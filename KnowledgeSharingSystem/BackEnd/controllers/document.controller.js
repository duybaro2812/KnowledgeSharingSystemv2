const crypto = require('crypto');
const documentModel = require('../models/document.model');
const reportModel = require('../models/report.model');
const notificationModel = require('../models/notification.model');
const userModel = require('../models/user.model');
const {
    uploadDocumentBuffer,
    isCloudinaryAssetUrl,
    deleteCloudinaryRawByUrl,
    deleteLocalUploadedFileByUrl,
} = require('../services/cloudinary.service');

const getFileHashFromBuffer = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

const deleteStoredDocumentFile = async (fileUrl) => {
    if (isCloudinaryAssetUrl(fileUrl)) {
        return deleteCloudinaryRawByUrl(fileUrl);
    }

    return deleteLocalUploadedFileByUrl(fileUrl);
};

const notifyModerationTeam = async ({ type, title, message, metadata = null }) => {
    const moderationUsers = await userModel.getActiveModeratorsAndAdmins();

    if (!moderationUsers.length) {
        return 0;
    }

    await Promise.all(
        moderationUsers.map((moderator) =>
            notificationModel.createNotification({
                userId: moderator.userId,
                type,
                title,
                message,
                metadata,
            })
        )
    );

    return moderationUsers.length;
};

const getDocuments = async (req, res, next) => {
    try {
        const { keyword, categoryId, categoryKeyword } = req.query;
        const parsedCategoryId = categoryId ? Number(categoryId) : null;

        if (categoryId && (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0)) {
            const error = new Error('categoryId must be a valid integer.');
            error.statusCode = 400;
            throw error;
        }

        const documents = await documentModel.searchApprovedDocuments({
            keyword,
            categoryId: parsedCategoryId,
            categoryKeyword: categoryKeyword ? String(categoryKeyword).trim() : null,
        });

        res.json({
            success: true,
            message: 'Approved documents fetched successfully.',
            data: documents,
        });
    } catch (error) {
        next(error);
    }
};

const getDocumentDetail = async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);

        if (!Number.isInteger(documentId) || documentId <= 0) {
            const error = new Error('A valid document id is required.');
            error.statusCode = 400;
            throw error;
        }

        const document = await documentModel.getDocumentDetailById(documentId);

        res.json({
            success: true,
            message: 'Document detail fetched successfully.',
            data: document,
        });
    } catch (error) {
        next(error);
    }
};

const createDocument = async (req, res, next) => {
    try {
        const { title, description, categoryIds } = req.body;

        if (!title) {
            const error = new Error('Title is required.');
            error.statusCode = 400;
            throw error;
        }

        if (!req.file) {
            const error = new Error('A document file is required.');
            error.statusCode = 400;
            throw error;
        }

        const cloudUploadResult = await uploadDocumentBuffer({
            buffer: req.file.buffer,
            originalFileName: req.file.originalname,
        });

        const fileUrl = cloudUploadResult.secure_url || cloudUploadResult.url;
        const fileHash = getFileHashFromBuffer(req.file.buffer);

        const documentId = await documentModel.createDocument({
            ownerUserId: req.user.userId,
            title,
            description,
            fileUrl,
            originalFileName: req.file.originalname,
            fileSizeBytes: req.file.size,
            mimeType: req.file.mimetype,
            fileHash,
            categoryIds,
        });

        const document = await documentModel.getDocumentDetailById(documentId);

        res.status(201).json({
            success: true,
            message: 'Document created successfully.',
            data: document,
        });
    } catch (error) {
        next(error);
    }
};

const updateDocument = async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const { title, description, categoryIds } = req.body;

        if (!Number.isInteger(documentId) || documentId <= 0) {
            const error = new Error('A valid document id is required.');
            error.statusCode = 400;
            throw error;
        }

        if (!title) {
            const error = new Error('Title is required.');
            error.statusCode = 400;
            throw error;
        }

        const existingDocument = await documentModel.getDocumentDetailById(documentId);
        const isOwner = existingDocument.ownerUserId === req.user.userId;
        const isPrivileged = ['admin', 'moderator'].includes(req.user.role);

        if (!isOwner && !isPrivileged) {
            const error = new Error('You do not have permission to update this document.');
            error.statusCode = 403;
            throw error;
        }

        let fileUrl = existingDocument.fileUrl;
        let originalFileName = existingDocument.originalFileName;
        let fileSizeBytes = existingDocument.fileSizeBytes;
        let mimeType = existingDocument.mimeType;
        let fileHash = existingDocument.fileHash;

        if (req.file) {
            const cloudUploadResult = await uploadDocumentBuffer({
                buffer: req.file.buffer,
                originalFileName: req.file.originalname,
            });

            fileUrl = cloudUploadResult.secure_url || cloudUploadResult.url;
            originalFileName = req.file.originalname;
            fileSizeBytes = req.file.size;
            mimeType = req.file.mimetype;
            fileHash = getFileHashFromBuffer(req.file.buffer);
        }

        await documentModel.updateDocument({
            documentId,
            title,
            description,
            fileUrl,
            originalFileName,
            fileSizeBytes,
            mimeType,
            fileHash,
            categoryIds,
        });

        const updatedDocument = await documentModel.getDocumentDetailById(documentId);

        res.json({
            success: true,
            message: 'Document updated successfully.',
            data: updatedDocument,
        });
    } catch (error) {
        next(error);
    }
};

const getDuplicateCandidates = async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);

        if (!Number.isInteger(documentId) || documentId <= 0) {
            const error = new Error('A valid document id is required.');
            error.statusCode = 400;
            throw error;
        }

        const candidates = await documentModel.findDuplicateDocumentCandidates(documentId);

        res.json({
            success: true,
            message: 'Duplicate candidates fetched successfully.',
            data: candidates,
        });
    } catch (error) {
        next(error);
    }
};

const getAllUploadedDocuments = async (req, res, next) => {
    try {
        const { status, ownerUserId } = req.query;
        let parsedOwnerUserId = null;

        if (ownerUserId !== undefined) {
            parsedOwnerUserId = Number(ownerUserId);

            if (!Number.isInteger(parsedOwnerUserId) || parsedOwnerUserId <= 0) {
                const error = new Error('ownerUserId must be a valid integer.');
                error.statusCode = 400;
                throw error;
            }
        }

        const documents = await documentModel.getUploadedDocuments({
            ownerUserId: parsedOwnerUserId,
            status: status || null,
        });

        res.json({
            success: true,
            message: 'Uploaded documents fetched successfully.',
            data: documents,
        });
    } catch (error) {
        next(error);
    }
};

const getMyUploadedDocuments = async (req, res, next) => {
    try {
        const { status } = req.query;

        const documents = await documentModel.getUploadedDocuments({
            ownerUserId: req.user.userId,
            status: status || null,
        });

        res.json({
            success: true,
            message: 'Your uploaded documents fetched successfully.',
            data: documents,
        });
    } catch (error) {
        next(error);
    }
};

const getPendingDocuments = async (req, res, next) => {
    try {
        const documents = await documentModel.getPendingDocuments();

        res.json({
            success: true,
            message: 'Pending documents fetched successfully.',
            data: documents,
        });
    } catch (error) {
        next(error);
    }
};

const createDocumentReport = async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const { reason } = req.body;

        if (!Number.isInteger(documentId) || documentId <= 0) {
            const error = new Error('A valid document id is required.');
            error.statusCode = 400;
            throw error;
        }

        if (!reason || !String(reason).trim()) {
            const error = new Error('Report reason is required.');
            error.statusCode = 400;
            throw error;
        }

        const document = await documentModel.getDocumentDetailById(documentId);

        if (!document) {
            const error = new Error('Document not found.');
            error.statusCode = 404;
            throw error;
        }

        if (document.status === 'rejected') {
            const error = new Error('This document cannot be reported.');
            error.statusCode = 400;
            throw error;
        }

        let reportResult;

        try {
            reportResult = await reportModel.createDocumentReport({
                documentId,
                reporterUserId: req.user.userId,
                reason: String(reason).trim(),
            });
        } catch (error) {
            if (error.number === 56702 || error.number === 56703) {
                error.statusCode = 409;
            }
            throw error;
        }

        try {
            await notifyModerationTeam({
                type: 'document_reported',
                title: 'New document report',
                message: `Document "${document.title}" received a new report and needs moderation review.`,
                metadata: {
                    documentId,
                    reason: String(reason).trim(),
                    uniqueReporterCount: reportResult.uniqueReporterCount,
                    threshold: reportModel.REPORT_AUTO_LOCK_THRESHOLD,
                    autoLocked: Boolean(reportResult.wasAutoLocked),
                },
            });
        } catch (notifyError) {
            console.error('Failed to notify moderation team for new report:', notifyError.message);
        }

        if (reportResult.wasAutoLocked) {
            try {
                await notificationModel.createNotification({
                    userId: reportResult.ownerUserId,
                    type: 'document_auto_locked',
                    title: 'Document locked due to reports',
                    message: `Your document "${document.title}" was auto-locked because it received more than ${reportModel.REPORT_AUTO_LOCK_THRESHOLD} reports.`,
                    metadata: {
                        documentId,
                        uniqueReporterCount: reportResult.uniqueReporterCount,
                    },
                });
            } catch (notifyError) {
                console.error('Failed to create auto-lock notification for owner:', notifyError.message);
            }
        }

        res.status(201).json({
            success: true,
            message: reportResult.wasAutoLocked
                ? 'Report submitted. Document was auto-locked and sent to moderation.'
                : 'Report submitted successfully.',
            data: {
                reportId: reportResult.reportId,
                documentId,
                uniqueReporterCount: reportResult.uniqueReporterCount,
                autoLocked: Boolean(reportResult.wasAutoLocked),
                lockThreshold: reportModel.REPORT_AUTO_LOCK_THRESHOLD,
            },
        });
    } catch (error) {
        next(error);
    }
};

const getPendingReportedDocuments = async (req, res, next) => {
    try {
        const reportedDocuments = await reportModel.getPendingDocumentReportQueue();

        res.json({
            success: true,
            message: 'Pending reported documents fetched successfully.',
            data: reportedDocuments,
        });
    } catch (error) {
        next(error);
    }
};

const resolveReportedDocument = async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const { action, note, penaltyPoints } = req.body;

        if (!Number.isInteger(documentId) || documentId <= 0) {
            const error = new Error('A valid document id is required.');
            error.statusCode = 400;
            throw error;
        }

        if (!['unlock', 'delete'].includes(action)) {
            const error = new Error("action must be either 'unlock' or 'delete'.");
            error.statusCode = 400;
            throw error;
        }

        let parsedPenaltyPoints = 0;

        if (penaltyPoints !== undefined && penaltyPoints !== null && penaltyPoints !== '') {
            parsedPenaltyPoints = Number(penaltyPoints);

            if (!Number.isInteger(parsedPenaltyPoints) || parsedPenaltyPoints < 0) {
                const error = new Error('penaltyPoints must be a non-negative integer.');
                error.statusCode = 400;
                throw error;
            }
        }

        if (action === 'unlock' && parsedPenaltyPoints > 0) {
            const error = new Error('penaltyPoints is only supported when action is delete.');
            error.statusCode = 400;
            throw error;
        }

        const document = await documentModel.getDocumentDetailById(documentId);

        if (!document) {
            const error = new Error('Document not found.');
            error.statusCode = 404;
            throw error;
        }

        if (action === 'unlock') {
            await documentModel.updateDocumentStatus({
                documentId,
                status: 'approved',
            });

            const resolvedReports = await reportModel.resolveOpenDocumentReports({
                documentId,
                reviewedByUserId: req.user.userId,
                status: 'dismissed',
                reviewNote: note || 'Document is valid after moderation review.',
            });

            await documentModel.logDocumentModerationAction({
                userId: req.user.userId,
                action: 'resolve_report_unlock_document',
                documentId,
            });

            try {
                await notificationModel.createNotification({
                    userId: document.ownerUserId,
                    type: 'document_unlocked',
                    title: 'Document restored',
                    message: `Your document "${document.title}" passed moderation review and is available again.`,
                    metadata: {
                        documentId,
                        action,
                        note: note || null,
                        resolvedReports,
                    },
                });
            } catch (notifyError) {
                console.error('Failed to create unlock-after-report notification:', notifyError.message);
            }

            const updatedDocument = await documentModel.getDocumentDetailById(documentId);

            res.json({
                success: true,
                message: 'Reported document was unlocked successfully.',
                data: {
                    document: updatedDocument,
                    moderation: {
                        action,
                        note: note || null,
                        resolvedReports,
                    },
                },
            });

            return;
        }

        const resolvedReports = await reportModel.resolveOpenDocumentReports({
            documentId,
            reviewedByUserId: req.user.userId,
            status: 'resolved',
            reviewNote: note || 'Document violated policy and was deleted.',
        });

        let storageDeleteResult = null;

        try {
            storageDeleteResult = await deleteStoredDocumentFile(document.fileUrl);
        } catch (storageError) {
            const error = new Error(`Failed to delete stored file: ${storageError.message}`);
            error.statusCode = 500;
            throw error;
        }

        const deleteResult = await documentModel.deleteDocumentById({
            documentId,
            deletedByUserId: req.user.userId,
            penaltyPoints: parsedPenaltyPoints,
            penaltyNote: note || null,
        });

        try {
            const pointMessage =
                deleteResult.deductedPoints > 0
                    ? ` ${deleteResult.deductedPoints} points were deducted from your account.`
                    : '';

            await notificationModel.createNotification({
                userId: document.ownerUserId,
                type: 'document_deleted',
                title: 'Document deleted by moderation',
                message: `Your document "${document.title}" was deleted after report review.${pointMessage}`,
                metadata: {
                    documentId,
                    action,
                    note: note || null,
                    deductedPoints: deleteResult.deductedPoints,
                    resolvedReports,
                },
            });
        } catch (notifyError) {
            console.error('Failed to create delete-after-report notification:', notifyError.message);
        }

        res.json({
            success: true,
            message: 'Reported document was deleted successfully.',
            data: {
                documentId,
                deletedStorage: storageDeleteResult,
                moderation: {
                    action,
                    note: note || null,
                    resolvedReports,
                    deductedPoints: deleteResult.deductedPoints,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const reviewDocument = async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const { decision, note } = req.body;

        if (!Number.isInteger(documentId) || documentId <= 0) {
            const error = new Error('A valid document id is required.');
            error.statusCode = 400;
            throw error;
        }

        if (!['approved', 'rejected'].includes(decision)) {
            const error = new Error("decision must be either 'approved' or 'rejected'.");
            error.statusCode = 400;
            throw error;
        }

        if (decision === 'rejected' && (!note || !String(note).trim())) {
            const error = new Error('A rejection note is required when decision is rejected.');
            error.statusCode = 400;
            throw error;
        }

        const document = await documentModel.getDocumentDetailById(documentId);

        if (!document) {
            const error = new Error('Document not found.');
            error.statusCode = 404;
            throw error;
        }

        await documentModel.reviewDocument({
            documentId,
            moderatorUserId: req.user.userId,
            decision,
            note: note || null,
        });

        const updatedDocument = await documentModel.getDocumentDetailById(documentId);

        const responseData = {
            document: updatedDocument,
            review: {
                decision,
                note: note || null,
                moderatorUserId: req.user.userId,
            },
        };

        if (decision === 'rejected') {
            try {
                await notificationModel.createNotification({
                    userId: updatedDocument.ownerUserId,
                    type: 'document_rejected',
                    title: 'Document was rejected',
                    message: 'Your document was rejected because it is invalid.',
                    metadata: {
                        documentId,
                        decision,
                        note: note || null,
                    },
                });
            } catch (notifyError) {
                console.error('Failed to create reject notification:', notifyError.message);
            }

            responseData.userNotification = {
                userId: updatedDocument.ownerUserId,
                message: 'Your document was rejected because it is invalid.',
            };
        } else {
            try {
                await notificationModel.createNotification({
                    userId: updatedDocument.ownerUserId,
                    type: 'document_upload_success',
                    title: 'Upload Success',
                    message: `Your document "${updatedDocument.title}" has been approved by moderator.`,
                    metadata: {
                        documentId,
                        decision,
                        note: note || null,
                    },
                });
            } catch (notifyError) {
                console.error('Failed to create approve notification:', notifyError.message);
            }
        }

        res.json({
            success: true,
            message:
                decision === 'approved'
                    ? 'Document approved successfully.'
                    : 'Document rejected successfully.',
            data: responseData,
        });
    } catch (error) {
        next(error);
    }
};

const lockDocument = async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const { reason } = req.body;

        if (!Number.isInteger(documentId) || documentId <= 0) {
            const error = new Error('A valid document id is required.');
            error.statusCode = 400;
            throw error;
        }

        if (!reason || !String(reason).trim()) {
            const error = new Error('A lock reason is required.');
            error.statusCode = 400;
            throw error;
        }

        const document = await documentModel.getDocumentDetailById(documentId);

        if (!document) {
            const error = new Error('Document not found.');
            error.statusCode = 404;
            throw error;
        }

        if (document.status === 'hidden') {
            const error = new Error('Document is already locked.');
            error.statusCode = 400;
            throw error;
        }

        await documentModel.updateDocumentStatus({
            documentId,
            status: 'hidden',
        });

        await documentModel.logDocumentModerationAction({
            userId: req.user.userId,
            action: 'lock_document',
            documentId,
        });

        try {
            await notificationModel.createNotification({
                userId: document.ownerUserId,
                type: 'document_locked',
                title: 'Document locked for review',
                message: `Your document "${document.title}" was locked for moderation review.`,
                metadata: {
                    documentId,
                    reason,
                },
            });
        } catch (notifyError) {
            console.error('Failed to create lock notification:', notifyError.message);
        }

        const updatedDocument = await documentModel.getDocumentDetailById(documentId);

        res.json({
            success: true,
            message: 'Document locked successfully.',
            data: {
                document: updatedDocument,
                moderation: {
                    action: 'locked',
                    reason,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const unlockDocument = async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const { note } = req.body;

        if (!Number.isInteger(documentId) || documentId <= 0) {
            const error = new Error('A valid document id is required.');
            error.statusCode = 400;
            throw error;
        }

        const document = await documentModel.getDocumentDetailById(documentId);

        if (!document) {
            const error = new Error('Document not found.');
            error.statusCode = 404;
            throw error;
        }

        if (document.status !== 'hidden') {
            const error = new Error('Only locked documents can be unlocked.');
            error.statusCode = 400;
            throw error;
        }

        await documentModel.updateDocumentStatus({
            documentId,
            status: 'approved',
        });

        await documentModel.logDocumentModerationAction({
            userId: req.user.userId,
            action: 'unlock_document',
            documentId,
        });

        try {
            await notificationModel.createNotification({
                userId: document.ownerUserId,
                type: 'document_unlocked',
                title: 'Document restored',
                message: `Your document "${document.title}" was restored and is available again.`,
                metadata: {
                    documentId,
                    note: note || null,
                },
            });
        } catch (notifyError) {
            console.error('Failed to create unlock notification:', notifyError.message);
        }

        const updatedDocument = await documentModel.getDocumentDetailById(documentId);

        res.json({
            success: true,
            message: 'Document unlocked successfully.',
            data: {
                document: updatedDocument,
                moderation: {
                    action: 'unlocked',
                    note: note || null,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const deleteDocument = async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const { penaltyPoints, penaltyNote } = req.body || {};

        if (!Number.isInteger(documentId) || documentId <= 0) {
            const error = new Error('A valid document id is required.');
            error.statusCode = 400;
            throw error;
        }

        const document = await documentModel.getDocumentDetailById(documentId);

        if (!document) {
            const error = new Error('Document not found.');
            error.statusCode = 404;
            throw error;
        }

        let parsedPenaltyPoints = 0;

        if (penaltyPoints !== undefined && penaltyPoints !== null && penaltyPoints !== '') {
            parsedPenaltyPoints = Number(penaltyPoints);

            if (!Number.isInteger(parsedPenaltyPoints) || parsedPenaltyPoints < 0) {
                const error = new Error('penaltyPoints must be a non-negative integer.');
                error.statusCode = 400;
                throw error;
            }
        }

        try {
            await deleteStoredDocumentFile(document.fileUrl);
        } catch (storageError) {
            const error = new Error(`Failed to delete stored file: ${storageError.message}`);
            error.statusCode = 500;
            throw error;
        }

        const deleteResult = await documentModel.deleteDocumentById({
            documentId,
            deletedByUserId: req.user.userId,
            penaltyPoints: parsedPenaltyPoints,
            penaltyNote: penaltyNote || null,
        });

        try {
            const pointMessage =
                deleteResult.deductedPoints > 0
                    ? ` ${deleteResult.deductedPoints} points were deducted from your account.`
                    : '';

            await notificationModel.createNotification({
                userId: document.ownerUserId,
                type: 'document_deleted',
                title: 'Document deleted by moderator',
                message: `Your document "${document.title}" was deleted by moderator/admin.${pointMessage}`,
                metadata: {
                    documentId,
                    deletedByUserId: req.user.userId,
                    deletedByRole: req.user.role,
                    deductedPoints: deleteResult.deductedPoints,
                },
            });
        } catch (notifyError) {
            console.error('Failed to create delete notification:', notifyError.message);
        }

        res.json({
            success: true,
            message: 'Document deleted successfully.',
            data: {
                documentId,
                deductedPoints: deleteResult.deductedPoints,
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDocuments,
    getDocumentDetail,
    createDocument,
    updateDocument,
    getDuplicateCandidates,
    getAllUploadedDocuments,
    getMyUploadedDocuments,
    getPendingDocuments,
    createDocumentReport,
    getPendingReportedDocuments,
    resolveReportedDocument,
    reviewDocument,
    lockDocument,
    unlockDocument,
    deleteDocument,
};
