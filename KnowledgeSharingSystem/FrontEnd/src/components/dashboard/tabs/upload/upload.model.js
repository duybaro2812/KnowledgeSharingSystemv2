export function createUploadModel(input) {
  return {
    uploadForm: input.uploadForm,
    topicPickerRef: input.topicPickerRef,
    topicInput: input.topicInput,
    showTopicDropdown: input.showTopicDropdown,
    visibleTopicSuggestions: input.visibleTopicSuggestions || [],
  };
}
