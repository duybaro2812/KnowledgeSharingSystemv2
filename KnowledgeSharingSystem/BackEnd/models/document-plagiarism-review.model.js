const { getPool, sql } = require('../utils/db');

const createPlagiarismReview = async ({
    documentId,
    reviewedByUserId,
    decision,
    comparedDocumentId = null,
    plagiarismPercent = 0,
    note = null,
    snapshotMetadata = null,
}) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .input('reviewedByUserId', sql.Int, reviewedByUserId)
        .input('decision', sql.NVarChar(30), decision)
        .input('comparedDocumentId', sql.Int, comparedDocumentId)
        .input('plagiarismPercent', sql.Decimal(5, 2), Number(plagiarismPercent) || 0)
        .input('note', sql.NVarChar(255), note || null)
        .input(
            'snapshotMetadata',
            sql.NVarChar(sql.MAX),
            snapshotMetadata ? JSON.stringify(snapshotMetadata) : null
        )
        .query(`
            INSERT INTO dbo.DocumentPlagiarismReviews (
                documentId,
                reviewedByUserId,
                decision,
                comparedDocumentId,
                plagiarismPercent,
                note,
                snapshotMetadata
            )
            OUTPUT
                inserted.plagiarismReviewId,
                inserted.documentId,
                inserted.reviewedByUserId,
                inserted.decision,
                inserted.comparedDocumentId,
                inserted.plagiarismPercent,
                inserted.note,
                inserted.snapshotMetadata,
                inserted.createdAt
            VALUES (
                @documentId,
                @reviewedByUserId,
                @decision,
                @comparedDocumentId,
                @plagiarismPercent,
                @note,
                @snapshotMetadata
            );
        `);

    return result.recordset?.[0] || null;
};

const getLatestPlagiarismReviewByDocumentId = async (documentId) => {
    const pool = getPool();

    const result = await pool
        .request()
        .input('documentId', sql.Int, documentId)
        .query(`
            SELECT TOP 1
                pr.plagiarismReviewId,
                pr.documentId,
                pr.reviewedByUserId,
                reviewer.name AS reviewerName,
                pr.decision,
                pr.comparedDocumentId,
                compared.title AS comparedDocumentTitle,
                pr.plagiarismPercent,
                pr.note,
                pr.snapshotMetadata,
                pr.createdAt
            FROM dbo.DocumentPlagiarismReviews pr
            INNER JOIN dbo.Users reviewer ON reviewer.userId = pr.reviewedByUserId
            LEFT JOIN dbo.Documents compared ON compared.documentId = pr.comparedDocumentId
            WHERE pr.documentId = @documentId
            ORDER BY pr.createdAt DESC, pr.plagiarismReviewId DESC;
        `);

    return result.recordset?.[0] || null;
};

module.exports = {
    createPlagiarismReview,
    getLatestPlagiarismReviewByDocumentId,
};
