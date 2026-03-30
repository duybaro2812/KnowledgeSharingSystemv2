function UploadTabView(props) {
  const { model, controller } = props;

  return (
    <section className="panel">
      <h2>Upload new document</h2>
      <form className="upload-form-stack" onSubmit={controller.onSubmit}>
        <div className="upload-field">
          <input
            placeholder="Title"
            value={model.uploadForm.title}
            onChange={(e) => controller.onChangeTitle(e.target.value)}
          />
        </div>

        <div className="upload-field">
          <input
            placeholder="Description"
            value={model.uploadForm.description}
            onChange={(e) => controller.onChangeDescription(e.target.value)}
          />
        </div>

        <div className="upload-field">
          <div className="topic-picker" ref={model.topicPickerRef}>
            <div className="topic-input-row">
              <input
                placeholder="Search course/topic (Physics, Algebra...)"
                value={model.topicInput}
                onFocus={controller.onTopicFocus}
                onChange={(e) => controller.onTopicChange(e.target.value)}
                onKeyDown={controller.onTopicKeyDown}
              />
            </div>

            {model.showTopicDropdown && (
              <div className="topic-dropdown">
                {model.visibleTopicSuggestions.length > 0 ? (
                  model.visibleTopicSuggestions.map((item) => (
                    <button
                      type="button"
                      className="topic-option"
                      key={item.categoryId}
                      onClick={() => controller.onAddTopic(item.name)}
                    >
                      <span className="topic-folder-icon" aria-hidden="true" />
                      <span className="topic-name">{item.name}</span>
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    className="topic-option create"
                    onClick={controller.onAddTypedTopic}
                  >
                    Create new topic: "{model.topicInput.trim()}"
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="upload-field">
          <input type="file" onChange={(e) => controller.onPickFile(e.target.files?.[0])} />
        </div>

        <div className="upload-field">
          <button className="primary-btn upload-submit-btn" type="submit">
            Upload
          </button>
        </div>
      </form>

      <p className="hint">Type to search course/topic. Press Enter to create new course if not found.</p>
    </section>
  );
}

export default UploadTabView;
