const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const toStatus = (value) => String(value || "").trim().toLowerCase();

export function createMyDocumentsModel(input) {
  const uploadedDocs = Array.isArray(input.myDocs) ? input.myDocs : [];
  const sortedUploadedDocs = [...uploadedDocs].sort((left, right) => {
    const leftTime = new Date(left?.updatedAt || left?.createdAt || 0).getTime();
    const rightTime = new Date(right?.updatedAt || right?.createdAt || 0).getTime();
    return rightTime - leftTime;
  });

  const recentOpenedIds = Array.isArray(input.recentlyOpenedDocIds)
    ? input.recentlyOpenedDocIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
    : [];

  const recentPool = [
    ...(Array.isArray(input.docs) ? input.docs : []),
    ...(Array.isArray(input.homeDocs) ? input.homeDocs : []),
    ...(Array.isArray(input.myDocs) ? input.myDocs : []),
    ...(Array.isArray(input.pendingDocs) ? input.pendingDocs : []),
    ...(Array.isArray(input.reportedDocs) ? input.reportedDocs : []),
    ...(Array.isArray(input.categoryDocs) ? input.categoryDocs : []),
  ];

  const docById = new Map();
  recentPool.forEach((doc) => {
    const docId = Number(doc?.documentId || 0);
    if (!Number.isInteger(docId) || docId <= 0) return;
    if (!docById.has(docId)) {
      docById.set(docId, doc);
    }
  });

  const recentOpenedDocs = recentOpenedIds
    .map((docId) => docById.get(docId))
    .filter(Boolean);

  const summary = sortedUploadedDocs.reduce(
    (acc, doc) => {
      const status = toStatus(doc?.status);
      acc.total += 1;
      if (status === "approved") acc.approved += 1;
      else if (status === "pending") acc.pending += 1;
      else if (status === "rejected") acc.rejected += 1;
      else if (status === "hidden") acc.hidden += 1;
      else if (status === "reported") acc.reported += 1;

      acc.totalDownloads += toNumber(doc?.downloadCount || doc?.downloads);
      acc.totalViews += toNumber(doc?.viewCount || doc?.views);
      acc.totalLikes += toNumber(doc?.likeCount || doc?.likes);
      return acc;
    },
    {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      hidden: 0,
      reported: 0,
      totalDownloads: 0,
      totalViews: 0,
      totalLikes: 0,
    },
  );

  return {
    isBusy: Boolean(input.isBusy),
    user: input.user || null,
    uploadedDocs: sortedUploadedDocs,
    recentOpenedDocs,
    summary,
  };
}
