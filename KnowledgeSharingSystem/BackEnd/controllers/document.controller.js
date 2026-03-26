const crypto = require('crypto');
const documentModel = require('../models/document.model');
const notificationModel = require('../models/notification.model');
const { uploadDocumentBuffer } = require('../services/cloudinary.service');

const getFileHashFromBuffer = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

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

module.exports = {
    getDocuments,
    getDocumentDetail,
    createDocument,
    updateDocument,
    getDuplicateCandidates,
    getAllUploadedDocuments,
    getMyUploadedDocuments,
    getPendingDocuments,
    reviewDocument,
    lockDocument,
    unlockDocument,
};
