const crypto = require('crypto');
const documentModel = require('../models/document.model');
const reportModel = require('../models/report.model');
const notificationModel = require('../models/notification.model');
const userModel = require('../models/user.model');
const pointEventModel = require('../models/point-event.model');
const documentPlagiarismModel = require('../models/document-plagiarism.model');
const documentPlagiarismReviewModel = require('../models/document-plagiarism-review.model');
const { POINT_POLICY } = require('../config/point-policy');
const { DOCUMENT_STATUSES } = require('../config/workflow-statuses');
const { VALIDATION_RULES } = require('../config/validation-rules');
const {
    normalizeRequiredText,
    normalizeOptionalText,
} = require('../utils/input-sanitizer');
const {
    uploadDocumentBuffer,
    isCloudinaryAssetUrl,
    deleteCloudinaryRawByUrl,
    deleteLocalUploadedFileByUrl,
    downloadStoredDocumentBuffer,
} = require('../services/cloudinary.service');
const { buildPlagiarismAssessment } = require('../services/plagiarism.service');
const { extractTextFromDocument } = require('../services/document-text-extraction.service');

const getFileHashFromBuffer = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

const normalizeDocumentTitle = (value) =>
    normalizeRequiredText({
        value,
        fieldName: 'Title',
        maxLength: VALIDATION_RULES.document.titleMax,
    });

const normalizeDocumentDescription = (value) =>
    normalizeOptionalText({
        value,
        fieldName: 'Description',
        maxLength: VALIDATION_RULES.document.descriptionMax,
    });

const normalizeModerationNote = (value, fieldName = 'note') =>
    normalizeOptionalText({
        value,
        fieldName,
        maxLength: VALIDATION_RULES.document.moderationNoteMax,
    });

const normalizeReportReason = (value) =>
    normalizeRequiredText({
        value,
        fieldName: 'Report reason',
        maxLength: VALIDATION_RULES.document.reportReasonMax,
    });

const normalizeLockReason = (value) =>
    normalizeRequiredText({
        value,
        fieldName: 'Lock reason',
        maxLength: VALIDATION_RULES.document.lockReasonMax,
    });

const normalizePenaltyNote = (value) =>
    normalizeOptionalText({
        value,
        fieldName: 'Penalty note',
        maxLength: VALIDATION_RULES.document.penaltyNoteMax,
    });

const deleteStoredDocumentFile = async (fileUrl) => {
    if (isCloudinaryAssetUrl(fileUrl)) {
        return deleteCloudinaryRawByUrl(fileUrl);
    }

    return deleteLocalUploadedFileByUrl(fileUrl);
};

