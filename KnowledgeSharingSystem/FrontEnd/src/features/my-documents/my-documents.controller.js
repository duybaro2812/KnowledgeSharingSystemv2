export function createMyDocumentsController(input) {
  return {
    onUploadNew: () => input.setActiveTab?.("upload"),
    onOpenDoc: (doc) => input.openPreviewReload?.(doc),
    resolveUrl: (url) => input.resolveFileUrl?.(url),
  };
}
