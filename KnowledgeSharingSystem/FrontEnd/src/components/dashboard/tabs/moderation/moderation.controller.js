export function createModerationController(input) {
  const toIntOrNull = (rawValue) => {
    if (rawValue === null) return null;
    const trimmed = String(rawValue).trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed)) return null;
    return parsed;
  };

  return {
    onOpenPreview: (doc) => input.openPreview(doc),
    onCheckDuplicate: (docId) => input.loadDuplicateCandidates(docId),
    onApprove: (docId) => input.moderateDocument(docId, "approved"),
    onReject: (docId) => input.moderateDocument(docId, "rejected"),
    onLock: (docId) => input.lockUnlockDelete(docId, "lock"),
    onUnlock: (docId) => input.lockUnlockDelete(docId, "unlock"),
    onDelete: (docId) => input.lockUnlockDelete(docId, "delete"),
    onResolveReportedUnlock: (docId) =>
      input.resolveReportedDocument(docId, "unlock"),
    onResolveReportedDelete: (docId) =>
      input.resolveReportedDocument(docId, "delete"),
    onApprovePointEvent: (eventId) => {
      const rawPointDelta = window.prompt(
        "Optional pointDelta override (leave empty to use suggested points):",
        "",
      );
      if (rawPointDelta === null) return;
      const parsed = toIntOrNull(rawPointDelta);
      const note = window.prompt("Review note (optional):", "") || "";

      const body = { decision: "approved", note: note.trim() };
      if (parsed !== null) body.pointDelta = parsed;
      input.reviewPointEvent(eventId, body);
    },
    onRejectPointEvent: (eventId) => {
      const note = window.prompt("Rejection reason:", "") || "";
      if (!note.trim()) return;
      input.reviewPointEvent(eventId, { decision: "rejected", note: note.trim() });
    },
  };
}