const buildAndStoreDocumentTextArtifact = async ({
    documentId,
    buffer,
    originalFileName,
    mimeType,
    title,
    description,
}) => {
    const extractedDocumentText = await extractTextFromDocument({
        buffer,
        originalFileName,
        mimeType,
        title,
        description,
    });

    await documentPlagiarismModel.upsertDocumentTextArtifact({
        documentId,
        extractedText: extractedDocumentText.extractedText,
        normalizedText: extractedDocumentText.normalizedText,
        tokenCount: extractedDocumentText.tokenCount,
        extractionMethod: extractedDocumentText.extractionMethod,
        extractionWarning: extractedDocumentText.extractionWarning,
    });

    return extractedDocumentText;
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

const checkDocumentPlagiarismInternal = async (documentId) => {
    const currentDocument = await documentModel.getDocumentDetailById(documentId);
    const duplicateCandidates = await documentModel.findDuplicateDocumentCandidates(documentId);
    const currentArtifact = await documentPlagiarismModel.getDocumentTextArtifact(documentId);
    const textCandidates = await documentPlagiarismModel.getTextSimilarityCandidates({ documentId });

    const combinedCandidatesById = new Map();

    for (const candidate of duplicateCandidates || []) {
        combinedCandidatesById.set(Number(candidate.documentId), { ...candidate });
    }

    for (const candidate of textCandidates || []) {
        const key = Number(candidate.documentId);
        const previous = combinedCandidatesById.get(key) || {};
        combinedCandidatesById.set(key, {
            ...previous,
            ...candidate,
            duplicateReason: previous.duplicateReason || candidate.duplicateReason || null,
        });
    }

    const currentDocumentForCheck = {
        ...(currentDocument || {}),
        normalizedText: currentArtifact?.normalizedText || '',
    };

    return buildPlagiarismAssessment({
        documentId,
        currentDocument: currentDocumentForCheck,
        candidates: [...combinedCandidatesById.values()],
    });
};

const buildDocumentOwnerNotificationMetadata = ({
    documentId,
    action,
    moderatorUserId = null,
    note = null,
    extra = {},
}) => ({
    documentId,
    action,
    moderatorUserId,
    note,
    target: {
        type: 'document',
        id: documentId,
    },
    route: `/documents/${documentId}`,
    ...extra,
});

const buildModerationQueueNotificationMetadata = ({
    documentId,
    action,
    note = null,
    extra = {},
}) => ({
    documentId,
    action,
    note,
    target: {
        type: 'moderation_queue',
        id: documentId,
    },
    route: `/moderation?documentId=${documentId}`,
    ...extra,
});

const buildPlagiarismNotificationPayload = ({
    documentId,
    documentTitle,
    plagiarismCheck,
    extractionWarning = null,
    source = 'upload',
}) => {
    const topCandidate = plagiarismCheck.topCandidates?.[0] || null;
    const plagiarismPercent = Number(plagiarismCheck.maxPlagiarismPercent || 0);
    const comparedDocumentId = topCandidate?.documentId || null;
    const comparedDocumentTitle = topCandidate?.title || 'Unknown document';
    const comparedDocumentRoute = comparedDocumentId ? `/documents/${comparedDocumentId}` : null;

    return {
        title: source === 'manual_recheck' ? 'Re-check dao van hoan tat' : 'Ket qua kiem tra dao van',
        message: `Tai lieu co ${plagiarismPercent}% giong voi tai lieu: ${comparedDocumentTitle}.`,
        metadata: buildModerationQueueNotificationMetadata({
            documentId,
            action: 'document.plagiarism_suspected',
            note: extractionWarning || null,
            extra: {
                documentTitle,
                comparedDocumentId,
                comparedDocumentTitle,
                comparedDocumentRoute,
                plagiarismPercent,
                thresholdPercent: plagiarismCheck.thresholdPercent,
                aboveThreshold: Boolean(plagiarismCheck.aboveThreshold),
                riskLevel: plagiarismCheck.riskLevel,
                candidateCount: plagiarismCheck.candidateCount,
                duplicateReasons: (plagiarismCheck.topCandidates || []).map(
                    (item) => item.duplicateReason
                ),
                extractionWarning: extractionWarning || null,
                source,
                links: comparedDocumentRoute
                    ? [
                        {
                            type: 'compared_document',
                            label: comparedDocumentTitle,
                            route: comparedDocumentRoute,
                            documentId: comparedDocumentId,
                        },
                    ]
                    : [],
            },
        }),
    };
};

const applyDocumentReviewDecision = async ({
    documentId,
    moderatorUserId,
    decision,
    note = null,
    approvalNotificationType = 'document_upload_success',
    approvalNotificationTitle = 'Upload Success',
    approvalNotificationMessage,
    rejectionNotificationType = 'document_rejected',
    rejectionNotificationTitle = 'Document was rejected',
    rejectionNotificationMessage,
}) => {
    await documentModel.reviewDocument({
        documentId,
        moderatorUserId,
        decision,
        note: note || null,
    });

    try {
        await documentModel.logDocumentModerationAction({
            userId: moderatorUserId,
            action:
                decision === DOCUMENT_STATUSES.APPROVED
                    ? 'review_document_approved'
                    : 'review_document_rejected',
            documentId,
        });
    } catch (logError) {
        console.error('Failed to log document review action:', logError.message);
    }

    const updatedDocument = await documentModel.getDocumentDetailById(documentId);

    const responseData = {
        document: updatedDocument,
        review: {
            decision,
            note: note || null,
            moderatorUserId,
        },
    };

    if (decision === DOCUMENT_STATUSES.REJECTED) {
        try {
            await notificationModel.createNotification({
                userId: updatedDocument.ownerUserId,
                type: rejectionNotificationType,
                title: rejectionNotificationTitle,
                message:
                    rejectionNotificationMessage || 'Your document was rejected because it is invalid.',
                metadata: {
                    ...buildDocumentOwnerNotificationMetadata({
                        documentId,
                        action: 'document.rejected',
                        moderatorUserId,
                        note: note || null,
                    }),
                    decision,
                },
            });
        } catch (notifyError) {
            console.error('Failed to create reject notification:', notifyError.message);
        }

        responseData.userNotification = {
            userId: updatedDocument.ownerUserId,
            message: rejectionNotificationMessage || 'Your document was rejected because it is invalid.',
        };

        return responseData;
    }

    try {
        await pointEventModel.createPointEvent({
            userId: updatedDocument.ownerUserId,
            eventType: pointEventModel.EVENT_TYPES.UPLOAD_APPROVED,
            points: POINT_POLICY.rewards.uploadApproved,
            documentId,
            metadata: {
                source: 'document_review',
                moderatorUserId,
            },
        });
    } catch (pointEventError) {
        console.error('Failed to create upload_approved point event:', pointEventError.message);
    }

    try {
        await notificationModel.createNotification({
            userId: updatedDocument.ownerUserId,
            type: approvalNotificationType,
            title: approvalNotificationTitle,
            message:
                approvalNotificationMessage ||
                `Your document "${updatedDocument.title}" has been approved by moderator.`,
            metadata: {
                ...buildDocumentOwnerNotificationMetadata({
                    documentId,
                    action: 'document.approved',
                    moderatorUserId,
                    note: note || null,
                }),
                decision,
            },
        });
    } catch (notifyError) {
        console.error('Failed to create approve notification:', notifyError.message);
    }

    return responseData;
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
        const title = normalizeDocumentTitle(req.body?.title);
        const description = normalizeDocumentDescription(req.body?.description);
        const { categoryIds } = req.body || {};

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

        const extractedDocumentText = await buildAndStoreDocumentTextArtifact({
            documentId,
            buffer: req.file.buffer,
            originalFileName: req.file.originalname,
            mimeType: req.file.mimetype,
            title,
            description,
        });

        const plagiarismCheck = await checkDocumentPlagiarismInternal(documentId);

        if (plagiarismCheck.candidateCount > 0) {
            try {
                const plagiarismNotification = buildPlagiarismNotificationPayload({
                    documentId,
                    documentTitle: title,
                    plagiarismCheck,
                    extractionWarning: extractedDocumentText.extractionWarning || null,
                    source: 'upload',
                });

                await notifyModerationTeam({
                    type: 'plagiarism_suspected',
                    title: plagiarismNotification.title,
                    message: plagiarismNotification.message,
                    metadata: plagiarismNotification.metadata,
                });
            } catch (notifyError) {
                console.error('Failed to notify moderation team for plagiarism check:', notifyError.message);
            }
        }

        try {
            await pointEventModel.createPointEvent({
                userId: req.user.userId,
                eventType: pointEventModel.EVENT_TYPES.UPLOAD_SUBMITTED,
                points: POINT_POLICY.rewards.uploadSubmitted,
                documentId,
                metadata: {
                    source: 'document_upload',
                    title,
                },
            });
        } catch (pointEventError) {
            console.error('Failed to create upload_submitted point event:', pointEventError.message);
        }

        res.status(201).json({
            success: true,
            message: 'Document created successfully.',
            data: {
                ...document,
                plagiarismCheck,
                extraction: {
                    method: extractedDocumentText.extractionMethod,
                    tokenCount: extractedDocumentText.tokenCount,
                    warning: extractedDocumentText.extractionWarning || null,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const checkDocumentPlagiarism = async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);

        if (!Number.isInteger(documentId) || documentId <= 0) {
            const error = new Error('A valid document id is required.');
            error.statusCode = 400;
            throw error;
        }

        const document = await documentModel.getDocumentDetailById(documentId);
        const isOwner = Number(document.ownerUserId) === Number(req.user.userId);
        const isPrivileged = ['admin', 'moderator'].includes(req.user.role);

        if (!isOwner && !isPrivileged) {
            const error = new Error('You do not have permission to check plagiarism for this document.');
            error.statusCode = 403;
            throw error;
        }

        const plagiarismCheck = await checkDocumentPlagiarismInternal(documentId);

        res.json({
            success: true,
            message: 'Plagiarism check completed successfully.',
            data: plagiarismCheck,
        });
    } catch (error) {
        next(error);
    }
};

const recheckDocumentPlagiarism = async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);

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

        const fileBuffer = await downloadStoredDocumentBuffer(document.fileUrl);
        const extractedDocumentText = await buildAndStoreDocumentTextArtifact({
            documentId,
            buffer: fileBuffer,
            originalFileName: document.originalFileName,
            mimeType: document.mimeType,
            title: document.title,
            description: document.description,
        });
        const plagiarismCheck = await checkDocumentPlagiarismInternal(documentId);

        if (plagiarismCheck.candidateCount > 0) {
            try {
                const plagiarismNotification = buildPlagiarismNotificationPayload({
                    documentId,
                    documentTitle: document.title,
                    plagiarismCheck,
                    extractionWarning: extractedDocumentText.extractionWarning || null,
                    source: 'manual_recheck',
                });

                await notifyModerationTeam({
                    type: 'plagiarism_rechecked',
                    title: plagiarismNotification.title,
                    message: plagiarismNotification.message,
                    metadata: plagiarismNotification.metadata,
                });
            } catch (notifyError) {
                console.error(
                    'Failed to notify moderation team for plagiarism re-check:',
                    notifyError.message
                );
            }
        }

        res.json({
            success: true,
            message: 'Document plagiarism re-check completed successfully.',
            data: {
                documentId,
                extraction: {
                    method: extractedDocumentText.extractionMethod,
                    tokenCount: extractedDocumentText.tokenCount,
                    warning: extractedDocumentText.extractionWarning || null,
                },
                plagiarismCheck,
            },
        });
    } catch (error) {
        next(error);
    }
};

