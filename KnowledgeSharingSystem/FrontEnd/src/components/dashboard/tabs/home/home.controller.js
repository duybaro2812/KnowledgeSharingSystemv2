export function createHomeController(input) {
  return {
    onPreviewDoc: (doc) => input.openPreview(doc),
    resolveUrl: (url) => input.resolveFileUrl(url),
  };
}
