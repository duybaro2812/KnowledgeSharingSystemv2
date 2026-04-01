import { apiRequest } from "../api";

export function createPointEventFeature(ctx) {
  const { token, call, setStatus, setPendingPointEvents } = ctx;

  const loadPendingPointEvents = async () => {
    if (!token) {
      setPendingPointEvents([]);
      return;
    }
    const payload = await apiRequest("/points/events/pending", { token });
    setPendingPointEvents(payload.data || []);
  };

  const reviewPointEvent = async (eventId, body) => {
    await call(async () => {
      await apiRequest(`/points/events/${eventId}/review`, {
        method: "PATCH",
        token,
        body,
      });
      setStatus(`Point event #${eventId} reviewed successfully.`);
      await loadPendingPointEvents();
    });
  };

  return {
    loadPendingPointEvents,
    reviewPointEvent,
  };
}
