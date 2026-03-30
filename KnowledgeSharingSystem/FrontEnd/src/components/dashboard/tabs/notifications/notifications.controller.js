export function createNotificationsController(input) {
  return {
    onMarkRead: (notificationId) => input.markRead(notificationId),
  };
}
