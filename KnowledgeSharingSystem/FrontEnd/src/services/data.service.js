import { apiRequest } from "../api";

export function createDataFeature(ctx) {
  const {
    token,
    isModerator,
    docFilter,
    setCategories,
    setDocs,
    setMyDocs,
    setPendingDocs,
    setNotifications,
  } = ctx;

  const loadCategories = async (keyword = "") => {
    const payload = await apiRequest("/categories", { query: { keyword } });
    setCategories(payload.data || []);
  };

  const loadDocuments = async () => {
    const payload = await apiRequest("/documents", { query: docFilter });
    setDocs(payload.data || []);
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
    if (!token || isModerator) {
      setNotifications([]);
      return;
    }
    const payload = await apiRequest("/notifications/my", { token });
    setNotifications(payload.data || []);
  };

  return {
    loadCategories,
    loadDocuments,
    loadMyDocuments,
    loadPendingDocuments,
    loadNotifications,
  };
}
