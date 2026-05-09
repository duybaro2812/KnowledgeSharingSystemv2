export function createSearchController(input) {
  return {
    onOpenDoc: (doc) => input.openPreviewReload(doc),
    onBackHome: () => input.setActiveTab("home"),
  };
}
