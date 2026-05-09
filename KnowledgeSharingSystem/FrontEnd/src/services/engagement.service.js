import { apiRequest } from "../api";

export function createEngagementFeature(ctx) {
  const { token, call, setStatus, setDocEngagementById, setDocRatingsById } = ctx;

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

  const mergeRatings = (documentId, data) => {
    if (!setDocRatingsById) return;
    setDocRatingsById((prev) => ({
      ...prev,
      [Number(documentId)]: data || {},
    }));
  };

  const fetchDocumentRatings = async (documentId) => {
    if (!documentId) return;

    const payload = await apiRequest(`/documents/${documentId}/ratings`, { token });
    mergeRatings(documentId, payload.data);
  };

  const saveDocumentRating = async (documentId, body) => {
    if (!token || !documentId) return;

    await call(async () => {
      const payload = await apiRequest(`/documents/${documentId}/ratings/me`, {
        method: "PUT",
        token,
        body,
      });
      mergeRatings(documentId, payload.data);
      setStatus(payload.message || "Document rating saved successfully.");
    });
  };

  const deleteDocumentRating = async (documentId) => {
    if (!token || !documentId) return;

    await call(async () => {
      const payload = await apiRequest(`/documents/${documentId}/ratings/me`, {
        method: "DELETE",
        token,
      });
      mergeRatings(documentId, payload.data);
      setStatus(payload.message || "Document rating removed successfully.");
    });
  };

  return {
    fetchDocumentEngagement,
    updateDocumentReaction,
    updateDocumentSavedState,
    fetchDocumentRatings,
    saveDocumentRating,
    deleteDocumentRating,
  };
}
