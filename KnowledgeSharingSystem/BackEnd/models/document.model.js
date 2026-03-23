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

module.exports = {
    searchApprovedDocuments,
    getDocumentDetailById,
    createDocument,
    updateDocument,
    findDuplicateDocumentCandidates,
};
