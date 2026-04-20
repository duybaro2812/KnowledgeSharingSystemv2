export function createUsersController(input) {
  return {
    onRefreshOverview: async () => {
      const tasks = [];
      if (input.loadModerationOverview) tasks.push(input.loadModerationOverview());
      if (input.loadAdminUsers) tasks.push(input.loadAdminUsers());
      if (input.loadAllUploadedDocuments) tasks.push(input.loadAllUploadedDocuments());
      if (!tasks.length) return;
      await Promise.allSettled(tasks);
    },
    onPromote: (userId) => input.changeUserRole(userId, "moderator"),
    onDemote: (userId) => input.changeUserRole(userId, "user"),
    onLock: (userId) => input.setUserActiveStatus(userId, false),
    onUnlock: (userId) => input.setUserActiveStatus(userId, true),
    onDelete: (userId) => input.deleteUserAccount(userId),
  };
}
