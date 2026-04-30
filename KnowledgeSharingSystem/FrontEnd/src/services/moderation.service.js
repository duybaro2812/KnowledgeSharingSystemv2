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
    let result = null;
    await call(async () => {
      const payload = await apiRequest(`/documents/${documentId}/plagiarism-recheck`, {
        method: "POST",
        token,
      });
      result = payload?.data?.plagiarismCheck || payload?.data || null;
      setDuplicateByDocId((prev) => ({
        ...prev,
        [documentId]: Array.isArray(result?.topCandidates) ? result.topCandidates : [],
      }));
      setStatus(payload?.message || `Duplicate check completed for document #${documentId}.`);
    }, { actionKey: `doc:duplicate:${documentId}` });
    return result;
  };

  return {
    moderateDocument,
    lockUnlockDelete,
    loadDuplicateCandidates,
  };
}
