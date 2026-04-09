export function createUploadModel(input) {
  return {
    uploadForm: input.uploadForm,
    selectedTags: input.selectedTags || [],
    topicPickerRef: input.topicPickerRef,
    courseInput: input.courseInput,
    showCourseDropdown: input.showCourseDropdown,
    tagInput: input.tagInput,
    visibleTopicSuggestions: input.visibleTopicSuggestions || [],
    isUploadSubmitting: Boolean(input.isUploadSubmitting),
  };
}
