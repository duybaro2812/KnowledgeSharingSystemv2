export function createHomeController(input) {
  return {
    onPreviewDoc: (doc) => input.openPreviewReload(doc),
    onSelectDocumentCard: (doc) => input.openPreviewReload(doc),
    resolveUrl: (url) => input.resolveFileUrl(url),
    onReportDoc: (documentId) => input.submitDocumentReport(documentId),
    isOwnerDoc: (doc, currentUserId) =>
      Number(doc?.ownerUserId) === Number(currentUserId),
  };
}