const updateDocument = async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const title = normalizeDocumentTitle(req.body?.title);
        const description = normalizeDocumentDescription(req.body?.description);
        const { categoryIds } = req.body || {};

        if (!Number.isInteger(documentId) || documentId <= 0) {
            const error = new Error('A valid document id is required.');
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

            await buildAndStoreDocumentTextArtifact({
                documentId,
                buffer: req.file.buffer,
                originalFileName: req.file.originalname,
                mimeType: req.file.mimetype,
                title,
                description,
            });
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
        const reason = normalizeReportReason(req.body?.reason);

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

        const reporterUserIds = await reportModel.getOpenReporterUserIdsByDocument(documentId);

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
                reason,
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
                metadata: buildModerationQueueNotificationMetadata({
                    documentId,
                    action: 'document.reported',
                    note: reason,
                    extra: {
                        reason,
                        uniqueReporterCount: reportResult.uniqueReporterCount,
                        threshold: reportModel.REPORT_AUTO_LOCK_THRESHOLD,
                        autoLocked: Boolean(reportResult.wasAutoLocked),
                    },
                }),
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
                    ...buildDocumentOwnerNotificationMetadata({
                        documentId,
                        action: 'document.auto_locked',
                        note: `Auto locked after ${reportResult.uniqueReporterCount} reports.`,
                    }),
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
        const { reportStatus, limit, offset } = req.query;
        const parsedLimit = limit !== undefined ? Number(limit) : undefined;
        const parsedOffset = offset !== undefined ? Number(offset) : undefined;

        if (limit !== undefined && (!Number.isInteger(parsedLimit) || parsedLimit <= 0)) {
            const error = new Error('limit must be a positive integer.');
            error.statusCode = 400;
            throw error;
        }

        if (offset !== undefined && (!Number.isInteger(parsedOffset) || parsedOffset < 0)) {
            const error = new Error('offset must be a non-negative integer.');
            error.statusCode = 400;
            throw error;
        }

        const reportedDocuments = await reportModel.getPendingDocumentReportQueue({
            reportStatus: reportStatus || 'open',
            limit: parsedLimit,
            offset: parsedOffset,
        });

        res.json({
            success: true,
            message: 'Pending reported documents fetched successfully.',
            data: reportedDocuments,
        });
    } catch (error) {
        next(error);
    }
};

