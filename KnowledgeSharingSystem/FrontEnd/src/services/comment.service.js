import { apiRequest } from "../api";

export function createCommentFeature(ctx) {
  const { token, call, setStatus, setPreviewComments, setPendingComments } = ctx;

  const loadCommentsByDocument = async (documentId) => {
    if (!documentId) {
      setPreviewComments([]);
      return;
    }

    const payload = await apiRequest(`/documents/${documentId}/comments`, { token });
    setPreviewComments(Array.isArray(payload.data) ? payload.data : []);
  };

  const createComment = async (documentId, content) => {
    const normalized = typeof content === "string" ? content.trim() : "";
    if (!normalized) return;

    await call(async () => {
      const payload = await apiRequest(`/documents/${documentId}/comments`, {
        method: "POST",
        token,
        body: { content: normalized },
      });
      setStatus(payload.message || "Comment created successfully.");
      await loadCommentsByDocument(documentId);
    });
  };

  const createReply = async (parentCommentId, content, documentIdForRefresh) => {
    const normalized = typeof content === "string" ? content.trim() : "";
    if (!normalized) return;

    await call(async () => {
      const payload = await apiRequest(`/comments/${parentCommentId}/replies`, {
        method: "POST",
        token,
        body: { content: normalized },
      });
      setStatus(payload.message || "Reply created successfully.");
      if (documentIdForRefresh) {
        await loadCommentsByDocument(documentIdForRefresh);
      }
    });
  };

  const loadPendingCommentsForModeration = async () => {
    if (!token) {
      if (setPendingComments) setPendingComments([]);
      return;
    }

    const payload = await apiRequest("/comments/moderation/pending", { token });
    if (setPendingComments) {
      setPendingComments(Array.isArray(payload.data) ? payload.data : []);
    }
  };

  const reviewPendingComment = async (commentId, body) => {
    await call(async () => {
      const payload = await apiRequest(`/comments/${commentId}/review`, {
        method: "PATCH",
        token,
        body,
      });
      setStatus(payload.message || "Comment reviewed successfully.");
      await loadPendingCommentsForModeration();
    });
  };

  const hideCommentForModeration = async (commentId, documentIdForRefresh = null) => {
    await call(async () => {
      const payload = await apiRequest(`/comments/${commentId}/hide`, {
        method: "PATCH",
        token,
      });
      setStatus(payload.message || "Comment hidden successfully.");
      await loadPendingCommentsForModeration();
      if (documentIdForRefresh) {
        await loadCommentsByDocument(documentIdForRefresh);
      }
    });
  };

  return {
    loadCommentsByDocument,
    createComment,
    createReply,
    loadPendingCommentsForModeration,
    reviewPendingComment,
    hideCommentForModeration,
  };
}
