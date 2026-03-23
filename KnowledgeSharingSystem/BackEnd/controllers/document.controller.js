const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const documentModel = require('../models/document.model');

const getFileHash = (filePath) =>
    new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });

const removeFileIfExists = async (filePath) => {
    if (!filePath) {
        return;
    }

    try {
        await fs.promises.unlink(filePath);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
};

const getAbsoluteFilePathFromUrl = (fileUrl) => {
    if (!fileUrl || !fileUrl.startsWith('/uploads/')) {
        return null;
    }

    return path.join(__dirname, '..', fileUrl.replace(/^\//, ''));
};

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

        const fileUrl = `/uploads/documents/${req.file.filename}`;
        const fileHash = await getFileHash(req.file.path);

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
        if (req.file?.path) {
            await removeFileIfExists(req.file.path);
        }
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
            fileUrl = `/uploads/documents/${req.file.filename}`;
            originalFileName = req.file.originalname;
            fileSizeBytes = req.file.size;
            mimeType = req.file.mimetype;
            fileHash = await getFileHash(req.file.path);
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

        if (req.file && existingDocument.fileUrl !== fileUrl) {
            try {
                await removeFileIfExists(getAbsoluteFilePathFromUrl(existingDocument.fileUrl));
            } catch (cleanupError) {
                console.error('Failed to remove old document file:', cleanupError.message);
            }
        }

        const updatedDocument = await documentModel.getDocumentDetailById(documentId);

        res.json({
            success: true,
            message: 'Document updated successfully.',
            data: updatedDocument,
        });
    } catch (error) {
        if (req.file?.path) {
            await removeFileIfExists(req.file.path);
        }
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
