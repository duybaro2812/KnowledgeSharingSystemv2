import { useEffect, useRef, useState } from "react";

function Topbar(props) {
  const { docFilter, setDocFilter, call, loadDocuments, setActiveTab, user, clearSession } = props;
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(e.target)) {
        setOpenUserMenu(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <header className="topbar studocu-topbar">
      <div className="topbar-left">
        <h1>Knowledge Sharing Workspace</h1>
        <p>API endpoint ready: local backend is connected.</p>
      </div>

      <div className="topbar-center">
        <input
          placeholder="Search for courses, quizzes, or documents"
          value={docFilter.keyword}
          onChange={(e) => setDocFilter((p) => ({ ...p, keyword: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter") call(loadDocuments);
          }}
        />
        <button className="primary-btn" onClick={() => call(loadDocuments)}>
          Search
        </button>
      </div>

      <div className="topbar-right">
        <button
          type="button"
          className="icon-btn bell-btn"
          title="Notifications"
          onClick={() => setActiveTab("notifications")}
        >
          <span className="bell-icon" aria-hidden="true" />
        </button>

        <div className="user-menu-wrap" ref={userMenuRef}>
          <button
            type="button"
            className="avatar-menu-trigger"
            onClick={() => setOpenUserMenu((v) => !v)}
            title={user?.name || "User menu"}
          >
            <span className="mini-avatar">
              {(user?.name || "U").slice(0, 1).toUpperCase()}
            </span>
            <span className="menu-caret" aria-hidden="true">
              ▼
            </span>
          </button>

          {openUserMenu && (
            <div className="user-menu-dropdown">
              <button type="button" onClick={() => { setActiveTab("profile"); setOpenUserMenu(false); }}>
                Profile
              </button>
              <button type="button" onClick={() => { setActiveTab("library"); setOpenUserMenu(false); }}>
                Uploads
              </button>
              <button type="button" onClick={() => { setActiveTab("settings"); setOpenUserMenu(false); }}>
                Settings
              </button>
              <button type="button" className="danger-item" onClick={clearSession}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;
