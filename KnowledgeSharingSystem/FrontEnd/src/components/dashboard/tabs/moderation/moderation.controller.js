export function createModerationController(input) {
  const ensureModerator = () => {
    if (!input.isModerator) return false;
    return true;
  };

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
    onCheckDuplicate: (docId) => ensureModerator() && input.loadDuplicateCandidates(docId),
    onApprove: (docId) => ensureModerator() && input.moderateDocument(docId, "approved"),
    onReject: (docId) => ensureModerator() && input.moderateDocument(docId, "rejected"),
    onLock: (docId) => ensureModerator() && input.lockUnlockDelete(docId, "lock"),
    onUnlock: (docId) => ensureModerator() && input.lockUnlockDelete(docId, "unlock"),
    onDelete: (docId) => ensureModerator() && input.lockUnlockDelete(docId, "delete"),
    onResolveReportedUnlock: (docId) =>
      ensureModerator() && input.resolveReportedDocument(docId, "unlock"),
    onResolveReportedDelete: (docId) =>
      ensureModerator() && input.resolveReportedDocument(docId, "delete"),
    onApprovePointEvent: (eventId) => {
      if (!ensureModerator()) return;
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
    onApprovePointEventInline: (eventId, pointDelta, note = "") => {
      if (!ensureModerator()) return;
      const parsedPointDelta = toIntOrNull(pointDelta);
      const body = { decision: "approved", note: String(note || "").trim() };
      if (parsedPointDelta !== null) body.pointDelta = parsedPointDelta;
      input.reviewPointEvent(eventId, body);
    },
    onRejectPointEvent: (eventId) => {
      if (!ensureModerator()) return;
      const note = window.prompt("Rejection reason:", "") || "";
      if (!note.trim()) return;
      input.reviewPointEvent(eventId, { decision: "rejected", note: note.trim() });
    },
    onRejectPointEventInline: (eventId, note = "") => {
      if (!ensureModerator()) return;
      const normalizedNote = String(note || "").trim();
      if (!normalizedNote) return;
      input.reviewPointEvent(eventId, { decision: "rejected", note: normalizedNote });
    },
    onApproveComment: (commentId, reviewNote = "") =>
      ensureModerator() &&
      input.reviewPendingComment(commentId, {
        decision: "approved",
        reviewNote: String(reviewNote || "").trim(),
      }),
    onRejectComment: (commentId, reviewNote = "") => {
      if (!ensureModerator()) return;
      const normalized = String(reviewNote || "").trim();
      if (!normalized) return;
      input.reviewPendingComment(commentId, {
        decision: "rejected",
        reviewNote: normalized,
      });
    },
    onHideComment: (commentId, documentId = null) =>
      ensureModerator() && input.hideCommentForModeration(commentId, documentId),
    onRefreshOverview: () => ensureModerator() && input.loadModerationOverview(),
  };
}
