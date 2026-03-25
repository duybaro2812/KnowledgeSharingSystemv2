const crypto = require('crypto');
const documentModel = require('../models/document.model');
const { uploadDocumentBuffer } = require('../services/cloudinary.service');

const getFileHashFromBuffer = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

const getDocuments = async (req, res, next) => {
    try {
        const { keyword, categoryId } = req.query;
        const parsedCategoryId = categoryId ? Number(categoryId) : null;

        if (categoryId && (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0)) {
            const error = new Error('categoryId must be a valid integer.');
            error.statusCode = 400;
            throw error;
        }

        const documents = await documentModel.searchApprovedDocuments({
            keyword,
            categoryId: parsedCategoryId,
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

module.exports = {
    getDocuments,
    getDocumentDetail,
    createDocument,
    updateDocument,
    getDuplicateCandidates,
};
