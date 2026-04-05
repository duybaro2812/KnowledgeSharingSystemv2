const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const { commentRateLimiter } = require('../middlewares/rate-limit.middleware');
const commentController = require('../controllers/comment.controller');

const router = express.Router();

router.get('/documents/:id/comments', authMiddleware, commentController.getDocumentComments);
router.post('/documents/:id/comments', authMiddleware, commentRateLimiter, commentController.createComment);
router.post('/comments/:id/replies', authMiddleware, commentRateLimiter, commentController.createReplyComment);
router.get(
    '/comments/moderation/pending',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    commentController.getPendingCommentsForModeration
);
router.patch(
    '/comments/:id/review',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    commentController.reviewComment
);
router.patch(
    '/comments/:id/hide',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    commentController.hideComment
);
router.delete('/comments/:id', authMiddleware, commentController.deleteComment);

module.exports = router;
