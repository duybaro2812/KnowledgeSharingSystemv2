export function createCategoriesModel(input) {
  return {
    newCategoryForm: input.newCategoryForm,
    categories: Array.isArray(input.categories) ? input.categories : [],
    selectedCategory: input.selectedCategory,
    categoryDocs: Array.isArray(input.categoryDocs) ? input.categoryDocs : [],
  };
}
