function LibraryTabView(props) {
  const { model, controller } = props;

  return (
    <section className="panel">
      <h2>My library</h2>
      {model.isBusy && <p className="hint">Updating your library...</p>}
      {model.myDocs.length === 0 && !model.isBusy && (
        <p className="hint">You do not have uploaded documents yet.</p>
      )}
      <div className="reading-row">
        {model.myDocs.map((d) => (
          <article key={d.documentId} className="reading-card">
            <button
              type="button"
              className="reading-thumb"
              disabled={model.isBusy}
              onClick={() => controller.onPreviewDoc(d)}
            >
              <span>DOC</span>
            </button>
            <h3 title={d.title}>{d.title}</h3>
            <p>{d.description || "Your uploaded material"}</p>
            <div className="doc-actions">
              <button type="button" disabled={model.isBusy} onClick={() => controller.onPreviewDoc(d)}>
                Preview
              </button>
              <a href={controller.resolveUrl(d.fileUrl)} target="_blank" rel="noreferrer">
                Open file
              </a>
              <span className={`badge ${d.status}`}>{d.status}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default LibraryTabView;
