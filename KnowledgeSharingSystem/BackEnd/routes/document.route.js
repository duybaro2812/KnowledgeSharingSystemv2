const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const { documentUploadMiddleware } = require('../middlewares/upload.middleware');
const documentController = require('../controllers/document.controller');

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
