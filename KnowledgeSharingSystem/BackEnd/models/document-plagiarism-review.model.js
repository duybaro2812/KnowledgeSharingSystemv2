const { getPool, sql, isPostgresClient } = require('../utils/db');

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

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                INSERT INTO document_plagiarism_reviews (
                    document_id,
                    reviewed_by_user_id,
                    decision,
                    compared_document_id,
                    plagiarism_percent,
                    note,
                    snapshot_metadata
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING
                    plagiarism_review_id AS "plagiarismReviewId",
                    document_id AS "documentId",
                    reviewed_by_user_id AS "reviewedByUserId",
                    decision,
                    compared_document_id AS "comparedDocumentId",
                    plagiarism_percent AS "plagiarismPercent",
                    note,
                    snapshot_metadata AS "snapshotMetadata",
                    created_at AS "createdAt";
            `,
            [
                documentId,
                reviewedByUserId,
                decision,
                comparedDocumentId,
                Number(plagiarismPercent) || 0,
                note || null,
                snapshotMetadata ? JSON.stringify(snapshotMetadata) : null,
            ]
        );

        return result.rows?.[0] || null;
    }

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

    if (isPostgresClient()) {
        const result = await pool.query(
            `
                SELECT
                    pr.plagiarism_review_id AS "plagiarismReviewId",
                    pr.document_id AS "documentId",
                    pr.reviewed_by_user_id AS "reviewedByUserId",
                    reviewer.name AS "reviewerName",
                    pr.decision,
                    pr.compared_document_id AS "comparedDocumentId",
                    compared.title AS "comparedDocumentTitle",
                    pr.plagiarism_percent AS "plagiarismPercent",
                    pr.note,
                    pr.snapshot_metadata AS "snapshotMetadata",
                    pr.created_at AS "createdAt"
                FROM document_plagiarism_reviews pr
                INNER JOIN users reviewer ON reviewer.user_id = pr.reviewed_by_user_id
                LEFT JOIN documents compared ON compared.document_id = pr.compared_document_id
                WHERE pr.document_id = $1
                ORDER BY pr.created_at DESC, pr.plagiarism_review_id DESC
                LIMIT 1;
            `,
            [documentId]
        );
        return result.rows?.[0] || null;
    }

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
