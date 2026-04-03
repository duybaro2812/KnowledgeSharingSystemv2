const { getPool, sql } = require('../utils/db');

const hasTextArtifactsTable = async () => {
    const pool = getPool();
    const result = await pool.request().query(`
        SELECT 1 AS ok
        WHERE OBJECT_ID(N'dbo.DocumentTextArtifacts', N'U') IS NOT NULL;
    `);

    return Boolean(result.recordset?.[0]?.ok);
};

const upsertDocumentTextArtifact = async ({
    documentId,
    extractedText,
    normalizedText,
    tokenCount,
    extractionMethod,
    extractionWarning,
}) => {
    const tableExists = await hasTextArtifactsTable();
    if (!tableExists) {
        return false;
    }

    const pool = getPool();
    await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .input('extractedText', sql.NVarChar(sql.MAX), extractedText || null)
        .input('normalizedText', sql.NVarChar(sql.MAX), normalizedText || null)
        .input('tokenCount', sql.Int, Number(tokenCount) || 0)
        .input('extractionMethod', sql.NVarChar(30), extractionMethod || null)
        .input('extractionWarning', sql.NVarChar(255), extractionWarning || null)
        .query(`
            MERGE dbo.DocumentTextArtifacts AS target
            USING (
                SELECT
                    @documentId AS documentId,
                    @extractedText AS extractedText,
                    @normalizedText AS normalizedText,
                    @tokenCount AS tokenCount,
                    @extractionMethod AS extractionMethod,
                    @extractionWarning AS extractionWarning
            ) AS source
            ON target.documentId = source.documentId
            WHEN MATCHED THEN
                UPDATE SET
                    extractedText = source.extractedText,
                    normalizedText = source.normalizedText,
                    tokenCount = source.tokenCount,
                    extractionMethod = source.extractionMethod,
                    extractionWarning = source.extractionWarning,
                    updatedAt = SYSDATETIME()
            WHEN NOT MATCHED THEN
                INSERT (
                    documentId,
                    extractedText,
                    normalizedText,
                    tokenCount,
                    extractionMethod,
                    extractionWarning
                )
                VALUES (
                    source.documentId,
                    source.extractedText,
                    source.normalizedText,
                    source.tokenCount,
                    source.extractionMethod,
                    source.extractionWarning
                );
        `);

    return true;
};

const getTextSimilarityCandidates = async ({ documentId, limit = 100 }) => {
    const tableExists = await hasTextArtifactsTable();
    if (!tableExists) {
        return [];
    }

    const pool = getPool();
    const result = await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .input('limit', sql.Int, limit)
        .query(`
            SELECT TOP (@limit)
                d.documentId,
                d.title,
                d.fileHash,
                d.originalFileName,
                d.status,
                d.createdAt,
                d.ownerUserId,
                u.name AS ownerName,
                ta.normalizedText,
                ta.tokenCount
            FROM dbo.Documents d
            INNER JOIN dbo.DocumentTextArtifacts ta ON ta.documentId = d.documentId
            INNER JOIN dbo.Users u ON u.userId = d.ownerUserId
            WHERE d.documentId <> @documentId
              AND d.status IN (N'pending', N'approved', N'rejected')
            ORDER BY d.createdAt DESC, d.documentId DESC;
        `);

    return result.recordset || [];
};

const getDocumentTextArtifact = async (documentId) => {
    const tableExists = await hasTextArtifactsTable();
    if (!tableExists) {
        return null;
    }

    const pool = getPool();
    const result = await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .query(`
            SELECT
                documentId,
                extractedText,
                normalizedText,
                tokenCount,
                extractionMethod,
                extractionWarning,
                createdAt,
                updatedAt
            FROM dbo.DocumentTextArtifacts
            WHERE documentId = @documentId;
        `);

    return result.recordset?.[0] || null;
};

module.exports = {
    upsertDocumentTextArtifact,
    getTextSimilarityCandidates,
    getDocumentTextArtifact,
};
