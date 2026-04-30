import { API_ORIGIN } from "../api";

export const resolveFileUrl = (fileUrl) => {
  if (!fileUrl) return "";
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) return fileUrl;
  return `${API_ORIGIN}${fileUrl}`;
};

export const buildPreviewUrl = ({ fileUrl, mimeType, originalFileName }) => {
  const preparedViewerUrl = resolveFileUrl(
    fileUrl?.viewerUrl || fileUrl?.url || fileUrl?.viewer?.viewerUrl || fileUrl?.viewer?.url,
  );

  if (preparedViewerUrl) {
    return { url: preparedViewerUrl, reason: "", fallbackUrls: [] };
  }

  const resolved = resolveFileUrl(fileUrl);
  if (!resolved) {
    return { url: "", reason: "No file URL found.", fallbackUrls: [] };
  }

  const lowerMime = String(mimeType || "").toLowerCase();
  const isPdf = lowerMime.includes("pdf") || resolved.toLowerCase().endsWith(".pdf");
  if (isPdf) return { url: resolved, reason: "", fallbackUrls: [] };

  const isOfficeDoc =
    lowerMime.includes("word") ||
    lowerMime.includes("officedocument") ||
    resolved.toLowerCase().endsWith(".doc") ||
    resolved.toLowerCase().endsWith(".docx") ||
    resolved.toLowerCase().endsWith(".ppt") ||
    resolved.toLowerCase().endsWith(".pptx") ||
    resolved.toLowerCase().endsWith(".xls") ||
    resolved.toLowerCase().endsWith(".xlsx");

  if (isOfficeDoc) {
    return {
      url: "",
      fallbackUrls: [],
      reason:
        "This Office file does not have a prepared in-app viewer yet. The backend still needs LibreOffice headless to convert it to PDF.",
    };
  }

  return { url: resolved, reason: "", fallbackUrls: [] };
};

const MIME_EXTENSION_BY_TYPE = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "text/plain": ".txt",
};

export const buildDisplayFileName = ({ title, originalFileName, mimeType }) => {
  const original = String(originalFileName || "").trim();
  const explicitExtensionMatch = original.match(/\.[A-Za-z0-9]{1,8}$/);
  const extension =
    explicitExtensionMatch?.[0]?.toLowerCase() ||
    MIME_EXTENSION_BY_TYPE[String(mimeType || "").toLowerCase()] ||
    "";
  const safeBaseName =
    String(title || original || "document")
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "document";

  if (extension && safeBaseName.toLowerCase().endsWith(extension)) {
    return safeBaseName;
  }

  return `${safeBaseName}${extension}`;
};

export const createOpenPreview = (setPreviewDoc) => (doc) => {
  const preview = buildPreviewUrl(doc?.viewer?.viewerUrl ? { ...doc, fileUrl: doc.viewer.viewerUrl } : doc);
  const isLockedForPoints = !!doc.isLockedForPoints;
  const previewUrl = doc.securePreviewUrl || (isLockedForPoints && !doc?.viewer?.viewerUrl ? "" : preview.url);
  const displayFileName =
    doc.downloadFileName ||
    doc.suggestedFileName ||
    buildDisplayFileName({
      title: doc.title,
      originalFileName: doc.originalFileName,
      mimeType: doc.mimeType,
    });
  setPreviewDoc({
    documentId: doc.documentId,
    title: doc.title,
    ownerName: doc.ownerName || doc.authorName || doc.uploadedByName || "NeuShare member",
    ownerUserId: doc.ownerUserId || doc.ownerId || doc.uploadedByUserId || doc.userId || null,
    originalFileName: doc.originalFileName,
    displayFileName,
    downloadFileName: displayFileName,
    fileUrl: resolveFileUrl(doc.fileUrl),
    previewUrl,
    fallbackPreviewUrls: preview.fallbackUrls || [],
    previewReason: doc.previewReason || preview.reason,
    mimeType: doc.mimeType,
    isLockedForPoints,
    requiredPoints: Number(doc.requiredPoints || 0),
    accessState: doc.accessState || "",
    canPreview: Boolean(doc.canPreview),
    canFullView: Boolean(doc.canFullView),
    canComment: Boolean(doc.canComment),
    canDiscuss: Boolean(doc.canDiscuss),
    canAskQuestion: Boolean(doc.canAskQuestion),
    points: Number(doc.points || 0),
    tier: doc.tier || "",
    accessReason: doc.accessReason || "",
    dailyViewLimit: Number.isFinite(Number(doc.dailyViewLimit)) ? Number(doc.dailyViewLimit) : null,
    todayFullViewCount: Number(doc.todayFullViewCount || 0),
    viewsRemainingToday: Number.isFinite(Number(doc.viewsRemainingToday))
      ? Number(doc.viewsRemainingToday)
      : null,
    previewPageLimit: Number.isFinite(Number(doc.previewPageLimit))
      ? Number(doc.previewPageLimit)
      : null,
    totalPages: Number.isFinite(Number(doc.totalPages)) ? Number(doc.totalPages) : null,
    lockedOverlay: doc.lockedOverlay || null,
    canDownload: Boolean(doc.canDownload),
    downloadCost: Number(doc.downloadCost || 0),
    downloadConfirmation: doc.downloadConfirmation || null,
    viewerStatus: doc.viewerStatus || doc.viewer?.status || "",
    viewerKind: doc.viewerKind || doc.viewer?.viewerKind || null,
    securePreviewUrl: doc.securePreviewUrl || "",
    isLoading: Boolean(doc.isLoading),
    currentUserId: doc.currentUserId || null,
    currentUserName: doc.currentUserName || "",
    currentUserRole: doc.currentUserRole || "",
    isOwner: Boolean(doc.isOwner),
  });
};
