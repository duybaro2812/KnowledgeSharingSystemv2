export function createCategoriesModel(input) {
  return {
    isModerator: Boolean(input.isModerator),
    newCategoryForm: input.newCategoryForm,
    categories: Array.isArray(input.categories) ? input.categories : [],
    selectedCategory: input.selectedCategory,
    categoryDocs: Array.isArray(input.categoryDocs) ? input.categoryDocs : [],
  };
}
