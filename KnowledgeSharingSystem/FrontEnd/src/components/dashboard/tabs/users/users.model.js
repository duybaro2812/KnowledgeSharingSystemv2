export function createUsersModel(input) {
  const users = Array.isArray(input.adminUsers) ? input.adminUsers : [];

  return {
    users,
    currentUserId: Number(input.user?.userId || 0),
  };
}

