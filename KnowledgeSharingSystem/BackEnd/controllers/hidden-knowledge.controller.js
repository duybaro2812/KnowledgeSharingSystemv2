const hiddenKnowledgeModel = require('../models/hidden-knowledge.model');
const { normalizeOptionalText, normalizeRequiredText } = require('../utils/input-sanitizer');

const ensureDocumentId = (rawId) => {
    const documentId = Number(rawId);
    if (!Number.isInteger(documentId) || documentId <= 0) {
        const error = new Error('A valid document id is required.');
        error.statusCode = 400;
        throw error;
    }
    return documentId;
};

const getHiddenKnowledge = async (req, res, next) => {
    try {
        const documentId = ensureDocumentId(req.params.id);
        const knowledge = await hiddenKnowledgeModel.getHiddenKnowledgeForViewer({
            documentId,
            viewerUserId: req.user.userId,
        });

        res.json({
            success: true,
            message: 'Hidden knowledge fetched successfully.',
            data: knowledge,
        });
    } catch (error) {
        next(error);
    }
};

const updateHiddenKnowledge = async (req, res, next) => {
    try {
        const documentId = ensureDocumentId(req.params.id);
        const rawStatus = typeof req.body?.status === 'undefined' ? null : String(req.body.status || '').trim().toLowerCase();
        const status = rawStatus || null;

        if (status && !['draft', 'published', 'archived'].includes(status)) {
            const error = new Error("status must be one of 'draft', 'published', 'archived'.");
            error.statusCode = 400;
            throw error;
        }

        const title =
            typeof req.body?.title === 'undefined'
                ? null
                : normalizeRequiredText({
                      value: req.body.title,
                      fieldName: 'title',
                      maxLength: 255,
                  });
        const content =
            typeof req.body?.content === 'undefined'
                ? null
                : normalizeOptionalText({
                      value: req.body.content,
                      fieldName: 'content',
                      maxLength: 50000,
                  }) || '';

        const updated = await hiddenKnowledgeModel.updateHiddenKnowledge({
            documentId,
            editorUserId: req.user.userId,
            title,
            content,
            status,
        });

        res.json({
            success: true,
            message: 'Hidden knowledge updated successfully.',
            data: updated,
        });
    } catch (error) {
        next(error);
    }
};

const addSource = async (req, res, next) => {
    try {
        const documentId = ensureDocumentId(req.params.id);
        const sourceType = normalizeRequiredText({
            value: req.body?.sourceType,
            fieldName: 'sourceType',
            maxLength: 30,
        }).toLowerCase();
        const sourceId =
            typeof req.body?.sourceId === 'undefined' || req.body.sourceId === null || req.body.sourceId === ''
                ? null
                : Number(req.body.sourceId);
        const extractedText = normalizeOptionalText({
            value: req.body?.extractedText,
            fieldName: 'extractedText',
            maxLength: 10000,
        });

        if (sourceId !== null && (!Number.isInteger(sourceId) || sourceId <= 0)) {
            const error = new Error('sourceId must be a positive integer.');
            error.statusCode = 400;
            throw error;
        }

        const result = await hiddenKnowledgeModel.addHiddenKnowledgeSource({
            documentId,
            moderatorUserId: req.user.userId,
            sourceType,
            sourceId,
            extractedText,
        });

        res.status(result.appended ? 201 : 200).json({
            success: true,
            message: result.appended
                ? 'Source added to hidden knowledge successfully.'
                : 'This source was already added to hidden knowledge.',
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

const listSources = async (req, res, next) => {
    try {
        const documentId = ensureDocumentId(req.params.id);
        const sources = await hiddenKnowledgeModel.listSourcesForDocument({ documentId });

        res.json({
            success: true,
            message: 'Hidden knowledge sources fetched successfully.',
            data: sources,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    addSource,
    getHiddenKnowledge,
    listSources,
    updateHiddenKnowledge,
};
