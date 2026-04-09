function UploadArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 15.5V6.8M8.6 10.3 12 6.8l3.4 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 16.4v1.8A1.8 1.8 0 0 0 7.8 20h8.4a1.8 1.8 0 0 0 1.8-1.8v-1.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12.8 3.8 7.2 12h4l-1 8.2 6.6-9.4h-4.2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="m6.8 12.2 3.1 3.1 7.3-7.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UploadTabView(props) {
  const { model, controller } = props;
  const selectedFileName = model.uploadForm.file?.name || "";

  return (
    <section className="upload-page">
      <div className="upload-page-head">
        <div>
          <h2>Upload Document</h2>
          <p>Share your study materials and earn 10 points after submission review.</p>
        </div>
        <div className="upload-points-pill">
          <LightningIcon />
          <span>Earn +10 points</span>
        </div>
      </div>

      <form
        className={`upload-page-form ${model.isUploadSubmitting ? "is-submitting" : ""}`}
        onSubmit={controller.onSubmit}
        aria-busy={model.isUploadSubmitting}
      >
        <label className="upload-dropzone">
          <input
            className="upload-file-input"
            type="file"
            disabled={model.isUploadSubmitting}
            onChange={(e) => controller.onPickFile(e.target.files?.[0])}
          />
          <div className="upload-dropzone-icon">
            <UploadArrowIcon />
          </div>
          <strong>
            {selectedFileName ? selectedFileName : "Drop your file here or click to browse"}
          </strong>
          <span>Supports PDF, DOCX, PPTX, XLSX, TXT • Max 15MB</span>
        </label>

        <section className="upload-form-card">
          <div className="upload-form-grid">
            <div className="upload-form-group upload-form-group-full">
              <label htmlFor="upload-title">Document Title *</label>
              <input
                id="upload-title"
                placeholder="e.g. Advanced Algorithms & Complexity Theory - Full Notes"
                value={model.uploadForm.title}
                disabled={model.isUploadSubmitting}
                onChange={(e) => controller.onChangeTitle(e.target.value)}
              />
            </div>

            <div className="upload-form-group upload-form-group-full">
              <label htmlFor="upload-description">Description</label>
              <textarea
                id="upload-description"
                placeholder="Describe what's covered in this document. Be specific to help others find it."
                value={model.uploadForm.description}
                disabled={model.isUploadSubmitting}
                onChange={(e) => controller.onChangeDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="upload-form-group upload-form-group-full">
              <label htmlFor="upload-category">Course *</label>
              <div className="topic-picker upload-topic-picker" ref={model.topicPickerRef}>
                <div className="topic-input-row">
                  <input
                    id="upload-category"
                    placeholder="Select course or type a new one"
                    value={model.courseInput}
                    disabled={model.isUploadSubmitting}
                    onFocus={controller.onCourseFocus}
                    onChange={(e) => controller.onCourseChange(e.target.value)}
                    onKeyDown={controller.onCourseKeyDown}
                  />
                </div>

                {model.showCourseDropdown && (
                  <div className="topic-dropdown">
                    {model.visibleTopicSuggestions.length > 0 ? (
                      model.visibleTopicSuggestions.map((item) => (
                        <button
                          type="button"
                          className="topic-option"
                          key={item.categoryId}
                          onClick={() => controller.onAddCourse(item.name)}
                        >
                          <span className="topic-folder-icon" aria-hidden="true" />
                          <span className="topic-name">{item.name}</span>
                        </button>
                      ))
                    ) : (
                      <button
                        type="button"
                        className="topic-option create"
                        onClick={controller.onAddTypedCourse}
                      >
                        Create new course: "{model.courseInput.trim()}"
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="upload-form-group upload-form-group-full">
              <label htmlFor="upload-tags">Tags</label>
              <div className="upload-tags-shell">
                {model.selectedTags.length > 0 && (
                  <div className="topic-chip-list">
                    {model.selectedTags.map((topic) => (
                      <span key={topic} className="topic-chip">
                        {topic}
                        <button type="button" onClick={() => controller.onRemoveTag(topic)}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="upload-tag-entry">
                  <input
                    id="upload-tags"
                    placeholder="Add a tag and press Enter"
                    value={model.tagInput}
                    disabled={model.isUploadSubmitting}
                    onChange={(e) => controller.onTagChange(e.target.value)}
                    onKeyDown={controller.onTagKeyDown}
                  />
                  <button
                    type="button"
                    className="upload-tag-add-btn"
                    disabled={model.isUploadSubmitting}
                    onClick={controller.onAddTypedTag}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="upload-guidelines-card">
          <h3>Community Guidelines</h3>
          <ul>
            <li>
              <CheckIcon />
              <span>Only upload your own work or materials you have permission to share.</span>
            </li>
            <li>
              <CheckIcon />
              <span>Do not upload copyrighted textbooks or exam papers.</span>
            </li>
            <li>
              <CheckIcon />
              <span>Documents should be relevant to university-level academic study.</span>
            </li>
            <li>
              <CheckIcon />
              <span>Every uploaded document is reviewed by moderators before publishing.</span>
            </li>
          </ul>
        </section>

        <button
          className="primary-btn upload-submit-hero-btn"
          type="submit"
          disabled={model.isUploadSubmitting}
        >
          {model.isUploadSubmitting ? "Submitting..." : "Submit for Review"}
        </button>
      </form>
    </section>
  );
}

export default UploadTabView;
