export function createModerationModel(input) {
  return {
    isModerator: !!input.isModerator,
    pendingDocs: Array.isArray(input.pendingDocs) ? input.pendingDocs : [],
    duplicateByDocId: input.duplicateByDocId || {},
  };
}
