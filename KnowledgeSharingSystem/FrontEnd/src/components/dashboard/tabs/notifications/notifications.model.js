export function createNotificationsModel(input) {
  return {
    notifications: Array.isArray(input.notifications) ? input.notifications : [],
  };
}
