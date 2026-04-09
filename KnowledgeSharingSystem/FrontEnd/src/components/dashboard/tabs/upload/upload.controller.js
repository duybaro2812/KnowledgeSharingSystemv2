export function createUploadController(input) {
  return {
    onSubmit: input.handleUpload,
    onChangeTitle: (value) =>
      input.setUploadForm((p) => ({ ...p, title: value })),
    onChangeDescription: (value) =>
      input.setUploadForm((p) => ({ ...p, description: value })),
    onCourseFocus: () => input.setShowCourseDropdown(true),
    onCourseChange: (value) => {
      input.setCourseInput(value);
      input.setUploadForm((p) => ({ ...p, categoryNames: value }));
      input.setShowCourseDropdown(true);
    },
    onCourseKeyDown: input.onCourseInputKeyDown,
    onAddTypedCourse: () => input.courseInput.trim() && input.selectCourse(input.courseInput),
    onAddCourse: (name) => input.selectCourse(name),
    onTagChange: (value) => input.setTagInput(value),
    onTagKeyDown: input.onTagInputKeyDown,
    onAddTypedTag: () => input.tagInput.trim() && input.addTag(input.tagInput),
    onRemoveTag: (name) => input.removeTag(name),
    onPickFile: (file) =>
      input.setUploadForm((p) => ({
        ...p,
        file: file || null,
      })),
  };
}
