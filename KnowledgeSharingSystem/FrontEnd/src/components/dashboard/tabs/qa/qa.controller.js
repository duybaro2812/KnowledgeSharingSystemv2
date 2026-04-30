export function createQaController(input) {
  return {
    onChangeFilter: (value) => input.setQaFilter(value),
    onRefresh: () => input.loadQaSessions(),
    onOpenSession: (session) => input.openQaSession(session),
    onSendMessage: (sessionId, message) => input.sendQaMessage(sessionId, message),
    onCloseSession: (sessionId) => input.closeQaSession(sessionId),
    onRateSession: (sessionId, stars, feedback) => input.rateQaSession(sessionId, stars, feedback),
    onAddMessageExperience: async (message) => {
      if (!input.onAddHiddenKnowledgeFromQaMessage) return;
      await input.onAddHiddenKnowledgeFromQaMessage(message);
    },
  };
}
