function SearchTabView(props) {
  const { model, controller } = props;

  return (
    <section className="panel search-results-panel">
      <div className="search-results-head">
        <div>
          <h2>Search results</h2>
          <p className="hint">
            {model.keyword
              ? `Showing documents matching "${model.keyword}".`
              : "Type a keyword to find related documents."}
          </p>
        </div>
        <button type="button" onClick={controller.onBackHome}>
          Back to Home
        </button>
      </div>

      {model.docs.length === 0 ? (
        <p className="hint">No documents found for this keyword.</p>
      ) : (
        <div className="reading-row">
          {model.docs.map((doc) => (
            <article key={doc.documentId} className="reading-card">
              <button type="button" className="reading-thumb" onClick={() => controller.onOpenDoc(doc)}>
                <span>DOC</span>
              </button>
              <h3 title={doc.title}>{doc.title}</h3>
              <p>{doc.description || "Document"}</p>
              <div className="doc-actions">
                <button type="button" onClick={() => controller.onOpenDoc(doc)}>
                  Open document
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default SearchTabView;
