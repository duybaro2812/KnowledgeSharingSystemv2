import { apiRequest } from "../api";

export function createReportFeature(ctx) {
  const {
    token,
    user,
    call,
    setStatus,
    setReportedDocs,
    loadDocuments,
    loadMyDocuments,
    loadPendingDocuments,
  } = ctx;

  const submitDocumentReport = async (documentId, reason) => {
    const normalizedReason = typeof reason === "string" ? reason.trim() : "";

    if (!normalizedReason) {
      throw new Error("Report reason is required.");
    }

    await call(async () => {
      const payload = await apiRequest(`/documents/${documentId}/report`, {
        method: "POST",
        token,
        body: { reason: normalizedReason },
      });
      setStatus(payload.message || `Reported document #${documentId} successfully.`);
      await loadDocuments();
      await loadMyDocuments();
      if (user?.role === "admin" || user?.role === "moderator") {
        await loadPendingDocuments();
      }
    });
  };

  const loadReportedDocuments = async (authToken = token) => {
    if (!authToken) return;
    const payload = await apiRequest("/documents/reports/pending", {
      token: authToken,
    });
    setReportedDocs(payload.data || []);
  };

  const resolveReportedDocument = async (documentId, action) => {
    if (action !== "unlock" && action !== "delete") return;

    const note =
      prompt(
        action === "delete"
          ? "Nhập ghi chú vi phạm (xóa tài liệu):"
          : "Nhập ghi chú mở lại tài liệu:"
      ) || "";

    let penaltyPoints = 0;

    if (action === "delete") {
      const rawPoints = prompt(
        "Nhập số điểm muốn trừ (để trống hoặc 0 nếu không trừ):",
        "0"
      );

      if (rawPoints === null) return;

      penaltyPoints = Number(rawPoints);
      if (!Number.isInteger(penaltyPoints) || penaltyPoints < 0) {
        alert("Số điểm trừ phải là số nguyên không âm.");
        return;
      }
    }

    await call(async () => {
      const payload = await apiRequest(`/documents/${documentId}/report-resolution`, {
        method: "PATCH",
        token,
        body:
          action === "delete"
            ? { action, note: note.trim(), penaltyPoints }
            : { action, note: note.trim() },
      });

      setStatus(payload.message || `${action} reported document #${documentId} successfully.`);

      await loadReportedDocuments(token);
      await loadDocuments();
      await loadPendingDocuments(token);
      await loadMyDocuments();
    });
  };

  return {
    submitDocumentReport,
    loadReportedDocuments,
    resolveReportedDocument,
  };
}
