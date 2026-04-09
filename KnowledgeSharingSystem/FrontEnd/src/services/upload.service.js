import { apiRequest } from "../api";

export const parseCategoryNames = (raw) => {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  ];
};

export function createUploadFeature(ctx) {
  const {
    token,
    uploadForm,
    courseInput,
    tagInput,
    selectedTags,
    setUploadForm,
    setCourseInput,
    setShowCourseDropdown,
    setTagInput,
    setSelectedTags,
    setStatus,
    setError,
    isUploadSubmitting,
    setIsUploadSubmitting,
    isModerator,
    call,
    loadMyDocuments,
    loadPendingDocuments,
    loadCategories,
  } = ctx;

  const selectCourse = (name) => {
    const normalized = String(name || "").trim();
    if (!normalized) return;
    setUploadForm((prev) => ({
      ...prev,
      categoryNames: normalized,
    }));
    setCourseInput(normalized);
    setShowCourseDropdown(false);
  };

  const addTag = (name) => {
    const normalized = String(name || "").trim();
    if (!normalized) return;
    if (selectedTags.includes(normalized)) {
      setTagInput("");
      return;
    }
    setSelectedTags((prev) => [...prev, normalized]);
    setTagInput("");
  };

  const removeTag = (name) => {
    setSelectedTags((prev) => prev.filter((item) => item !== name));
  };

  const onCourseInputKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (courseInput.trim()) selectCourse(courseInput);
    }
  };

  const onTagInputKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (tagInput.trim()) addTag(tagInput);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (isUploadSubmitting) return;

    setIsUploadSubmitting(true);
    await call(async () => {
      setStatus("Submitting document... Please wait while we process your file.");
      setError("");

      const names = parseCategoryNames(uploadForm.categoryNames || courseInput);
      if (!names.length) throw new Error("Please input at least one course name.");
      const fd = new FormData();
      fd.append("title", uploadForm.title);
      fd.append("description", uploadForm.description);
      fd.append("categoryNames", names.join(","));
      if (uploadForm.file) fd.append("documentFile", uploadForm.file);

      await apiRequest("/documents", { method: "POST", token, body: fd, isForm: true });
      setStatus("Upload successful. Document is pending review.");
      setError("");
      setUploadForm({ title: "", description: "", categoryNames: "", file: null });
      setSelectedTags([]);
      setCourseInput("");
      setShowCourseDropdown(false);
      setTagInput("");
      await loadMyDocuments();
      if (isModerator) {
        await loadPendingDocuments();
      }
      await loadCategories();

      if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      }
      if (typeof document !== "undefined") {
        const contentPane = document.querySelector(".content");
        if (contentPane && typeof contentPane.scrollTo === "function") {
          contentPane.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        }
      }
    });
    setIsUploadSubmitting(false);
  };

  return {
    selectCourse,
    addTag,
    removeTag,
    onCourseInputKeyDown,
    onTagInputKeyDown,
    handleUpload,
  };
}
