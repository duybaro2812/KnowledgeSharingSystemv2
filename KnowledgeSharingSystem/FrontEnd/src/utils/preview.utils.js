export const resolveFileUrl = (fileUrl) => {
  if (!fileUrl) return "";
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) return fileUrl;
  return `http://localhost:3000${fileUrl}`;
};

export const buildPreviewUrl = ({ fileUrl, mimeType, originalFileName }) => {
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
    const cloudinaryRawNoExt =
      resolved.includes("/res.cloudinary.com/") &&
      resolved.includes("/raw/upload/") &&
      !/\.(doc|docx|ppt|pptx|xls|xlsx|pdf)(\?|$)/i.test(resolved);

    let candidateUrl = resolved;
    if (cloudinaryRawNoExt) {
      const fallbackExt = String(originalFileName || "")
        .split(".")
        .pop()
        ?.toLowerCase();
      if (fallbackExt) candidateUrl = `${resolved}.${fallbackExt}`;
    }

    const candidates = [resolved];
    if (candidateUrl !== resolved) candidates.push(candidateUrl);

    const isLocalHostFile = candidates.every(
      (url) => url.includes("localhost") || url.includes("127.0.0.1"),
    );

    if (isLocalHostFile) {
      return {
        url: "",
        reason:
          'This Office file is stored on localhost, so web preview cannot load it. Use "Open in new tab", or re-upload to Cloudinary for in-app preview.',
        fallbackUrl: "",
      };
    }

    const viewerUrls = [];
    for (const candidate of candidates) {
      viewerUrls.push(
        `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(candidate)}`,
      );
      viewerUrls.push(
        `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(candidate)}`,
      );
    }

    const dedupedViewerUrls = [...new Set(viewerUrls)];
    return {
      url: dedupedViewerUrls[0] || "",
      fallbackUrls: dedupedViewerUrls.slice(1),
      reason: "",
    };
  }

  return { url: resolved, reason: "", fallbackUrls: [] };
};

export const createOpenPreview = (setPreviewDoc) => (doc) => {
  const preview = buildPreviewUrl(doc);
  setPreviewDoc({
    title: doc.title,
    originalFileName: doc.originalFileName,
    fileUrl: resolveFileUrl(doc.fileUrl),
    previewUrl: preview.url,
    fallbackPreviewUrls: preview.fallbackUrls || [],
    previewReason: preview.reason,
    mimeType: doc.mimeType,
  });
};
