import { apiRequest } from "../api";

export function createModerationFeature(ctx) {
  const {
    token,
    setStatus,
    setDuplicateByDocId,
    call,
    loadDocuments,
    loadPendingDocuments,
    loadMyDocuments,
  } = ctx;

  const moderateDocument = async (documentId, decision) => {
    const note = decision === "rejected" ? prompt("Rejection reason:") || "" : "Upload success";
    if (decision === "rejected" && !note.trim()) return;
    await call(async () => {
      await apiRequest(`/documents/${documentId}/review`, {
        method: "PATCH",
        token,
        body: { decision, note },
      });
      setStatus(`${decision} document #${documentId} successfully.`);
      await loadPendingDocuments();
      await loadMyDocuments();
    });
  };

  const lockUnlockDelete = async (documentId, action) => {
    await call(async () => {
      if (action === "delete") {
        await apiRequest(`/documents/${documentId}`, { method: "DELETE", token });
      } else if (action === "lock") {
        await apiRequest(`/documents/${documentId}/lock`, {
          method: "PATCH",
          token,
          body: { reason: "Reported for review" },
        });
      } else {
        await apiRequest(`/documents/${documentId}/unlock`, {
          method: "PATCH",
          token,
          body: { note: "Legit document" },
        });
      }
      setStatus(`${action} document #${documentId} successfully.`);
      await loadDocuments();
      await loadPendingDocuments();
      await loadMyDocuments();
    });
  };

  const loadDuplicateCandidates = async (documentId) => {
    await call(async () => {
      const payload = await apiRequest(`/documents/${documentId}/duplicate-candidates`, { token });
      setDuplicateByDocId((prev) => ({ ...prev, [documentId]: payload.data || [] }));
    });
  };

  return {
    moderateDocument,
    lockUnlockDelete,
    loadDuplicateCandidates,
  };
}
