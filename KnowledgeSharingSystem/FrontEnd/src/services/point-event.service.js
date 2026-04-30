import { apiRequest } from "../api";

export function createPointEventFeature(ctx) {
  const { token, call, setStatus, setPendingPointEvents, setReviewedQaRatingEvents } = ctx;

  const loadPendingPointEvents = async () => {
    if (!token) {
      setPendingPointEvents([]);
      if (setReviewedQaRatingEvents) setReviewedQaRatingEvents([]);
      return;
    }
    const payload = await apiRequest("/points/events/pending", { token });
    setPendingPointEvents(payload.data || []);
  };

  const loadReviewedQaRatingEvents = async () => {
    if (!token || !setReviewedQaRatingEvents) {
      if (setReviewedQaRatingEvents) setReviewedQaRatingEvents([]);
      return;
    }
    const payload = await apiRequest("/points/events/qa-ratings/reviewed", {
      token,
      query: { limit: 50 },
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
