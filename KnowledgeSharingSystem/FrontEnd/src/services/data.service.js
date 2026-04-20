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
    setAdminDocuments,
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
    const list = payload.data || [];
    if (setDocs) {
      setDocs(list);
    }
    if (setHomeDocs) {
      setHomeDocs(list);
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

  const loadAllUploadedDocuments = async (authToken = token) => {
    if (!authToken) {
      if (setAdminDocuments) setAdminDocuments([]);
      return;
    }
    const payload = await apiRequest("/documents/all-uploaded", { token: authToken });
    if (setAdminDocuments) {
      setAdminDocuments(Array.isArray(payload.data) ? payload.data : []);
    }
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
    loadAllUploadedDocuments,
    loadNotifications,
  };
}
