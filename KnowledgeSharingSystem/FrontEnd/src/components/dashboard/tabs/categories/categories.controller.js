export function createCategoriesController(input) {
  return {
    onSubmitCreateCategory: input.handleCreateCategory,
    onChangeCategoryName: (value) =>
      input.setNewCategoryForm((p) => ({ ...p, name: value })),
    onChangeCategoryDescription: (value) =>
      input.setNewCategoryForm((p) => ({ ...p, description: value })),
    onSelectCategory: (category) => input.handleCategoryClick(category),
    onPreviewDoc: (doc) => input.openPreview(doc),
    resolveUrl: (url) => input.resolveFileUrl(url),
  };
}
