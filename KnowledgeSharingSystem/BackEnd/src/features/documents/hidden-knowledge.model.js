const { getPool } = require('../../../utils/db');
const { POINT_POLICY } = require('../../../config/point-policy');

const MIN_HIDDEN_KNOWLEDGE_POINTS = 61;

const isModeratorRole = (role) =>
    ['moderator', 'admin'].includes(String(role || '').trim().toLowerCase());

const getUserAccess = async (client, userId) => {
    const result = await client.query(
        `
            SELECT
                user_id AS "userId",
                name,
                role,
                points
            FROM users
            WHERE user_id = $1
            LIMIT 1;
        `,
        [userId]
    );

    return result.rows[0] || null;
};

const getDocument = async (client, documentId) => {
    const result = await client.query(
        `
            SELECT
                d.document_id AS "documentId",
                d.title,
                d.owner_user_id AS "ownerUserId",
                owner.name AS "ownerName"
            FROM documents d
            LEFT JOIN users owner ON owner.user_id = d.owner_user_id
            WHERE d.document_id = $1
            LIMIT 1;
        `,
        [documentId]
    );

    return result.rows[0] || null;
};

const getKnowledgeRow = async (client, documentId) => {
    const result = await client.query(
        `
            SELECT
                hk.knowledge_id AS "knowledgeId",
                hk.document_id AS "documentId",
                d.title AS "documentTitle",
                hk.title,
                hk.content,
                hk.status,
                hk.min_points_to_view AS "minPointsToView",
                hk.created_by_user_id AS "createdByUserId",
                creator.name AS "createdByName",
                hk.updated_by_user_id AS "updatedByUserId",
                updater.name AS "updatedByName",
                hk.published_by_user_id AS "publishedByUserId",
                publisher.name AS "publishedByName",
                hk.export_file_url AS "exportFileUrl",
                hk.export_mime_type AS "exportMimeType",
                hk.created_at AS "createdAt",
                hk.updated_at AS "updatedAt",
                hk.published_at AS "publishedAt"
            FROM document_hidden_knowledge hk
            INNER JOIN documents d ON d.document_id = hk.document_id
            LEFT JOIN users creator ON creator.user_id = hk.created_by_user_id
            LEFT JOIN users updater ON updater.user_id = hk.updated_by_user_id
            LEFT JOIN users publisher ON publisher.user_id = hk.published_by_user_id
            WHERE hk.document_id = $1
            LIMIT 1;
        `,
        [documentId]
    );

    return result.rows[0] || null;
};

const ensureKnowledge = async ({ client, documentId, moderatorUserId }) => {
    const document = await getDocument(client, documentId);
    if (!document) {
        const error = new Error('Document not found.');
        error.statusCode = 404;
        throw error;
    }

    await client.query(
        `
            INSERT INTO document_hidden_knowledge (
                document_id,
                title,
                content,
                status,
                min_points_to_view,
                created_by_user_id
            )
            VALUES ($1, $2, '', 'draft', $3, $4)
            ON CONFLICT (document_id) DO NOTHING;
        `,
        [
            documentId,
            `Tong hop kinh nghiem: ${document.title || `Document #${documentId}`}`,
            POINT_POLICY.unlock?.hiddenKnowledgeThreshold || MIN_HIDDEN_KNOWLEDGE_POINTS,
            moderatorUserId,
        ]
    );

    return getKnowledgeRow(client, documentId);
};

