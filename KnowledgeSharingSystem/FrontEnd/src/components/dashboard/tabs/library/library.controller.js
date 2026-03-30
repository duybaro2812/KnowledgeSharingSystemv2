export function createLibraryController(input) {
  return {
    onPreviewDoc: (doc) => input.openPreviewReload(doc),
    resolveUrl: (url) => input.resolveFileUrl(url),
  };
}
