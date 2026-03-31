export function createUsersController(input) {
  return {
    onPromote: (userId) => input.changeUserRole(userId, "moderator"),
    onDemote: (userId) => input.changeUserRole(userId, "user"),
    onLock: (userId) => input.setUserActiveStatus(userId, false),
    onUnlock: (userId) => input.setUserActiveStatus(userId, true),
    onDelete: (userId) => input.deleteUserAccount(userId),
  };
}
