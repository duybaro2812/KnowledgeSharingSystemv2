import { apiRequest } from "../api";

export function createNotificationFeature(ctx) {
  const { token, call, loadNotifications } = ctx;

  const markRead = async (id) => {
    await call(async () => {
      await apiRequest(`/notifications/${id}/read`, { method: "PATCH", token });
      await loadNotifications();
    }, { actionKey: `notification:mark-read:${id}` });
  };

  const markAllRead = async () => {
    await call(async () => {
      await apiRequest("/notifications/read-all", { method: "PATCH", token });
      await loadNotifications();
    }, { actionKey: "notification:mark-all-read" });
  };

  return { markRead, markAllRead };
}
