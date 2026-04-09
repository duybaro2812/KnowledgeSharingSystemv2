import { useEffect, useRef, useState } from "react";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M16 16l4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 8v4.4l2.8 1.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 16.5 10 11.5l3 3L19 8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.8 8.5H19v4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 5.5h9.2A1.8 1.8 0 0 1 17 7.3v11.2H8.7A2.7 2.7 0 0 0 6 21.2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.3 7.2v11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.5 7.8A1.8 1.8 0 0 1 6.3 6h4l1.8 1.8h5.6a1.8 1.8 0 0 1 1.8 1.8v6.8a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2z"
        fill="currentColor"
        opacity="0.12"
      />
      <path
        d="M4.5 8A2 2 0 0 1 6.5 6h3.8l1.8 1.8h5.4a2 2 0 0 1 2 2v6.6a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CodeCourseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8.5 8.5 5 12l3.5 3.5M15.5 8.5 19 12l-3.5 3.5M13.2 6.8 10.8 17.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MegaphoneCourseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M14.5 8 18.8 6.2v11.6L14.5 16H9.8A1.8 1.8 0 0 1 8 14.2V9.8A1.8 1.8 0 0 1 9.8 8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8.4 16.2 9.7 19"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AtomCourseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <path
        d="M12 4.8c2.7 0 5.2 3.2 5.2 7.2S14.7 19.2 12 19.2 6.8 16 6.8 12 9.3 4.8 12 4.8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M6 8.7c1.4-2.3 5.4-2.8 8.8-.8s4.9 5.7 3.5 8c-1.4 2.3-5.4 2.8-8.8.8S4.6 11 6 8.7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function CalculatorCourseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6.2" y="4.5" width="11.6" height="15" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 8.4h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.2 12.2h.01M12 12.2h.01M14.8 12.2h.01M9.2 15h.01M12 15h.01M14.8 15h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function BriefcaseCourseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8.3 7.2V6.3A1.8 1.8 0 0 1 10.1 4.5h3.8a1.8 1.8 0 0 1 1.8 1.8v.9M5.4 8h13.2A1.4 1.4 0 0 1 20 9.4v7.8a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 17.2V9.4A1.4 1.4 0 0 1 5.4 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10.2 12h3.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const courseIcons = [
  CodeCourseIcon,
  MegaphoneCourseIcon,
  AtomCourseIcon,
  CalculatorCourseIcon,
  BriefcaseCourseIcon,
];

function PointsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4.5 6.6 7.2v5.2c0 3.4 2.3 6.5 5.4 7.3 3.1-.8 5.4-3.9 5.4-7.3V7.2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m9.6 11.9 1.5 1.5 3.2-3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const heroImage =
  "https://images.unsplash.com/photo-1718327453695-4d32b94c90a4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwc3R1ZGVudHMlMjBzdHVkeWluZyUyMGxpYnJhcnl8ZW58MXx8fHwxNzc1MjkxMjQ4fDA&ixlib=rb-4.1.0&q=80&w=1080";

