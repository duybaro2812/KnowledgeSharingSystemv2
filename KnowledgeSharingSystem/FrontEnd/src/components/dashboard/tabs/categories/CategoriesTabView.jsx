function CategoriesTabView(props) {
  const { model, controller } = props;
  if (!model.isModerator) {
    return (
      <section className="panel">
        <h2>Courses</h2>
        <p className="hint">Only moderator/admin can manage courses.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Course manager</h2>
      <form className="filters" onSubmit={controller.onSubmitCreateCategory}>
        <input
          placeholder="New course name"
          value={model.newCategoryForm.name}
          onChange={(e) => controller.onChangeCategoryName(e.target.value)}
        />
        <input
          placeholder="Description"
          value={model.newCategoryForm.description}
          onChange={(e) => controller.onChangeCategoryDescription(e.target.value)}
        />
        <button>Create course</button>
      </form>
      <div className="cards-grid compact">
        {model.categories.map((c) => (
          <button
            key={c.categoryId}
            type="button"
            className={`cat-card cat-card-btn ${
              model.selectedCategory?.categoryId === c.categoryId ? "active" : ""
            }`}
            onClick={() => controller.onSelectCategory(c)}
            title={`Show documents in ${c.name}`}
          >
            <h3>{c.name}</h3>
            <p>Course ID #{c.categoryId}</p>
          </button>
        ))}
      </div>
      {model.selectedCategory && (
        <div className="category-docs">
          <h3>Documents in course "{model.selectedCategory.name}"</h3>
          {model.categoryDocs.length === 0 ? (
            <p className="hint">No approved documents in this course yet.</p>
          ) : (
            <ul className="list">
              {model.categoryDocs.map((d) => (
                <li key={d.documentId}>
                  <span>
                      #{d.documentId} - {d.title}
                  </span>
                  <span className="list-actions">
                    <button type="button" onClick={() => controller.onPreviewDoc(d)}>
                      Preview
                    </button>
                    <a href={controller.resolveUrl(d.fileUrl)} target="_blank" rel="noreferrer">
                      Open file
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export default CategoriesTabView;
