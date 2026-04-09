export function createHomeController(input) {
  const runSearchWithFilter = async (nextFilter) => {
    await input.call(() => input.loadDocuments(nextFilter));
  };

  return {
    onPreviewDoc: (doc) => input.openPreviewReload(doc),
    onSelectDocumentCard: (doc) => input.openPreviewReload(doc),
    resolveUrl: (url) => input.resolveFileUrl(url),
    onReportDoc: (documentId) => input.submitDocumentReport(documentId),
    onGoToTab: (tab) => input.setActiveTab(tab),
    searchKeyword: input.docFilter?.keyword || "",
    onChangeSearchKeyword: (value) =>
      input.setDocFilter((prev) => ({
        ...prev,
        keyword: value,
      })),
    searchSuggestions: input.searchSuggestions || [],
    onLiveSearch: async () => {
      await runSearchWithFilter(input.docFilter);
    },
    onRunSearch: async () => {
      await runSearchWithFilter(input.docFilter);
      input.setActiveTab("search");
    },
    onSelectSearchSuggestion: async (suggestion) => {
      if (!suggestion) return;

      if (suggestion.type === "document" && suggestion.doc) {
        input.openPreviewReload(suggestion.doc);
        return;
      }

      if (suggestion.type === "course") {
        const nextFilter = {
          ...(input.docFilter || {}),
          keyword: suggestion.label || suggestion.name || "",
          categoryKeyword: suggestion.name || suggestion.label || "",
          categoryId: suggestion.categoryId || "",
        };
        input.setDocFilter(() => nextFilter);
        await runSearchWithFilter(nextFilter);
        input.setActiveTab("search");
        return;
      }
    },
    onOpenCategory: async (category) => {
      if (!category?.name) {
        input.setActiveTab("categories");
        return;
      }

      const nextFilter = {
        ...(input.docFilter || {}),
        categoryKeyword: category.name,
        categoryId: category.categoryId || "",
      };

      input.setDocFilter(() => nextFilter);

      await runSearchWithFilter(nextFilter);
      input.setActiveTab("categories");
    },
    isOwnerDoc: (doc, currentUserId) =>
      Number(doc?.ownerUserId) === Number(currentUserId),
  };
}
