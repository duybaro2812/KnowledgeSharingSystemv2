import { apiRequest } from "../api";

export function createCategoryFeature(ctx) {
  const {
    token,
    newCategoryForm,
    setUploadForm,
    setNewCategoryForm,
    setStatus,
    setSelectedCategory,
    setCategoryDocs,
    call,
    loadCategories,
  } = ctx;

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    await call(async () => {
      const payload = await apiRequest("/categories", {
        method: "POST",
        token,
        body: newCategoryForm,
      });
      setUploadForm((prev) => ({
        ...prev,
        categoryNames: prev.categoryNames
          ? `${prev.categoryNames}, ${payload.data.name}`
          : payload.data.name,
      }));
      setNewCategoryForm({ name: "", description: "" });
      setStatus("Category created.");
      await loadCategories();
    });
  };

  const handleCategoryClick = async (category) => {
    await call(async () => {
      let payload;
      try {
        payload = await apiRequest("/documents", {
          query: { categoryId: category.categoryId },
        });
      } catch {
        payload = await apiRequest("/documents", {
          query: { categoryKeyword: category.name },
        });
      }
      setSelectedCategory(category);
      setCategoryDocs(payload.data || []);
      setStatus(
        `Loaded ${payload.data?.length || 0} documents for category "${category.name}".`,
      );
    });
  };

  return {
    handleCreateCategory,
    handleCategoryClick,
  };
}
