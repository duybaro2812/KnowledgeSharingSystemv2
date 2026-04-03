import { apiRequest } from "../api";

export function createCommentFeature(ctx) {
  const { token, call, setStatus, setPreviewComments } = ctx;

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

  return {
    loadCommentsByDocument,
    createComment,
    createReply,
  };
}
