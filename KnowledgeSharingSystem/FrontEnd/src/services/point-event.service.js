import { apiRequest } from "../api";

export function createPointEventFeature(ctx) {
  const { token, call, setStatus, setPendingPointEvents, setReviewedQaRatingEvents } = ctx;

  const collectComments = (items, acc = []) => {
    if (!Array.isArray(items)) return acc;
    items.forEach((item) => {
      if (item) acc.push(item);
      collectComments(item?.replies, acc);
    });
    return acc;
  };

  const enrichCommentPointEvents = async (events) => {
    const list = Array.isArray(events) ? events : [];
    const missingCommentContent = list.filter(
      (event) => Number(event?.commentId || 0) > 0 && !event?.commentContent,
    );
    if (missingCommentContent.length === 0) return list;

    const documentIds = [
      ...new Set(
        missingCommentContent
          .map((event) => Number(event?.documentId || 0))
          .filter((documentId) => documentId > 0),
      ),
    ];
    if (documentIds.length === 0) return list;

    const commentContentById = {};
    await Promise.all(
      documentIds.map(async (documentId) => {
        try {
          const payload = await apiRequest(`/documents/${documentId}/comments`, { token });
          collectComments(payload.data || []).forEach((comment) => {
            const commentId = Number(comment?.commentId || 0);
            if (commentId > 0) {
              commentContentById[commentId] = {
                content: comment?.content || "",
                pointEventId: comment?.pointEventId,
                pointEventStatus: comment?.pointEventStatus,
                pointEventPoints: comment?.pointEventPoints,
                pointEventReviewedAt: comment?.pointEventReviewedAt,
              };
            }
          });
        } catch {
          // Keep the original point event if the document comments cannot be loaded.
        }
      }),
    );

    return list.map((event) => {
      const commentId = Number(event?.commentId || 0);
      const commentInfo = commentContentById[commentId];
      if (!commentId || !commentInfo) return event;
      return {
        ...event,
        commentContent: event?.commentContent || commentInfo.content,
        commentPointEventId: commentInfo.pointEventId,
        commentPointEventStatus: commentInfo.pointEventStatus,
        commentPointEventPoints: commentInfo.pointEventPoints,
        commentPointEventReviewedAt: commentInfo.pointEventReviewedAt,
      };
    });
  };

  const loadPendingPointEvents = async () => {
    if (!token) {
      setPendingPointEvents([]);
      if (setReviewedQaRatingEvents) setReviewedQaRatingEvents([]);
      return;
    }
    const payload = await apiRequest("/points/events/pending", { token });
    setPendingPointEvents(await enrichCommentPointEvents(payload.data || []));
  };

  const loadReviewedQaRatingEvents = async () => {
    if (!token || !setReviewedQaRatingEvents) {
      if (setReviewedQaRatingEvents) setReviewedQaRatingEvents([]);
      return;
    }
    const payload = await apiRequest("/points/events/qa-ratings/reviewed", {
      token,
      query: { limit: 1000 },
    });
    setReviewedQaRatingEvents(payload.data || []);
  };

  const reviewPointEvent = async (eventId, body) => {
    await call(async () => {
      await apiRequest(`/points/events/${eventId}/review`, {
        method: "PATCH",
        token,
        body,
      });
      setStatus(`Point event #${eventId} reviewed successfully.`);
      await Promise.all([loadPendingPointEvents(), loadReviewedQaRatingEvents()]);
    });
  };

  const deleteQaRatingEvent = async (eventId, body = {}) => {
    await call(async () => {
      await apiRequest(`/points/events/qa-ratings/${eventId}`, {
        method: "DELETE",
        token,
        body,
      });
      setStatus(`Q&A rating event #${eventId} deleted successfully.`);
      await Promise.all([loadPendingPointEvents(), loadReviewedQaRatingEvents()]);
    });
  };

  return {
    loadPendingPointEvents,
    loadReviewedQaRatingEvents,
    deleteQaRatingEvent,
    reviewPointEvent,
  };
}