function DocumentRowSection({ title, subtitle, docs, icon, actionLabel, onAction, onOpenDoc, rank }) {
  return (
    <section className="home-gentle-section">
      <div className="home-gentle-section-head">
        <div>
          <h2>
            {icon}
            {title}
          </h2>
          <p>{subtitle}</p>
        </div>
        {actionLabel && (
          <button type="button" className="home-gentle-link" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </div>

      <div className="home-gentle-track">
        {docs.map((doc, index) => (
          <article key={doc.documentId} className="home-gentle-card">
            <button type="button" className="reading-card-click" onClick={() => onOpenDoc(doc)}>
              <span className="sr-only">Open document {doc.title}</span>
            </button>
            <div className={`home-gentle-card-cover cover-${index % 4}`}>
              {rank ? <span className="home-gentle-rank">#{index + 1}</span> : null}
              <div className="home-gentle-progress-rail">
                <div
                  className="home-gentle-progress-fill"
                  style={{ width: `${36 + (index % 3) * 16}%` }}
                />
              </div>
            </div>
            <div className="home-gentle-card-body">
              <span className="home-gentle-chip">{doc.categoryLabel}</span>
              <h3>{doc.title}</h3>
                <small>{doc.ownerName}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CourseRowSection({ courses, onOpenCategory }) {
  return (
    <section className="home-gentle-section">
      <div className="home-gentle-section-head">
        <div>
          <h2>
            <BookIcon />
            Top Courses
          </h2>
          <p>Popular course areas with active materials and discussion</p>
        </div>
      </div>

      <div className="home-gentle-track">
        {courses.map((course, index) => (
          <button
            key={course.categoryId}
            type="button"
            className={`home-gentle-course-card tone-${index % 4}`}
            onClick={() => onOpenCategory(course)}
          >
            <div className="home-gentle-course-icon">
              {(() => {
                const Icon = courseIcons[index % courseIcons.length];
                return <Icon />;
              })()}
            </div>
            <strong>{course.name}</strong>
            <span>{course.docCount} documents</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function HomeTabView(props) {
  const { model, controller } = props;
  const firstName = (model.user?.name || "Learner").split(" ")[0];
  const recentlyRef = useRef(null);
  const searchRef = useRef(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (model.activeTab === "recent" && recentlyRef.current) {
      recentlyRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [model.activeTab]);

  useEffect(() => {
    const keyword = String(controller.searchKeyword || "").trim();
    if (!keyword) return undefined;

    const timerId = setTimeout(() => {
      controller.onLiveSearch();
    }, 280);

    return () => clearTimeout(timerId);
  }, [controller.searchKeyword]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onMouseDown = (event) => {
      if (!searchRef.current || searchRef.current.contains(event.target)) return;
      setShowSuggestions(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  return (
    <div className="home-gentle">
      <section className="home-gentle-hero">
        <div
          className="home-gentle-hero-bg"
          style={{ backgroundImage: `url(${heroImage})` }}
          aria-hidden="true"
        />
        <div className="home-gentle-hero-overlay" aria-hidden="true" />

        <div className="home-gentle-hero-content">
          <div className="home-gentle-pill">Welcome back, {firstName}</div>
          <h1>What will you learn today?</h1>
          <p>
            Access trusted study materials, continue where you left off, and discover
            useful documents from your university community.
          </p>

          <div className="home-gentle-search-row">
            <div className="home-gentle-search-input" ref={searchRef}>
              <span className="home-gentle-search-icon">
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="Search documents, courses, topics..."
                value={controller.searchKeyword}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  controller.onChangeSearchKeyword(e.target.value);
                  setShowSuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  if (e.nativeEvent?.isComposing) return;
                  e.preventDefault();
                  setShowSuggestions(false);
                  controller.onRunSearch();
                }}
              />

              {showSuggestions && controller.searchKeyword.trim() && model.searchSuggestions.length > 0 && (
                <div className="home-search-suggestions">
                  {model.searchSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.key}
                      type="button"
                      className="home-search-suggestion"
                      onClick={() => {
                        setShowSuggestions(false);
                        controller.onSelectSearchSuggestion(suggestion);
                      }}
                    >
                      <span className={`home-search-suggestion-icon ${suggestion.type}`}>
                        {suggestion.type === "course" ? <FolderIcon /> : <BookIcon />}
                      </span>
                      <span className="home-search-suggestion-copy">
                        <strong>{suggestion.label}</strong>
                        <small>{suggestion.meta}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className="home-gentle-search-btn" onClick={() => controller.onRunSearch()}>
              Search
            </button>
          </div>

          <div className="home-gentle-tag-row">
            {["Algorithms", "Machine Learning", "Organic Chemistry", "Calculus"].map((tag) => (
              <button
                key={tag}
                type="button"
                className="home-gentle-tag"
                onClick={() => {
                  controller.onChangeSearchKeyword(tag);
                  controller.onRunSearch();
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <aside className="home-gentle-points-card">
          <div className="floating-stat-card tone-amber">
            <div className="floating-stat-icon">
              <PointsIcon />
            </div>
            <div>
              <strong>{model.userPoints}</strong>
              <span>Your Points</span>
            </div>
          </div>
        </aside>
      </section>

      <DocumentRowSection
        title="Continue Reading"
        subtitle="Pick up where you left off"
        docs={model.continueReading}
        icon={<ClockIcon />}
        actionLabel="View library"
        onAction={() => controller.onGoToTab("library")}
        onOpenDoc={controller.onSelectDocumentCard}
      />

      <DocumentRowSection
        title="Trending Documents"
        subtitle="Materials receiving the most attention right now"
        docs={model.trendingDocs}
        icon={<TrendIcon />}
        actionLabel="Live activity"
        onAction={() => controller.onGoToTab("notifications")}
        onOpenDoc={controller.onSelectDocumentCard}
        rank
      />

      <CourseRowSection courses={model.courseCards} onOpenCategory={controller.onOpenCategory} />

      <div ref={recentlyRef}>
        <DocumentRowSection
          title="Recently"
          subtitle="Recently added approved materials"
          docs={model.recentDocs}
          icon={<BookIcon />}
          onOpenDoc={controller.onSelectDocumentCard}
        />
      </div>
    </div>
  );
}

export default HomeTabView;
