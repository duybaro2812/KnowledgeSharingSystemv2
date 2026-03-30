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
    categories,
    uploadForm,
    topicInput,
    selectedTopics,
    setCategories,
    setUploadForm,
    setSelectedTopics,
    setTopicInput,
    setShowTopicDropdown,
    setStatus,
    call,
    loadMyDocuments,
    loadPendingDocuments,
    loadCategories,
  } = ctx;

  const syncSelectedTopicsToForm = (nextTopics) => {
    setSelectedTopics(nextTopics);
    setUploadForm((prev) => ({
      ...prev,
      categoryNames: nextTopics.join(", "),
    }));
  };

  const addTopic = (name) => {
    const normalized = String(name || "").trim();
    if (!normalized) return;
    // Single-course behavior: selecting or creating one topic fills the textbox directly.
    syncSelectedTopicsToForm([normalized]);
    setTopicInput(normalized);
    setShowTopicDropdown(false);
  };

  const removeTopic = (name) => {
    const next = selectedTopics.filter((item) => item !== name);
    syncSelectedTopicsToForm(next);
    if (!next.length) setTopicInput("");
  };

  const onTopicInputKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (topicInput.trim()) addTopic(topicInput);
    }
  };

  const ensureCategoryIdsByNames = async (names) => {
    let current = [...categories];
    const ids = [];
    for (const name of names) {
      let found = current.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (!found) {
        try {
          const created = await apiRequest("/categories", {
            method: "POST",
            token,
            body: { name, description: "" },
          });
          found = created.data;
          current = [...current, found];
        } catch (e) {
          if (!String(e.message).toLowerCase().includes("already exists")) throw e;
          const refreshed = await apiRequest("/categories", { query: { keyword: name } });
          current = refreshed.data || current;
          found = current.find((c) => c.name.toLowerCase() === name.toLowerCase());
          if (!found) throw new Error(`Cannot resolve category: ${name}`);
        }
      }
      ids.push(found.categoryId);
    }
    setCategories(current);
    return ids;
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    await call(async () => {
      const names = parseCategoryNames(uploadForm.categoryNames || topicInput);
      if (!names.length) throw new Error("Please input at least one category name.");
      const categoryIds = await ensureCategoryIdsByNames(names);
      const fd = new FormData();
      fd.append("title", uploadForm.title);
      fd.append("description", uploadForm.description);
      fd.append("categoryIds", categoryIds.join(","));
      if (uploadForm.file) fd.append("documentFile", uploadForm.file);

      await apiRequest("/documents", { method: "POST", token, body: fd, isForm: true });
      setStatus("Upload successful. Document is pending review.");
      setUploadForm({ title: "", description: "", categoryNames: "", file: null });
      setSelectedTopics([]);
      setTopicInput("");
      setShowTopicDropdown(false);
      await loadMyDocuments();
      await loadPendingDocuments();
      await loadCategories();
    });
  };

  return {
    syncSelectedTopicsToForm,
    addTopic,
    removeTopic,
    onTopicInputKeyDown,
    handleUpload,
  };
}
