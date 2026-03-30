function LibraryTabView(props) {
  const { model, controller } = props;

  return (
    <section className="panel">
      <h2>My library</h2>
      <div className="reading-row">
        {model.myDocs.map((d) => (
          <article key={d.documentId} className="reading-card">
            <button type="button" className="reading-thumb" onClick={() => controller.onPreviewDoc(d)}>
              <span>DOC</span>
            </button>
            <h3 title={d.title}>{d.title}</h3>
            <p>{d.description || "Your uploaded material"}</p>
            <div className="doc-actions">
              <button type="button" onClick={() => controller.onPreviewDoc(d)}>
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
