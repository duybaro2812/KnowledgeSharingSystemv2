export function createPointsModel(input) {
  return {
    summary: input.pointSummary || null,
    transactions: Array.isArray(input.pointTransactions) ? input.pointTransactions : [],
    events: Array.isArray(input.myPointEvents) ? input.myPointEvents : [],
    policy: input.pointPolicy || null,
  };
}

