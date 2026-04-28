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
      try {
        await input.onAddHiddenKnowledgeFromQaMessage(message);
      } catch (error) {
        window.alert(error?.message || "Unable to add this Q&A message to hidden knowledge.");
      }
    },
  };
}
