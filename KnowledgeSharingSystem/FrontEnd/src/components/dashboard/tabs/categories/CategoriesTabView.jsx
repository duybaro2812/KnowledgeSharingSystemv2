function CategoriesTabView(props) {
  const { model, controller } = props;

  return (
    <section className="panel">
      <h2>Category manager</h2>
      <form className="filters" onSubmit={controller.onSubmitCreateCategory}>
        <input
          placeholder="New category name"
          value={model.newCategoryForm.name}
          onChange={(e) => controller.onChangeCategoryName(e.target.value)}
        />
        <input
          placeholder="Description"
          value={model.newCategoryForm.description}
          onChange={(e) => controller.onChangeCategoryDescription(e.target.value)}
        />
        <button>Create category</button>
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
            <p>ID #{c.categoryId}</p>
          </button>
        ))}
      </div>
      {model.selectedCategory && (
        <div className="category-docs">
          <h3>Documents in "{model.selectedCategory.name}"</h3>
          {model.categoryDocs.length === 0 ? (
            <p className="hint">No approved documents in this category yet.</p>
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
