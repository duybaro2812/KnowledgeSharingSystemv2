export function createQaModel(input) {
  const userId = Number(input.user?.userId || 0);

  return {
    user: input.user || null,
    currentUserId: userId,
    sessions: Array.isArray(input.qaSessions) ? input.qaSessions : [],
    activeSession: input.activeQaSession || null,
    messages: Array.isArray(input.qaMessages) ? input.qaMessages : [],
    filter: input.qaFilter || "all",
    unreadCount: Number(input.qaUnreadCount || 0),
    unreadSessionMap: input.qaUnreadSessionMap || {},
    ratedSessionMap: input.qaRatedSessionMap || {},
  };
}
