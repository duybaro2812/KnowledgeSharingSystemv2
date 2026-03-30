export function createModerationController(input) {
  return {
    onOpenPreview: (doc) => input.openPreview(doc),
    onCheckDuplicate: (docId) => input.loadDuplicateCandidates(docId),
    onApprove: (docId) => input.moderateDocument(docId, "approved"),
    onReject: (docId) => input.moderateDocument(docId, "rejected"),
    onLock: (docId) => input.lockUnlockDelete(docId, "lock"),
    onUnlock: (docId) => input.lockUnlockDelete(docId, "unlock"),
    onDelete: (docId) => input.lockUnlockDelete(docId, "delete"),
  };
}
