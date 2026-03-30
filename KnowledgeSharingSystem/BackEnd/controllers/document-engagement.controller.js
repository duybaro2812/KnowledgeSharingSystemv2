const documentEngagementModel = require('../models/document-engagement.model');

const validateDocumentId = (id) => {
    const documentId = Number(id);

    if (!Number.isInteger(documentId) || documentId <= 0) {
        const error = new Error('A valid document id is required.');
        error.statusCode = 400;
        throw error;
    }

    return documentId;
};

const ensureDocumentCanInteract = async (documentId) => {
    const document = await documentEngagementModel.getDocumentForEngagement(documentId);

    if (!document) {
        const error = new Error('Document not found.');
        error.statusCode = 404;
        throw error;
    }

    if (document.status !== 'approved') {
        const error = new Error('Only approved documents can be interacted with.');
        error.statusCode = 400;
        throw error;
    }

    return document;
};

const getEngagement = async (req, res, next) => {
    try {
        const documentId = validateDocumentId(req.params.id);
        await ensureDocumentCanInteract(documentId);

        const engagement = await documentEngagementModel.getDocumentEngagement({
            documentId,
            userId: req.user.userId,
        });

        res.json({
            success: true,
            message: 'Document engagement fetched successfully.',
            data: {
                documentId,
                ...engagement,
            },
        });
    } catch (error) {
        next(error);
    }
};

const updateReaction = async (req, res, next) => {
    try {
        const documentId = validateDocumentId(req.params.id);
        const { reactionType } = req.body;

        if (![null, undefined, '', 'like', 'dislike'].includes(reactionType)) {
            const error = new Error("reactionType must be 'like', 'dislike', or null.");
            error.statusCode = 400;
            throw error;
        }

        await ensureDocumentCanInteract(documentId);

        const normalizedReactionType =
            reactionType === '' || reactionType === undefined ? null : reactionType;

        await documentEngagementModel.upsertReaction({
            documentId,
            userId: req.user.userId,
            reactionType: normalizedReactionType,
        });

        const engagement = await documentEngagementModel.getDocumentEngagement({
            documentId,
            userId: req.user.userId,
        });

        res.json({
            success: true,
            message: normalizedReactionType
                ? 'Reaction updated successfully.'
                : 'Reaction removed successfully.',
            data: {
                documentId,
                ...engagement,
            },
        });
    } catch (error) {
        next(error);
    }
};

const updateSavedState = async (req, res, next) => {
    try {
        const documentId = validateDocumentId(req.params.id);
        const { isSaved } = req.body;

        if (typeof isSaved !== 'boolean') {
            const error = new Error('isSaved must be boolean.');
            error.statusCode = 400;
            throw error;
        }

        await ensureDocumentCanInteract(documentId);

        await documentEngagementModel.setSavedDocument({
            documentId,
            userId: req.user.userId,
            isSaved,
        });

        const engagement = await documentEngagementModel.getDocumentEngagement({
            documentId,
            userId: req.user.userId,
        });

        res.json({
            success: true,
            message: isSaved ? 'Document saved successfully.' : 'Document unsaved successfully.',
            data: {
                documentId,
                ...engagement,
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getEngagement,
    updateReaction,
    updateSavedState,
};
