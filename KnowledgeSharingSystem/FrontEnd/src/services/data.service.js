import { apiRequest } from "../api";

export function createDataFeature(ctx) {
  const {
    token,
    isModerator,
    docFilter,
    setCategories,
    setDocs,
    setHomeDocs,
    setMyDocs,
    setPendingDocs,
    setNotifications,
  } = ctx;

  const loadCategories = async (keyword = "") => {
    const payload = await apiRequest("/categories", { query: { keyword } });
    setCategories(payload.data || []);
  };

  const loadDocuments = async (nextFilter = docFilter) => {
    const payload = await apiRequest("/documents", { query: nextFilter });
    setDocs(payload.data || []);
  };

  const loadHomeDocuments = async () => {
    const payload = await apiRequest("/documents");
    if (setHomeDocs) {
      setHomeDocs(payload.data || []);
    }
  };

  const loadMyDocuments = async () => {
    if (!token) return;
    const payload = await apiRequest("/documents/my-uploaded", { token });
    setMyDocs(payload.data || []);
  };

  const loadPendingDocuments = async (authToken = token) => {
    if (!authToken) return;
    const payload = await apiRequest("/documents/pending", { token: authToken });
    setPendingDocs(payload.data || []);
  };

  const loadNotifications = async () => {
    if (!token) {
      setNotifications([]);
      return;
    }
    const payload = await apiRequest("/notifications/my", { token });
    setNotifications(payload.data || []);
  };

  return {
    loadCategories,
    loadDocuments,
    loadHomeDocuments,
    loadMyDocuments,
    loadPendingDocuments,
    loadNotifications,
  };
}
