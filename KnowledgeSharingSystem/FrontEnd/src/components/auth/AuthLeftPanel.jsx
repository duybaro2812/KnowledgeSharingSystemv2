function AuthLeftPanel() {
  const highlights = [
    { value: "8.4k", label: "students" },
    { value: "2.1k", label: "documents" },
    { value: "98%", label: "reviewed" },
  ];

  const cards = [
    {
      title: "Upload & earn",
      text: "Share useful notes and collect points from real engagement.",
      icon: "UP",
      tone: "blue",
    },
    {
      title: "Reviewed content",
      text: "Documents move through a clear moderator workflow.",
      icon: "OK",
      tone: "green",
    },
    {
      title: "Study together",
      text: "Ask questions, follow authors, and build your library.",
      icon: "QA",
      tone: "amber",
    },
  ];

  return (
    <div className="auth-left">
      <div className="auth-left-grid" aria-hidden="true" />
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />
      <div className="auth-orb auth-orb-three" />
      <div className="auth-particles">
        {Array.from({ length: 18 }, (_, index) => (
          <span
            key={index}
            style={{
              "--i": index,
              left: `${((index * 37) % 92) + 4}%`,
              top: `${((index * 61) % 84) + 8}%`,
            }}
          />
        ))}
      </div>

      <div className="auth-brand-block">
        <div className="auth-brand-row">
          <span className="auth-logo-mark">N</span>
          <span className="auth-brand-name">NeuShare</span>
          <span className="auth-beta-pill">BETA</span>
        </div>
        <div className="auth-left-copy">
          <span className="auth-kicker">Knowledge sharing workspace</span>
          <h1>Share smarter. Learn faster.</h1>
          <p>
            Learning hub for shared documents, moderated quality, and trusted
            academic collaboration.
          </p>
        </div>
      </div>

      <div className="auth-floating-cards">
        {cards.map((card, index) => (
          <article
            className={`auth-benefit-card auth-benefit-${index + 1}`}
            key={card.title}
          >
            <span className={`auth-benefit-icon tone-${card.tone}`}>{card.icon}</span>
            <div>
              <strong>{card.title}</strong>
              <p>{card.text}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="auth-left-footer">
        <div className="auth-highlight-row">
          {highlights.map((item) => (
            <span key={item.label}>
              <strong>{item.value}</strong>
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AuthLeftPanel;
