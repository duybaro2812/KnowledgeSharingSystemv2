const documentRatingModel = require('../../../models/document-rating.model');
const { notifyUserIfDifferent } = require('../../../services/notification-dispatcher.service');

const validateDocumentId = (id) => {
    const documentId = Number(id);
    if (!Number.isInteger(documentId) || documentId <= 0) {
        const error = new Error('A valid document id is required.');
        error.statusCode = 400;
        throw error;
    }
    return documentId;
};

const ensureDocumentCanBeRated = async (documentId) => {
    const document = await documentRatingModel.getDocumentForRating(documentId);
    if (!document) {
        const error = new Error('Document not found.');
        error.statusCode = 404;
        throw error;
    }

    if (String(document.status || '').toLowerCase() !== 'approved') {
        const error = new Error('Only approved documents can be rated.');
        error.statusCode = 400;
        throw error;
    }

    return document;
};

const getDocumentRatings = async (req, res, next) => {
    try {
        const documentId = validateDocumentId(req.params.id);
        await ensureDocumentCanBeRated(documentId);

        const role = String(req.user?.role || '').toLowerCase();
        const includeHidden = ['admin', 'moderator'].includes(role);
        const data = await documentRatingModel.getDocumentRatingSummary({
            documentId,
            userId: req.user?.userId || null,
            includeHidden,
        });

        res.json({
            success: true,
            message: 'Document ratings fetched successfully.',
            data,
        });
    } catch (error) {
        next(error);
    }
};

const upsertDocumentRating = async (req, res, next) => {
    try {
        const documentId = validateDocumentId(req.params.id);
        const document = await ensureDocumentCanBeRated(documentId);

        if (Number(document.ownerUserId) === Number(req.user.userId)) {
            const error = new Error('You cannot rate your own document.');
            error.statusCode = 400;
            throw error;
        }

        const stars = Number(req.body.stars);
        if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
            const error = new Error('stars must be an integer between 1 and 5.');
            error.statusCode = 400;
            throw error;
        }

        const reviewText = String(req.body.reviewText || '').trim();
        if (reviewText.length > 1000) {
            const error = new Error('Review text must be 1000 characters or fewer.');
            error.statusCode = 400;
            throw error;
        }

        const rating = await documentRatingModel.upsertDocumentRating({
            documentId,
            userId: req.user.userId,
            stars,
            reviewText,
        });

        try {
            await notifyUserIfDifferent({
                actorUserId: req.user.userId,
                receiverUserId: document.ownerUserId,
                type: 'document_rated',
                title: 'Your document received a rating',
                message: `${req.user.name || req.user.username || 'A user'} rated "${document.title}" ${stars}/5 stars.`,
                metadata: {
                    documentId,
                    ratingId: rating?.ratingId,
                    stars,
                    action: 'document.rated',
                    target: {
                        type: 'document',
                        id: documentId,
                    },
                    route: `/documents/${documentId}`,
                },
            });
        } catch (notifyError) {
            console.error('Failed to notify document rating:', notifyError.message);
        }

        const data = await documentRatingModel.getDocumentRatingSummary({
            documentId,
            userId: req.user.userId,
        });

        res.json({
            success: true,
            message: 'Document rating saved successfully.',
            data,
        });
    } catch (error) {
        next(error);
    }
};

const deleteDocumentRating = async (req, res, next) => {
    try {
        const documentId = validateDocumentId(req.params.id);
        await ensureDocumentCanBeRated(documentId);

        await documentRatingModel.deleteDocumentRating({
            documentId,
            userId: req.user.userId,
        });

        const data = await documentRatingModel.getDocumentRatingSummary({
            documentId,
            userId: req.user.userId,
        });

        res.json({
            success: true,
            message: 'Document rating removed successfully.',
            data,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDocumentRatings,
    upsertDocumentRating,
    deleteDocumentRating,
};
