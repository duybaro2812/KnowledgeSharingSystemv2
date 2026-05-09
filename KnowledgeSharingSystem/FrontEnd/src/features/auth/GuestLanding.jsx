function GuestLanding(props) {
  const docs = Array.isArray(props.homeDocs) && props.homeDocs.length > 0
    ? props.homeDocs
    : Array.isArray(props.docs)
      ? props.docs
      : [];

  const topDocs = docs.slice(0, 6);

  return (
    <section className="auth-card guest-card">
      <h2>Explore NeuShare</h2>
      <p className="auth-card-subtitle">
        Browse public study materials before creating an account.
      </p>

      <div className="guest-cta-row">
        <button type="button" className="primary-btn" onClick={() => props.setAuthMode("login")}>
          Sign in
        </button>
        <button type="button" onClick={() => props.setAuthMode("register")}>
          Create account
        </button>
      </div>

      <div className="guest-list">
        {topDocs.length === 0 && (
          <p className="hint">No public documents yet.</p>
        )}

        {topDocs.map((doc) => (
          <article key={doc.documentId} className="guest-doc-card">
            <div>
              <strong>{doc.title || "Untitled document"}</strong>
              <p>{doc.ownerName || "NeuShare member"}</p>
            </div>
            <button type="button" onClick={() => props.setAuthMode("login")}>
              Sign in to open
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default GuestLanding;