const getDocumentReportHistory = async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const { status } = req.query;

        if (!Number.isInteger(documentId) || documentId <= 0) {
            const error = new Error('A valid document id is required.');
            error.statusCode = 400;
            throw error;
        }

        if (
            status !== undefined &&
            !['pending', 'reviewed', 'resolved', 'dismissed'].includes(String(status).toLowerCase())
        ) {
            const error = new Error(
                "status must be one of: pending, reviewed, resolved, dismissed."
            );
            error.statusCode = 400;
            throw error;
        }

        const reports = await reportModel.getDocumentReports({
            documentId,
            status: status ? String(status).toLowerCase() : null,
        });

        res.json({
            success: true,
            message: 'Document report history fetched successfully.',
            data: reports,
        });
    } catch (error) {
        next(error);
    }
};

const resolveReportedDocument = async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const action = normalizeRequiredText({
            value: req.body?.action,
            fieldName: 'action',
            maxLength: 20,
        }).toLowerCase();
        const note = normalizeModerationNote(req.body?.note);
        const { penaltyPoints } = req.body || {};

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
                status: DOCUMENT_STATUSES.APPROVED,
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
                    ...buildDocumentOwnerNotificationMetadata({
                        documentId,
                        action: 'report.resolved_unlock',
                        moderatorUserId: req.user.userId,
                        note: note || null,
                    }),
                    moderationAction: action,
                    resolvedReports,
                },
            });
            } catch (notifyError) {
                console.error('Failed to create unlock-after-report notification:', notifyError.message);
            }

            try {
                await Promise.all(
                    reporterUserIds.map((reporterUserId) =>
                        notificationModel.createNotification({
                            userId: reporterUserId,
                            type: 'report_resolved_unlocked',
                            title: 'Report reviewed',
                            message: `Your report on "${document.title}" was reviewed. Document remains available.`,
                            metadata: {
                                ...buildDocumentOwnerNotificationMetadata({
                                    documentId,
                                    action: 'report.resolved_unlock',
                                    moderatorUserId: req.user.userId,
                                    note: note || null,
                                }),
                                moderationAction: action,
                            },
                        })
                    )
                );
            } catch (notifyError) {
                console.error(
                    'Failed to notify reporters for unlock-after-report:',
                    notifyError.message
                );
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
                        notifiedReporters: reporterUserIds.length,
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

        try {
            await Promise.all(
                reporterUserIds.map((reporterUserId) =>
                    notificationModel.createNotification({
                        userId: reporterUserId,
                        type: 'report_resolved_deleted',
                        title: 'Report confirmed',
                          message: `Your report on "${document.title}" was confirmed. The document has been removed.`,
                          metadata: {
                              ...buildDocumentOwnerNotificationMetadata({
                                  documentId,
                                  action: 'report.resolved_delete',
                                  moderatorUserId: req.user.userId,
                                  note: note || null,
                              }),
                              moderationAction: action,
                          },
                      })
                  )
            );
        } catch (notifyError) {
            console.error(
                'Failed to notify reporters for delete-after-report:',
                notifyError.message
            );
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
                    notifiedReporters: reporterUserIds.length,
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
        const decision = normalizeRequiredText({
            value: req.body?.decision,
            fieldName: 'decision',
            maxLength: 20,
        }).toLowerCase();
        const note = normalizeModerationNote(req.body?.note);

        if (!Number.isInteger(documentId) || documentId <= 0) {
            const error = new Error('A valid document id is required.');
            error.statusCode = 400;
            throw error;
        }

        if (![DOCUMENT_STATUSES.APPROVED, DOCUMENT_STATUSES.REJECTED].includes(decision)) {
            const error = new Error(
                `decision must be either '${DOCUMENT_STATUSES.APPROVED}' or '${DOCUMENT_STATUSES.REJECTED}'.`
            );
            error.statusCode = 400;
            throw error;
        }

        if (decision === DOCUMENT_STATUSES.REJECTED && !note) {
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

        const responseData = await applyDocumentReviewDecision({
            documentId,
            moderatorUserId: req.user.userId,
            decision,
            note: note || null,
        });

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

const resolveDocumentPlagiarism = async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const action = normalizeRequiredText({
            value: req.body?.action,
            fieldName: 'action',
            maxLength: 30,
        }).toLowerCase();
        const note = normalizeModerationNote(req.body?.note);

        if (!Number.isInteger(documentId) || documentId <= 0) {
            const error = new Error('A valid document id is required.');
            error.statusCode = 400;
            throw error;
        }

        if (!['approve_anyway', 'reject_duplicate'].includes(action)) {
            const error = new Error(
                "action must be either 'approve_anyway' or 'reject_duplicate'."
            );
            error.statusCode = 400;
            throw error;
        }

        if (action === 'reject_duplicate' && !note) {
            const error = new Error('A rejection note is required when action is reject_duplicate.');
            error.statusCode = 400;
            throw error;
        }

        const document = await documentModel.getDocumentDetailById(documentId);

        if (!document) {
            const error = new Error('Document not found.');
            error.statusCode = 404;
            throw error;
        }

        if (document.status !== DOCUMENT_STATUSES.PENDING) {
            const error = new Error(
                'Only pending documents can be resolved through plagiarism moderation.'
            );
            error.statusCode = 400;
            throw error;
        }

        const plagiarismCheck = await checkDocumentPlagiarismInternal(documentId);

        if (!plagiarismCheck.candidateCount) {
            const error = new Error(
                'No plagiarism candidates found for this document. Run CheckDuplicate again if needed.'
            );
            error.statusCode = 400;
            throw error;
        }

        const topCandidate = plagiarismCheck.topCandidates?.[0] || null;

        const plagiarismReview = await documentPlagiarismReviewModel.createPlagiarismReview({
            documentId,
            reviewedByUserId: req.user.userId,
            decision: action === 'approve_anyway' ? 'approved_anyway' : 'rejected_duplicate',
            comparedDocumentId: topCandidate?.documentId || null,
            plagiarismPercent: Number(plagiarismCheck.maxPlagiarismPercent || 0),
            note: note || null,
            snapshotMetadata: plagiarismCheck,
        });

        try {
            await documentModel.logDocumentModerationAction({
                userId: req.user.userId,
                action:
                    action === 'approve_anyway'
                        ? 'plagiarism_approved_anyway'
                        : 'plagiarism_rejected_duplicate',
                documentId,
            });
        } catch (logError) {
            console.error('Failed to log plagiarism resolution action:', logError.message);
        }

        const reviewDecision =
            action === 'approve_anyway' ? DOCUMENT_STATUSES.APPROVED : DOCUMENT_STATUSES.REJECTED;
        const defaultRejectionNote = `Rejected after duplicate check (${Number(
            plagiarismCheck.maxPlagiarismPercent || 0
        )}% similarity suspected).`;
        const reviewOutcome = await applyDocumentReviewDecision({
            documentId,
            moderatorUserId: req.user.userId,
            decision: reviewDecision,
            note:
                note ||
                (reviewDecision === DOCUMENT_STATUSES.REJECTED ? defaultRejectionNote : null),
            approvalNotificationType: 'plagiarism_approved_anyway',
            approvalNotificationTitle: 'Document approved after duplicate check',
            approvalNotificationMessage: `Your document "${document.title}" was still approved after moderator reviewed the duplicate-check result.`,
            rejectionNotificationType: 'plagiarism_rejected_duplicate',
            rejectionNotificationTitle: 'Document rejected due to duplicate suspicion',
            rejectionNotificationMessage: `Your document "${document.title}" was rejected after moderator confirmed duplicate/plagiarism suspicion.`,
        });

        res.json({
            success: true,
            message:
                action === 'approve_anyway'
                    ? 'Document approved after duplicate check.'
                    : 'Document rejected after duplicate check.',
            data: {
                ...reviewOutcome,
                plagiarismResolution: {
                    action,
                    note: note || null,
                    moderatorUserId: req.user.userId,
                    plagiarismReview,
                    plagiarismCheck,
                    comparedDocument: topCandidate
                        ? {
                            documentId: topCandidate.documentId,
                            title: topCandidate.title,
                            plagiarismPercent: topCandidate.overallSimilarityPercent,
                        }
                        : null,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const lockDocument = async (req, res, next) => {
    try {
        const documentId = Number(req.params.id);
        const reason = normalizeLockReason(req.body?.reason);

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

        if (document.status === DOCUMENT_STATUSES.HIDDEN) {
            const error = new Error('Document is already locked.');
            error.statusCode = 400;
            throw error;
        }

        await documentModel.updateDocumentStatus({
            documentId,
            status: DOCUMENT_STATUSES.HIDDEN,
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
                    ...buildDocumentOwnerNotificationMetadata({
                        documentId,
                        action: 'document.locked',
                        moderatorUserId: req.user.userId,
                        note: reason,
                    }),
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
        const note = normalizeModerationNote(req.body?.note);

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

        if (document.status !== DOCUMENT_STATUSES.HIDDEN) {
            const error = new Error('Only locked documents can be unlocked.');
            error.statusCode = 400;
            throw error;
        }

        await documentModel.updateDocumentStatus({
            documentId,
            status: DOCUMENT_STATUSES.APPROVED,
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
                    ...buildDocumentOwnerNotificationMetadata({
                        documentId,
                        action: 'document.unlocked',
                        moderatorUserId: req.user.userId,
                        note: note || null,
                    }),
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
        const { penaltyPoints } = req.body || {};
        const penaltyNote = normalizePenaltyNote(req.body?.penaltyNote);

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
                    ...buildDocumentOwnerNotificationMetadata({
                        documentId,
                        action: 'document.deleted',
                        moderatorUserId: req.user.userId,
                        note: penaltyNote || null,
                    }),
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
    checkDocumentPlagiarism,
    recheckDocumentPlagiarism,
    getAllUploadedDocuments,
    getMyUploadedDocuments,
    getPendingDocuments,
    createDocumentReport,
    getPendingReportedDocuments,
    getDocumentReportHistory,
    resolveReportedDocument,
    reviewDocument,
    resolveDocumentPlagiarism,
    lockDocument,
    unlockDocument,
    deleteDocument,
};
