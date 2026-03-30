function HomeTabView(props) {
  const { model, controller } = props;

  return (
    <>
      <section className="panel home-hero-panel">
        <div className="home-hero-content">
          <h2>Transform the way you study</h2>
          <p>Study smarter with summaries, quizzes, and trusted shared materials.</p>
        </div>
        <div className="home-hero-preview" aria-hidden="true">
          <div className="hero-screen">
            <div className="hero-chip">Study Collab</div>
            <div className="hero-line" />
            <div className="hero-line short" />
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Continue reading</h2>
        <div className="reading-row">
          {model.docs.slice(0, 8).map((d) => (
            <article
              key={d.documentId}
              className={`reading-card ${d.isLockedForPoints ? "locked" : ""}`}
            >
              <button
                type="button"
                className="reading-card-click"
                onClick={() => controller.onSelectDocumentCard(d)}
              >
                <span className="sr-only">Open document {d.title}</span>
              </button>

              <button
                type="button"
                className="reading-thumb"
                onClick={() => controller.onSelectDocumentCard(d)}
              >
                <span>DOC</span>
              </button>

              <h3 title={d.title}>{d.title}</h3>
              <p>{d.description || "Shared material"}</p>

              <small className="reading-meta">
                {d.isLockedForPoints
                  ? `Locked • Need ${d.requiredPoints} points`
                  : "Click to preview"}
              </small>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

export default HomeTabView;
