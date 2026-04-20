export function createDocumentsController(input) {
  const ensureModerator = () => {
    if (!input.isModerator) return false;
    return true;
  };

  return {
    onRefresh: async () => {
      const tasks = [];
      if (input.loadAllUploadedDocuments) tasks.push(input.loadAllUploadedDocuments());
      if (input.loadModerationOverview) tasks.push(input.loadModerationOverview());
      if (input.loadPendingDocuments) tasks.push(input.loadPendingDocuments());
      if (!tasks.length) return;
      await Promise.allSettled(tasks);
    },
    onOpenPreview: (doc) => input.openPreview && input.openPreview(doc),
    onCheckDuplicate: (documentId) =>
      ensureModerator() && input.loadDuplicateCandidates && input.loadDuplicateCandidates(documentId),
    onApprove: (documentId) =>
      ensureModerator() && input.moderateDocument && input.moderateDocument(documentId, "approved"),
    onReject: (documentId) =>
      ensureModerator() && input.moderateDocument && input.moderateDocument(documentId, "rejected"),
    onDelete: (documentId) =>
      ensureModerator() && input.lockUnlockDelete && input.lockUnlockDelete(documentId, "delete"),
  };
}