const getHiddenKnowledgeForViewer = async ({ documentId, viewerUserId }) => {
    const pool = getPool();
    const client = await pool.connect();

    try {
        const [viewer, document, existingKnowledge] = await Promise.all([
            getUserAccess(client, viewerUserId),
            getDocument(client, documentId),
            getKnowledgeRow(client, documentId),
        ]);
        let knowledge = existingKnowledge;

        if (!viewer) {
            const error = new Error('User not found.');
            error.statusCode = 404;
            throw error;
        }

        if (!document) {
            const error = new Error('Document not found.');
            error.statusCode = 404;
            throw error;
        }

        const canEdit = isModeratorRole(viewer.role);
        if (canEdit && !knowledge) {
            knowledge = await ensureKnowledge({
                client,
                documentId,
                moderatorUserId: viewerUserId,
            });
        }

        const requiredPoints = Number(
            POINT_POLICY.unlock?.hiddenKnowledgeThreshold ||
            knowledge?.minPointsToView ||
            MIN_HIDDEN_KNOWLEDGE_POINTS
        );
        const canView = canEdit || Number(viewer.points || 0) >= requiredPoints;

        if (!canView) {
            const error = new Error(`Bạn cần ít nhất ${requiredPoints} điểm để xem Bài tổng hợp kinh nghiệm của tài liệu.`);
            error.statusCode = 403;
            error.data = {
                requiredPoints,
                currentPoints: Number(viewer.points || 0),
            };
            throw error;
        }

        if (!knowledge || (!canEdit && String(knowledge.status || '') !== 'published')) {
            const error = new Error('Hidden knowledge has not been published for this document.');
            error.statusCode = 404;
            throw error;
        }

        return {
            ...knowledge,
            canEdit,
            canView,
            viewerPoints: Number(viewer.points || 0),
            requiredPoints,
        };
    } finally {
        client.release();
    }
};

