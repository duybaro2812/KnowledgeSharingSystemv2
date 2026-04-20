export function createDocumentsModel(input) {
  const documents = Array.isArray(input.adminDocuments) ? input.adminDocuments : [];
  const moderationStats = input.moderationStats || null;

  const byStatus = documents.reduce(
    (acc, doc) => {
      const status = String(doc?.status || "").toLowerCase();
      if (status === "approved") acc.approved += 1;
      else if (status === "pending") acc.pending += 1;
      else if (status === "rejected") acc.rejected += 1;
      else if (status === "hidden") acc.hidden += 1;
      return acc;
    },
    { approved: 0, pending: 0, rejected: 0, hidden: 0 },
  );

  const sortedDocuments = [...documents].sort((a, b) => {
    const aTime = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
    const bTime = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
    return bTime - aTime;
  });

  return {
    isModerator: Boolean(input.isModerator),
    isBusy: Boolean(input.isBusy),
    documents: sortedDocuments,
    moderationStats,
    summary: {
      total: Number(moderationStats?.totalDocuments ?? sortedDocuments.length),
      approved: Number(moderationStats?.approvedDocuments ?? byStatus.approved),
      pending: Number(moderationStats?.pendingDocuments ?? byStatus.pending),
      rejected: Number(moderationStats?.rejectedDocuments ?? byStatus.rejected),
      hidden: Number(moderationStats?.lockedDocuments ?? byStatus.hidden),
      downloads: Number(moderationStats?.totalDownloads ?? 0),
    },
  };
}

