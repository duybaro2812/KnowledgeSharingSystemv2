const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const { documentUploadMiddleware } = require('../middlewares/upload.middleware');
const documentController = require('../controllers/document.controller');
const documentEngagementController = require('../controllers/document-engagement.controller');
const documentAccessController = require('../controllers/document-access.controller');

const router = express.Router();

router.get('/', documentController.getDocuments);
router.get(
    '/all-uploaded',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    documentController.getAllUploadedDocuments
);
router.get('/my-uploaded', authMiddleware, documentController.getMyUploadedDocuments);
router.get(
    '/pending',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    documentController.getPendingDocuments
);
router.get(
    '/reports/pending',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    documentController.getPendingReportedDocuments
);
router.get(
    '/:id/reports',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    documentController.getDocumentReportHistory
);
router.patch(
    '/:id/review',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    documentController.reviewDocument
);
router.patch(
    '/:id/lock',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    documentController.lockDocument
);
router.patch(
    '/:id/unlock',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    documentController.unlockDocument
);
router.delete(
    '/:id',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    documentController.deleteDocument
);
router.post('/:id/report', authMiddleware, documentController.createDocumentReport);
router.patch(
    '/:id/report-resolution',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    documentController.resolveReportedDocument
);
router.get('/:id/engagement', authMiddleware, documentEngagementController.getEngagement);
router.patch('/:id/reaction', authMiddleware, documentEngagementController.updateReaction);
router.patch('/:id/save', authMiddleware, documentEngagementController.updateSavedState);
router.get('/:id/access', authMiddleware, documentAccessController.getDocumentAccessPolicy);
router.post('/:id/view', authMiddleware, documentAccessController.registerFullView);
router.post('/:id/download', authMiddleware, documentAccessController.registerDownload);
router.get('/:id', documentController.getDocumentDetail);
router.post(
    '/',
    authMiddleware,
    documentUploadMiddleware.single('documentFile'),
    documentController.createDocument
);
router.put(
    '/:id',
    authMiddleware,
    documentUploadMiddleware.single('documentFile'),
    documentController.updateDocument
);
router.get(
    '/:id/duplicate-candidates',
    authMiddleware,
    roleMiddleware('admin', 'moderator'),
    documentController.getDuplicateCandidates
);

module.exports = router;