const updateHiddenKnowledge = async ({
    documentId,
    editorUserId,
    title,
    content,
    status,
    exportFileUrl = null,
    exportMimeType = null,
}) => {
    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await ensureKnowledge({ client, documentId, moderatorUserId: editorUserId });

        const result = await client.query(
            `
                UPDATE document_hidden_knowledge
                SET
                    title = COALESCE($3::VARCHAR(255), title),
                    content = COALESCE($4::TEXT, content),
                    status = COALESCE($5::VARCHAR(20), status),
                    updated_by_user_id = $2,
                    updated_at = NOW(),
                    published_by_user_id = CASE
                        WHEN $5::TEXT = 'published' THEN $2
                        ELSE published_by_user_id
                    END,
                    published_at = CASE
                        WHEN $5::TEXT = 'published' THEN COALESCE(published_at, NOW())
                        WHEN $5::TEXT IN ('draft', 'archived') THEN NULL
                        ELSE published_at
                    END,
                    export_file_url = COALESCE($6::VARCHAR(500), export_file_url),
                    export_mime_type = COALESCE($7::VARCHAR(100), export_mime_type)
                WHERE document_id = $1
                RETURNING knowledge_id AS "knowledgeId";
            `,
            [documentId, editorUserId, title || null, content ?? null, status || null, exportFileUrl, exportMimeType]
        );

        await client.query('COMMIT');
        return getKnowledgeRow(client, documentId) || result.rows[0] || null;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const loadSource = async ({ client, documentId, sourceType, sourceId, extractedText }) => {
    if (sourceType === 'manual') {
        const text = String(extractedText || '').trim();
        if (!text) {
            const error = new Error('extractedText is required for manual hidden knowledge sources.');
            error.statusCode = 400;
            throw error;
        }
        return {
            sourceUserId: null,
            sourceUserName: 'Moderator',
            extractedText: text,
            sourceLabel: 'Manual insight',
        };
    }

    if (!Number.isInteger(sourceId) || sourceId <= 0) {
        const error = new Error('A valid sourceId is required.');
        error.statusCode = 400;
        throw error;
    }

    if (sourceType === 'comment') {
        const result = await client.query(
            `
                SELECT
                    c.comment_id AS "sourceId",
                    c.author_user_id AS "sourceUserId",
                    u.name AS "sourceUserName",
                    c.content AS "extractedText",
                    c.created_at AS "createdAt"
                FROM comments c
                INNER JOIN users u ON u.user_id = c.author_user_id
                WHERE c.comment_id = $1
                  AND c.document_id = $2
                LIMIT 1;
            `,
            [sourceId, documentId]
        );

        const row = result.rows[0];
        if (!row) {
            const error = new Error('Comment source not found for this document.');
            error.statusCode = 404;
            throw error;
        }
        return {
            ...row,
            sourceLabel: `Comment by ${row.sourceUserName || 'User'}`,
        };
    }

    if (sourceType === 'question_message') {
        const result = await client.query(
            `
                SELECT
                    qm.message_id AS "sourceId",
                    qm.sender_user_id AS "sourceUserId",
                    u.name AS "sourceUserName",
                    qm.message AS "extractedText",
                    qm.created_at AS "createdAt"
                FROM question_messages qm
                INNER JOIN question_sessions qs ON qs.session_id = qm.session_id
                INNER JOIN users u ON u.user_id = qm.sender_user_id
                WHERE qm.message_id = $1
                  AND qs.document_id = $2
                LIMIT 1;
            `,
            [sourceId, documentId]
        );

        const row = result.rows[0];
        if (!row) {
            const error = new Error('Q&A message source not found for this document.');
            error.statusCode = 404;
            throw error;
        }
        return {
            ...row,
            sourceLabel: `Q&A message by ${row.sourceUserName || 'User'}`,
        };
    }

    if (sourceType === 'qa_rating_feedback') {
        const result = await client.query(
            `
                SELECT
                    qrf.feedback_id AS "sourceId",
                    qrf.user_id AS "sourceUserId",
                    u.name AS "sourceUserName",
                    qrf.question_summary AS "questionSummary",
                    qrf.author_solution AS "authorSolution",
                    qrf.satisfaction_note AS "satisfactionNote",
                    qrf.is_satisfied AS "isSatisfied",
                    qrf.created_at AS "createdAt"
                FROM qa_rating_feedback qrf
                INNER JOIN users u ON u.user_id = qrf.user_id
                WHERE qrf.feedback_id = $1
                  AND qrf.document_id = $2
                LIMIT 1;
            `,
            [sourceId, documentId]
        );

        const row = result.rows[0];
        if (!row) {
            const error = new Error('Q&A rating feedback source not found for this document.');
            error.statusCode = 404;
            throw error;
        }

        const parts = [
            row.questionSummary ? `Thac mac: ${row.questionSummary}` : '',
            row.authorSolution ? `Cach tac gia giai quyet: ${row.authorSolution}` : '',
            row.satisfactionNote ? `Danh gia hai long: ${row.satisfactionNote}` : '',
            typeof row.isSatisfied === 'boolean'
                ? `Hai long: ${row.isSatisfied ? 'Co' : 'Khong'}`
                : '',
        ].filter(Boolean);

        return {
            sourceUserId: row.sourceUserId,
            sourceUserName: row.sourceUserName,
            extractedText: parts.join('\n') || String(extractedText || '').trim(),
            sourceLabel: `Q&A feedback by ${row.sourceUserName || 'User'}`,
        };
    }

    const error = new Error("sourceType must be one of 'comment', 'question_message', 'qa_rating_feedback', 'manual'.");
    error.statusCode = 400;
    throw error;
};

const buildContentBlock = ({ sourceType, source, text }) => {
    const labelByType = {
        comment: 'Comment insight',
        question_message: 'Q&A message insight',
        qa_rating_feedback: 'Q&A rating feedback',
        manual: 'Manual insight',
    };
    const title = labelByType[sourceType] || 'Experience insight';
    const author = source.sourceUserName ? ` - ${source.sourceUserName}` : '';
    return `### ${title}${author}\n${text}`;
};

const addHiddenKnowledgeSource = async ({
    documentId,
    moderatorUserId,
    sourceType,
    sourceId = null,
    extractedText = '',
}) => {
    const pool = getPool();
    const client = await pool.connect();
    const normalizedType = String(sourceType || '').trim().toLowerCase();
    const parsedSourceId = sourceId === null || sourceId === undefined || sourceId === ''
        ? null
        : Number(sourceId);

    try {
        await client.query('BEGIN');
        const knowledge = await ensureKnowledge({ client, documentId, moderatorUserId });
        const source = await loadSource({
            client,
            documentId,
            sourceType: normalizedType,
            sourceId: parsedSourceId,
            extractedText,
        });

        const text = String(source.extractedText || '').trim();
        if (!text) {
            const error = new Error('Source text is empty.');
            error.statusCode = 400;
            throw error;
        }

        const duplicateParams = [knowledge.knowledgeId, normalizedType, parsedSourceId];
        const duplicateResult = await client.query(
            `
                SELECT source_id AS "sourceId"
                FROM hidden_knowledge_sources
                WHERE knowledge_id = $1
                  AND source_type = $2::VARCHAR(30)
                  AND (
                        ($2::TEXT = 'comment' AND comment_id = $3::INT)
                     OR ($2::TEXT = 'question_message' AND message_id = $3::INT)
                     OR ($2::TEXT = 'qa_rating_feedback' AND feedback_id = $3::INT)
                  )
                LIMIT 1;
            `,
            duplicateParams
        );

        if (duplicateResult.rows[0]) {
            await client.query('COMMIT');
            return {
                knowledge: await getKnowledgeRow(client, documentId),
                source: duplicateResult.rows[0],
                appended: false,
            };
        }

        const insertResult = await client.query(
            `
                INSERT INTO hidden_knowledge_sources (
                    knowledge_id,
                    document_id,
                    source_type,
                    comment_id,
                    message_id,
                    feedback_id,
                    source_user_id,
                    added_by_user_id,
                    extracted_text
                )
                VALUES (
                    $1,
                    $2,
                    $3::VARCHAR(30),
                    CASE WHEN $3::TEXT = 'comment' THEN $4::INT ELSE NULL::INT END,
                    CASE WHEN $3::TEXT = 'question_message' THEN $4::INT ELSE NULL::INT END,
                    CASE WHEN $3::TEXT = 'qa_rating_feedback' THEN $4::INT ELSE NULL::INT END,
                    $5,
                    $6,
                    $7
                )
                RETURNING source_id AS "sourceId";
            `,
            [
                knowledge.knowledgeId,
                documentId,
                normalizedType,
                parsedSourceId,
                source.sourceUserId || null,
                moderatorUserId,
                text,
            ]
        );

        const block = buildContentBlock({ sourceType: normalizedType, source, text });
        const nextContent = knowledge.content
            ? `${knowledge.content.trim()}\n\n${block}`
            : block;

        await client.query(
            `
                UPDATE document_hidden_knowledge
                SET
                    content = $3,
                    updated_by_user_id = $2,
                    updated_at = NOW()
                WHERE knowledge_id = $1;
            `,
            [knowledge.knowledgeId, moderatorUserId, nextContent]
        );

        await client.query('COMMIT');

        return {
            knowledge: await getKnowledgeRow(client, documentId),
            source: insertResult.rows[0],
            appended: true,
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const listSourcesForDocument = async ({ documentId }) => {
    const pool = getPool();
    const result = await pool.query(
        `
            SELECT
                hks.source_id AS "sourceId",
                hks.knowledge_id AS "knowledgeId",
                hks.document_id AS "documentId",
                hks.source_type AS "sourceType",
                hks.comment_id AS "commentId",
                hks.message_id AS "messageId",
                hks.feedback_id AS "feedbackId",
                hks.source_user_id AS "sourceUserId",
                source_user.name AS "sourceUserName",
                hks.added_by_user_id AS "addedByUserId",
                added_by.name AS "addedByName",
                hks.extracted_text AS "extractedText",
                hks.created_at AS "createdAt"
            FROM hidden_knowledge_sources hks
            LEFT JOIN users source_user ON source_user.user_id = hks.source_user_id
            INNER JOIN users added_by ON added_by.user_id = hks.added_by_user_id
            WHERE hks.document_id = $1
            ORDER BY hks.created_at DESC, hks.source_id DESC;
        `,
        [documentId]
    );

    return result.rows;
};

module.exports = {
    MIN_HIDDEN_KNOWLEDGE_POINTS,
    addHiddenKnowledgeSource,
    getHiddenKnowledgeForViewer,
    listSourcesForDocument,
    updateHiddenKnowledge,
};
