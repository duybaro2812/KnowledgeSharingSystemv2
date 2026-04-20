import { useEffect, useMemo, useRef, useState } from "react";

function mapNotificationKind(rawType) {
  const type = String(rawType || "").toLowerCase();
  if (type.includes("qa") || type.includes("chat")) return "Q&A";
  if (type.includes("point")) return "Points";
  if (type.includes("plagiarism")) return "Plagiarism";
  if (type.includes("report") || type.includes("moderation")) return "Moderation";
  if (type.includes("comment") || type.includes("document")) return "Documents";
  return "System";
}

function Topbar(props) {
  const {
    docFilter,
    setDocFilter,
    call,
    loadDocuments,
    setActiveTab,
    user,
    clearSession,
    notifications = [],
    markRead,
    openFromNotification,
    isGuestMode,
    onNavigateToLogin,
    onNavigateToRegister,
    isBusy,
  } = props;

  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [openNotificationMenu, setOpenNotificationMenu] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState("all");
  const userMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const role = user?.role || "user";
  const isAdmin = role === "admin";
  const isModerator = role === "moderator";
  const showTopbarSearch = role !== "user";

  const title = isAdmin
    ? "Admin Workspace"
    : isModerator
      ? "Moderator Workspace"
      : "Knowledge Sharing Workspace";

  const subtitle = isAdmin
    ? "Manage reports, moderation queue, and platform-level actions."
    : isModerator
      ? "Review reports, lock/unlock documents, and handle moderation workflow."
      : "API endpoint ready: local backend is connected.";

  useEffect(() => {
    const onDocClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setOpenUserMenu(false);
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(e.target)) {
        setOpenNotificationMenu(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const unreadCount = useMemo(
    () => (Array.isArray(notifications) ? notifications.filter((n) => !n.isRead).length : 0),
    [notifications],
  );

  const visibleNotifications = useMemo(() => {
    const source = Array.isArray(notifications) ? notifications : [];
    const filtered = notificationFilter === "unread" ? source.filter((n) => !n.isRead) : source;
    return filtered.slice(0, 12);
  }, [notifications, notificationFilter]);

  return (
    <header className={`topbar studocu-topbar role-topbar role-${role}`}>
      <div className="topbar-left">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      {showTopbarSearch && (
        <div className="topbar-center">
          <input
            placeholder="Search for courses, quizzes, or documents"
            value={docFilter.keyword}
            onChange={(e) => setDocFilter((p) => ({ ...p, keyword: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              if (e.nativeEvent?.isComposing) return;
              if (isBusy) return;
              e.preventDefault();
              call(loadDocuments, { actionKey: "search:topbar" });
            }}
          />
          <button
            className="primary-btn"
            disabled={isBusy}
            onClick={() => call(loadDocuments, { actionKey: "search:topbar" })}
          >
            {isBusy ? "Searching..." : "Search"}
          </button>
        </div>
      )}

      <div className="topbar-right">
        {isGuestMode ? (
          <div className="topbar-auth-actions">
            <button
              type="button"
              className="topbar-auth-btn topbar-auth-login"
              onClick={() => onNavigateToLogin && onNavigateToLogin()}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className="topbar-auth-btn topbar-auth-register"
              onClick={() => onNavigateToRegister && onNavigateToRegister()}
            >
              Đăng ký
            </button>
          </div>
        ) : (
          <>
        <div className="notification-wrap" ref={notificationMenuRef}>
          <button
            type="button"
            className="icon-btn bell-btn"
            title="Notifications"
            disabled={isBusy}
            onClick={() => setOpenNotificationMenu((v) => !v)}
          >
            <svg
              className="bell-svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6.5 9.5a5.5 5.5 0 1 1 11 0v5l1.5 2.5h-14L6.5 14.5z" />
              <path d="M10 19a2 2 0 0 0 4 0" />
            </svg>
            {unreadCount > 0 && <span className="bell-dot" aria-hidden="true" />}
          </button>

          {openNotificationMenu && (
            <div className="notification-dropdown">
              <div className="notification-head">
                <h3>Notifications</h3>
                <button
                  type="button"
                  className="link-pill"
                  onClick={() => {
                    setActiveTab("notifications");
                    setOpenNotificationMenu(false);
                  }}
                >
                  View all
                </button>
              </div>

              <div className="notification-filters">
                <button
                  type="button"
                  className={notificationFilter === "all" ? "active" : ""}
                  onClick={() => setNotificationFilter("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={notificationFilter === "unread" ? "active" : ""}
                  onClick={() => setNotificationFilter("unread")}
                >
                  Unread
                </button>
              </div>

              <div className="notification-list-mini">
                {visibleNotifications.length === 0 && (
                  <p className="notification-empty">No notifications.</p>
                )}
                {visibleNotifications.map((n) => (
                  <div
                    key={n.notificationId}
                    className={`notification-mini-item ${n.isRead ? "read" : "unread"}`}
                    onClick={() => {
                      if (openFromNotification) openFromNotification(n);
                      setOpenNotificationMenu(false);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        if (openFromNotification) openFromNotification(n);
                        setOpenNotificationMenu(false);
                      }
                    }}
                  >
                    <div className="notification-mini-main">
                      <div className="notification-mini-top">
                        <b>{n.title}</b>
                        <span className="notifications-kind-chip">{mapNotificationKind(n.type)}</span>
                      </div>
                      <p>{n.message}</p>
                      <small>{new Date(n.createdAt).toLocaleString()}</small>
                    </div>
                    {!n.isRead && (
                      <button
                        type="button"
                      className="mini-mark-read"
                        disabled={isBusy}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (markRead) markRead(n.notificationId);
                        }}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="user-menu-wrap" ref={userMenuRef}>
          <button
            type="button"
            className="avatar-menu-trigger"
            disabled={isBusy}
            onClick={() => setOpenUserMenu((v) => !v)}
            title={user?.name || "User menu"}
          >
            <span className="mini-avatar">{(user?.name || "U").slice(0, 1).toUpperCase()}</span>
            <span className="menu-caret" aria-hidden="true">
              ▾
            </span>
          </button>

          {openUserMenu && (
            <div className="user-menu-dropdown">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("profile");
                  setOpenUserMenu(false);
                }}
              >
                Profile
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("points");
                  setOpenUserMenu(false);
                }}
              >
                Points
              </button>

              {role === "user" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("library");
                      setOpenUserMenu(false);
                    }}
                  >
                    Uploads
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("qa");
                      setOpenUserMenu(false);
                    }}
                  >
                    Q&A sessions
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("moderation");
                      setOpenUserMenu(false);
                    }}
                  >
                    Moderation
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("categories");
                      setOpenUserMenu(false);
                    }}
                  >
                    Courses
                  </button>
                  {role === "admin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("users");
                        setOpenUserMenu(false);
                      }}
                    >
                      Users
                    </button>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setActiveTab("settings");
                  setOpenUserMenu(false);
                }}
              >
                Settings
              </button>

              <button type="button" className="danger-item" onClick={clearSession}>
                Sign out
              </button>
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </header>
  );
}

export default Topbar;
