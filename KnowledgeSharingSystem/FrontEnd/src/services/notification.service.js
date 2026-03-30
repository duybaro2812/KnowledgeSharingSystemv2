import { apiRequest } from "../api";

export function createNotificationFeature(ctx) {
  const { token, call, loadNotifications } = ctx;

  const markRead = async (id) => {
    await call(async () => {
      await apiRequest(`/notifications/${id}/read`, { method: "PATCH", token });
      await loadNotifications();
    });
  };

  return { markRead };
}
