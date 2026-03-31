import { apiRequest } from "../api";

export function createEngagementFeature(ctx) {
  const { token, call, setStatus, setDocEngagementById } = ctx;

  const mergeEngagement = (documentId, data) => {
    setDocEngagementById((prev) => ({
      ...prev,
      [Number(documentId)]: data || {},
    }));
  };

  const fetchDocumentEngagement = async (documentId) => {
    if (!token || !documentId) return;

    const payload = await apiRequest(`/documents/${documentId}/engagement`, { token });
    mergeEngagement(documentId, payload.data);
  };

  const updateDocumentReaction = async (documentId, reactionType) => {
    await call(async () => {
      const payload = await apiRequest(`/documents/${documentId}/reaction`, {
        method: "PATCH",
        token,
        body: { reactionType },
      });
      mergeEngagement(documentId, payload.data);
      setStatus(payload.message || "Reaction updated.");
    });
  };

  const updateDocumentSavedState = async (documentId, isSaved) => {
    await call(async () => {
      const payload = await apiRequest(`/documents/${documentId}/save`, {
        method: "PATCH",
        token,
        body: { isSaved },
      });
      mergeEngagement(documentId, payload.data);
      setStatus(payload.message || "Saved state updated.");
    });
  };

  return {
    fetchDocumentEngagement,
    updateDocumentReaction,
    updateDocumentSavedState,
  };
}
