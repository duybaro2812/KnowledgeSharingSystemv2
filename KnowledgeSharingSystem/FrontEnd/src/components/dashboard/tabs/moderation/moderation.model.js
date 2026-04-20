export function createModerationModel(input) {
  const parseMetadata = (rawMetadata) => {
    if (!rawMetadata) return null;
    if (typeof rawMetadata === "object") return rawMetadata;
    if (typeof rawMetadata !== "string") return null;
    try {
      return JSON.parse(rawMetadata);
    } catch {
      return null;
    }
  };

  const pendingPointEvents = Array.isArray(input.pendingPointEvents)
    ? input.pendingPointEvents
    : [];
  const pendingComments = Array.isArray(input.pendingComments) ? input.pendingComments : [];
  const commentPointEventsByCommentId = pendingPointEvents.reduce((acc, event) => {
    const commentId = Number(event?.commentId || 0);
    if (!Number.isInteger(commentId) || commentId <= 0) return acc;
    if (!acc[commentId]) acc[commentId] = [];
    acc[commentId].push({
      ...event,
      metadataJson: parseMetadata(event?.metadata),
    });
    return acc;
  }, {});

  const qaRatingEvents = pendingPointEvents
    .filter((event) => String(event?.eventType || "").toLowerCase() === "qa_session_rated")
    .map((event) => ({
      ...event,
      metadataJson: parseMetadata(event?.metadata),
    }));

  const moderationStats = input.moderationStats || null;
  const moderationTimeline = Array.isArray(input.moderationTimeline)
    ? input.moderationTimeline
    : [];
  const queueSummary = {
    pendingDocs: Number(
      moderationStats?.pendingDocuments ??
        (Array.isArray(input.pendingDocs) ? input.pendingDocs.length : 0),
    ),
    pendingComments: Number(
      moderationStats?.pendingComments ??
        (Array.isArray(input.pendingComments) ? input.pendingComments.length : 0),
    ),
    pendingReports: Number(
      moderationStats?.pendingReports ??
        (Array.isArray(input.reportedDocs) ? input.reportedDocs.length : 0),
    ),
    pendingPointEvents: Number(
      moderationStats?.pendingPointEvents ??
        (Array.isArray(input.pendingPointEvents) ? input.pendingPointEvents.length : 0),
    ),
  };

  return {
    isModerator: !!input.isModerator,
    isBusy: Boolean(input.isBusy),
    pendingDocs: Array.isArray(input.pendingDocs) ? input.pendingDocs : [],
    reportedDocs: Array.isArray(input.reportedDocs) ? input.reportedDocs : [],
    pendingPointEvents,
    pendingComments,
    commentPointEventsByCommentId,
    qaRatingEvents,
    moderationFocus: input.moderationFocus || {
      documentId: null,
      commentId: null,
      qaSessionId: null,
      pointEventId: null,
    },
    duplicateByDocId: input.duplicateByDocId || {},
    moderationStats,
    moderationTimeline,
    queueSummary,
  };
}
