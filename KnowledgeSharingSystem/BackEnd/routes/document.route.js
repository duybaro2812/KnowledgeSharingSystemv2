const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const { documentUploadMiddleware } = require('../middlewares/upload.middleware');
const documentController = require('../controllers/document.controller');

const router = express.Router();

router.get('/', documentController.getDocuments);
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
