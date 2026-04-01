export function createModerationModel(input) {
  return {
    isModerator: !!input.isModerator,
    pendingDocs: Array.isArray(input.pendingDocs) ? input.pendingDocs : [],
    reportedDocs: Array.isArray(input.reportedDocs) ? input.reportedDocs : [],
    pendingPointEvents: Array.isArray(input.pendingPointEvents)
      ? input.pendingPointEvents
      : [],
    duplicateByDocId: input.duplicateByDocId || {},
  };
}
