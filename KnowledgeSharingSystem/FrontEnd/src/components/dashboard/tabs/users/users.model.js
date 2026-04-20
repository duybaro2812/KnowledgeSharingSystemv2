export function createUsersModel(input) {
  const users = Array.isArray(input.adminUsers) ? input.adminUsers : [];
  const moderationStats = input.moderationStats || null;
  const roleBreakdown = users.reduce(
    (acc, user) => {
      const role = String(user?.role || "").toLowerCase();
      if (role === "admin") acc.admin += 1;
      else if (role === "moderator") acc.moderator += 1;
      else acc.user += 1;
      return acc;
    },
    { admin: 0, moderator: 0, user: 0 },
  );
  const lockedUsers = users.filter((user) => !user?.isActive).length;
  const activeUsers = users.filter((user) => !!user?.isActive).length;
  return {
    isBusy: Boolean(input.isBusy),
    users,
    currentUserId: Number(input.user?.userId || 0),
    moderationStats,
    adminDashboard: {
      totalUsers: Number(moderationStats?.totalUsers ?? users.length),
      activeUsers: Number(moderationStats?.activeUsers ?? activeUsers),
      lockedUsers: Number(moderationStats?.lockedUsers ?? lockedUsers),
      totalDocuments: Number(moderationStats?.totalDocuments ?? 0),
      approvedDocuments: Number(moderationStats?.approvedDocuments ?? 0),
      pendingDocuments: Number(moderationStats?.pendingDocuments ?? 0),
      rejectedDocuments: Number(moderationStats?.rejectedDocuments ?? 0),
      hiddenDocuments: Number(moderationStats?.lockedDocuments ?? 0),
      totalDownloads: Number(moderationStats?.totalDownloads ?? 0),
      roleBreakdown,
    },
  };
}
