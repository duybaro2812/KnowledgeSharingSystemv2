const { getPool, sql } = require('../utils/db');

const normalizeCategoryIds = (categoryIds) => {
    if (Array.isArray(categoryIds)) {
        return categoryIds.join(',');
    }

    if (typeof categoryIds === 'string') {
        const trimmedValue = categoryIds.trim();

        if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
            try {
                const parsedValue = JSON.parse(trimmedValue);

                if (Array.isArray(parsedValue)) {
                    return parsedValue.join(',');
                }
            } catch (error) {
                return categoryIds;
            }
        }

        return categoryIds;
    }

    return null;
};

const searchApprovedDocuments = async ({ keyword, categoryId }) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('keyword', sql.NVarChar(255), keyword || null)
        .input('categoryId', sql.Int, categoryId || null)
        .execute('dbo.usp_SearchApprovedDocuments');

    return result.recordset;
};

const getDocumentDetailById = async (documentId) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .execute('dbo.usp_GetDocumentDetail');

    return result.recordset[0] || null;
};

const createDocument = async ({
    ownerUserId,
    title,
    description,
    fileUrl,
    originalFileName,
    fileSizeBytes,
    mimeType,
    fileHash,
    categoryIds,
}) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('ownerUserId', sql.Int, ownerUserId)
        .input('title', sql.NVarChar(255), title)
        .input('description', sql.NVarChar(sql.MAX), description || null)
        .input('fileUrl', sql.NVarChar(500), fileUrl)
        .input('originalFileName', sql.NVarChar(255), originalFileName)
        .input('fileSizeBytes', sql.BigInt, fileSizeBytes)
        .input('mimeType', sql.NVarChar(100), mimeType)
        .input('fileHash', sql.NVarChar(128), fileHash || null)
        .input('categoryIds', sql.NVarChar(500), normalizeCategoryIds(categoryIds))
        .execute('dbo.usp_CreateDocument');

    return result.recordset[0].documentId;
};

const updateDocument = async ({
    documentId,
    title,
    description,
    fileUrl,
    originalFileName,
    fileSizeBytes,
    mimeType,
    fileHash,
    categoryIds,
}) => {
    const pool = getPool();

    await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .input('title', sql.NVarChar(255), title)
        .input('description', sql.NVarChar(sql.MAX), description || null)
        .input('fileUrl', sql.NVarChar(500), fileUrl)
        .input('originalFileName', sql.NVarChar(255), originalFileName)
        .input('fileSizeBytes', sql.BigInt, fileSizeBytes)
        .input('mimeType', sql.NVarChar(100), mimeType)
        .input('fileHash', sql.NVarChar(128), fileHash || null)
        .input('categoryIds', sql.NVarChar(500), normalizeCategoryIds(categoryIds))
        .execute('dbo.usp_UpdateDocument');
};

const findDuplicateDocumentCandidates = async (documentId) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .execute('dbo.usp_FindDuplicateDocumentCandidates');

    return result.recordset;
};

const getUploadedDocuments = async ({ ownerUserId = null, status = null }) => {
    const pool = getPool();
    const request = pool.request();

    request.input('ownerUserId', sql.Int, ownerUserId);
    request.input('status', sql.NVarChar(30), status || null);

    const result = await request.query(`
        SELECT
            d.documentId,
            d.title,
            d.description,
            d.fileUrl,
            d.originalFileName,
            d.fileSizeBytes,
            d.mimeType,
            d.fileHash,
            d.status,
            d.createdAt,
            d.updatedAt,
            d.ownerUserId,
            u.name AS ownerName,
            u.email AS ownerEmail,
            latestReview.decision AS latestReviewDecision,
            latestReview.note AS latestReviewNote,
            latestReview.createdAt AS latestReviewedAt
        FROM dbo.Documents d
        INNER JOIN dbo.Users u ON u.userId = d.ownerUserId
        OUTER APPLY (
            SELECT TOP 1
                dr.decision,
                dr.note,
                dr.createdAt
            FROM dbo.DocumentReviews dr
            WHERE dr.documentId = d.documentId
            ORDER BY dr.createdAt DESC
        ) latestReview
        WHERE (@ownerUserId IS NULL OR d.ownerUserId = @ownerUserId)
          AND (@status IS NULL OR d.status = @status)
        ORDER BY d.createdAt DESC;
    `);

    return result.recordset;
};

const getPendingDocuments = async () => {
    return getUploadedDocuments({ ownerUserId: null, status: 'pending' });
};

const reviewDocument = async ({ documentId, moderatorUserId, decision, note = null }) => {
    const pool = getPool();

    await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .input('moderatorUserId', sql.Int, moderatorUserId)
        .input('decision', sql.NVarChar(20), decision)
        .input('note', sql.NVarChar(255), note)
        .execute('dbo.usp_ReviewDocument');
};

module.exports = {
    searchApprovedDocuments,
    getDocumentDetailById,
    createDocument,
    updateDocument,
    findDuplicateDocumentCandidates,
    getUploadedDocuments,
    getPendingDocuments,
    reviewDocument,
};
