export function createNotificationsController(input) {
  const markAllRead = async () => {
    const source = Array.isArray(input.notifications) ? input.notifications : [];
    const unread = source.filter((item) => !item.isRead);
    if (unread.length === 0) return;
    await Promise.allSettled(unread.map((item) => input.markRead(item.notificationId)));
  };

  return {
    onMarkRead: (notificationId) => input.markRead(notificationId),
    onOpen: (notification) => input.openFromNotification && input.openFromNotification(notification),
    onMarkAllRead: markAllRead,
  };
}
