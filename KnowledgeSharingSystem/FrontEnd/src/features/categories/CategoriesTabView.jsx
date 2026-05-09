import { useState } from "react";

function CategoryIcon({ name = "folder" }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    focusable: "false",
  };

  const paths = {
    folder: (
      <>
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="m19 6-1 14H6L5 6" />
      </>
    ),
    toggleOn: (
      <>
        <rect x="2" y="7" width="20" height="10" rx="5" />
        <circle cx="16" cy="12" r="3" />
      </>
    ),
    book: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5Z" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
  };

  return (
    <svg className="admin-icon" {...common}>
      {paths[name] || paths.folder}
    </svg>
  );
}

function slugify(value) {
  return String(value || "course").trim().toLowerCase().replace(/\s+/g, "-");
}

function CategoriesTabView(props) {
  const { model, controller } = props;
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: "", description: "" });
  const palette = ["#2563EB", "#0D9488", "#7C3AED", "#EA580C", "#059669", "#DC2626"];

  if (!model.isModerator) {
    return (
      <section className="admin-page">
        <div className="admin-page-head">
          <div>
            <h2>Category Management</h2>
            <p>Only moderator/admin can manage courses.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <div>
          <h2>
            <CategoryIcon />
            Category Management
          </h2>
          <p>{model.categories.length} categories configured</p>
        </div>
        <button type="button" className="admin-primary-btn" onClick={() => setAddOpen((value) => !value)}>
          <CategoryIcon name="plus" />
          New Category
        </button>
      </div>

      {addOpen && (
        <form className="admin-create-card" onSubmit={controller.onSubmitCreateCategory}>
          <h3>New Category</h3>
          <div className="admin-create-grid">
            <label>
              <span>Name</span>
              <input
                placeholder="e.g. Engineering"
                value={model.newCategoryForm.name}
                onChange={(event) => controller.onChangeCategoryName(event.target.value)}
              />
            </label>
            <label>
              <span>Description</span>
              <input
                placeholder="Brief description of this category"
                value={model.newCategoryForm.description}
                onChange={(event) => controller.onChangeCategoryDescription(event.target.value)}
              />
            </label>
          </div>
          <div className="admin-create-actions">
            <button type="button" onClick={() => setAddOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="admin-primary-btn">
              Create Category
            </button>
          </div>
        </form>
      )}

      <div className="admin-category-grid">
        {model.categories.map((category, index) => {
          const color = palette[index % palette.length];
          const isActive = Number(model.selectedCategory?.categoryId || 0) === Number(category.categoryId || 0);
          const isEditing = Number(editingId || 0) === Number(category.categoryId || 0);
          const isEnabled = category.isActive !== false;
          const startEdit = () => {
            setEditingId(category.categoryId);
            setEditDraft({
              name: category.name || "",
              description: category.description || "",
            });
          };
          const cancelEdit = () => {
            setEditingId(null);
            setEditDraft({ name: "", description: "" });
          };
          const saveEdit = async () => {
            if (!editDraft.name.trim()) return;
            await controller.onUpdateCategory?.(category.categoryId, {
              name: editDraft.name.trim(),
              description: editDraft.description.trim(),
            });
            cancelEdit();
          };
          return (
            <article key={category.categoryId} className={`admin-category-card ${isActive ? "active" : ""} ${!isEnabled ? "inactive" : ""}`}>
              <div
                className="admin-category-main"
                role="button"
                tabIndex={0}
                onClick={() => controller.onSelectCategory(category)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") controller.onSelectCategory(category);
                }}
              >
                <span className="admin-category-icon" style={{ color, backgroundColor: `${color}18`, borderColor: `${color}30` }}>
                  <CategoryIcon />
                </span>
                <span className="admin-category-copy">
                  {isEditing ? (
                    <span className="admin-category-edit-form" onClick={(event) => event.stopPropagation()}>
                      <input
                        value={editDraft.name}
                        onChange={(event) => setEditDraft((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="Course name"
                      />
                      <textarea
                        value={editDraft.description}
                        onChange={(event) => setEditDraft((prev) => ({ ...prev, description: event.target.value }))}
                        placeholder="Course description"
                        rows={2}
                      />
                    </span>
                  ) : (
                    <>
                      <strong>{category.name}</strong>
                      <small>{category.description || `Course ID #${category.categoryId}`}</small>
                    </>
                  )}
                  <em>
                    <CategoryIcon name="book" />
                    {Number(category.documentCount || 0)} documents - /{slugify(category.name)}
                    {!isEnabled ? " - inactive" : ""}
                  </em>
                </span>
                <CategoryIcon name="chevron" />
              </div>
              <div className="admin-category-actions">
                {isEditing ? (
                  <>
                    <button type="button" className="success" title="Save category" onClick={saveEdit}>
                      Save
                    </button>
                    <button type="button" title="Cancel edit" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" title="Edit category" onClick={startEdit}>
                      <CategoryIcon name="edit" />
                    </button>
                    {isEnabled ? (
                      <button
                        type="button"
                        title="Deactivate category"
                        onClick={() => controller.onDeactivateCategory?.(category.categoryId)}
                      >
                        <CategoryIcon name="trash" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="success"
                        title="Restore category"
                        onClick={() => controller.onRestoreCategory?.(category.categoryId)}
                      >
                        <CategoryIcon name="toggleOn" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {model.selectedCategory && (
        <section className="admin-table-card compact">
          <div className="admin-table-head">
            <div>
              <h3>Documents in "{model.selectedCategory.name}"</h3>
              <p>{model.categoryDocs.length} approved documents</p>
            </div>
          </div>
          {model.categoryDocs.length === 0 ? (
            <p className="hint">No approved documents in this course yet.</p>
          ) : (
            <div className="admin-log-list">
              {model.categoryDocs.map((doc) => (
                <article key={doc.documentId}>
                  <span className="admin-log-icon">
                    <CategoryIcon name="book" />
                  </span>
                  <div>
                    <button type="button" className="admin-inline-link" onClick={() => controller.onPreviewDoc(doc)}>
                      {doc.title}
                    </button>
                    <p>Document #{doc.documentId}</p>
                  </div>
                  <a href={controller.resolveUrl(doc.fileUrl)} target="_blank" rel="noreferrer">
                    Open file
                  </a>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}

export default CategoriesTabView;
