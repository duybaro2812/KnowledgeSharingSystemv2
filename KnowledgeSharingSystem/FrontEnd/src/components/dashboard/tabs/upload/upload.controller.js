export function createUploadController(input) {
  return {
    onSubmit: input.handleUpload,
    onChangeTitle: (value) =>
      input.setUploadForm((p) => ({ ...p, title: value })),
    onChangeDescription: (value) =>
      input.setUploadForm((p) => ({ ...p, description: value })),
    onTopicFocus: () => input.setShowTopicDropdown(true),
    onTopicChange: (value) => {
      input.setTopicInput(value);
      input.setUploadForm((p) => ({ ...p, categoryNames: value }));
      input.setShowTopicDropdown(true);
    },
    onTopicKeyDown: input.onTopicInputKeyDown,
    onAddTypedTopic: () => input.topicInput.trim() && input.addTopic(input.topicInput),
    onAddTopic: (name) => input.addTopic(name),
    onRemoveTopic: (name) => input.removeTopic(name),
    onPickFile: (file) =>
      input.setUploadForm((p) => ({
        ...p,
        file: file || null,
      })),
  };
}
