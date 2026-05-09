import { useEffect, useMemo, useRef, useState } from "react";
import { getUserLanguage, notificationKindLabel, notificationText, tFor } from "../../i18n";

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
    markAllRead,
    openFromNotification,
    isGuestMode,
    onNavigateToLogin,
    onNavigateToRegister,
    isBusy,
    resolveFileUrl,
  } = props;

  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [openNotificationMenu, setOpenNotificationMenu] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState("all");
  const userMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const role = user?.role || "user";
  const language = getUserLanguage(user);
  const text = tFor(user);
  const isAdmin = role === "admin";
  const isModerator = role === "moderator";
  const showTopbarSearch = role !== "user";
  const avatarSrc = user?.avatarUrl && typeof resolveFileUrl === "function" ? resolveFileUrl(user.avatarUrl) : "";

  const title = isAdmin ? text.adminTitle : isModerator ? text.moderatorTitle : text.appTitle;
  const subtitle = isAdmin ? text.adminSubtitle : isModerator ? text.moderatorSubtitle : text.appSubtitle;

  useEffect(() => {
    const onDocClick = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setOpenUserMenu(false);
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target)) {
        setOpenNotificationMenu(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const unreadCount = useMemo(
    () => (Array.isArray(notifications) ? notifications.filter((item) => !item.isRead).length : 0),
    [notifications],
  );

  const visibleNotifications = useMemo(() => {
    const source = Array.isArray(notifications) ? notifications : [];
    const filtered = notificationFilter === "unread" ? source.filter((item) => !item.isRead) : source;
    return filtered.slice(0, 12);
  }, [notifications, notificationFilter]);

  const runTopbarSearch = () => call(loadDocuments, { actionKey: "search:topbar" });

  return (
    <header className={`topbar studocu-topbar role-topbar role-${role}`}>
      <div className="topbar-left">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      {showTopbarSearch && (
        <div className="topbar-center">
          <input
            placeholder={text.searchPlaceholder}
            value={docFilter.keyword}
            onChange={(event) => setDocFilter((prev) => ({ ...prev, keyword: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              if (event.nativeEvent?.isComposing) return;
              if (isBusy) return;
              event.preventDefault();
              runTopbarSearch();
            }}
          />
          <button className="primary-btn" disabled={isBusy} onClick={runTopbarSearch}>
            {isBusy ? text.searching : text.search}
          </button>
        </div>
      )}

      <div className="topbar-right">
        {isGuestMode ? (
          <div className="topbar-auth-actions">
            <button type="button" className="topbar-auth-btn topbar-auth-login" onClick={() => onNavigateToLogin?.()}>
              {text.login}
            </button>
            <button type="button" className="topbar-auth-btn topbar-auth-register" onClick={() => onNavigateToRegister?.()}>
              {text.register}
            </button>
          </div>
        ) : (
          <>
            <div className="notification-wrap" ref={notificationMenuRef}>
              <button
                type="button"
                className="icon-btn bell-btn"
                title={text.notifications}
                disabled={isBusy}
                onClick={() => setOpenNotificationMenu((value) => !value)}
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
                    <h3>{text.notifications}</h3>
                    <div className="notification-head-actions">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          className="link-pill"
                          disabled={isBusy}
                          onClick={() => markAllRead?.()}
                        >
                          {text.markAllRead}
                        </button>
                      )}
                      <button
                        type="button"
                        className="link-pill"
                        onClick={() => {
                          setActiveTab("notifications");
                          setOpenNotificationMenu(false);
                        }}
                      >
                        {text.viewAll}
                      </button>
                    </div>
                  </div>

                  <div className="notification-filters">
                    <button
                      type="button"
                      className={notificationFilter === "all" ? "active" : ""}
                      onClick={() => setNotificationFilter("all")}
                    >
                      {text.all}
                    </button>
                    <button
                      type="button"
                      className={notificationFilter === "unread" ? "active" : ""}
                      onClick={() => setNotificationFilter("unread")}
                    >
                      {text.unread}
                    </button>
                  </div>

                  <div className="notification-list-mini">
                    {visibleNotifications.length === 0 && <p className="notification-empty">{text.noNotifications}</p>}
                    {visibleNotifications.map((item) => {
                      const localizedNotification = notificationText(item, language);
                      return (
                      <div
                        key={item.notificationId}
                        className={`notification-mini-item ${item.isRead ? "read" : "unread"}`}
                        onClick={() => {
                          openFromNotification?.(item);
                          setOpenNotificationMenu(false);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            openFromNotification?.(item);
                            setOpenNotificationMenu(false);
                          }
                        }}
                      >
                        <div className="notification-mini-main">
                          <div className="notification-mini-top">
                            <b>{localizedNotification.title}</b>
                            <span className="notifications-kind-chip">{notificationKindLabel(item.type, language)}</span>
                          </div>
                          <p>{localizedNotification.message}</p>
                          <small>{new Date(item.createdAt).toLocaleString()}</small>
                        </div>
                        {!item.isRead && (
                          <button
                            type="button"
                            className="mini-mark-read"
                            disabled={isBusy}
                            onClick={(event) => {
                              event.stopPropagation();
                              markRead?.(item.notificationId);
                            }}
                          >
                            {text.markRead}
                          </button>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="user-menu-wrap" ref={userMenuRef}>
              <button
                type="button"
                className="avatar-menu-trigger"
                disabled={isBusy}
                onClick={() => setOpenUserMenu((value) => !value)}
                title={user?.name || text.userMenu}
              >
                <span className="mini-avatar">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt={`${user?.name || "User"} avatar`} />
                  ) : (
                    (user?.name || "U").slice(0, 1).toUpperCase()
                  )}
                </span>
                <span className="menu-caret" aria-hidden="true">
                  ▾
                </span>
              </button>

              {openUserMenu && (
                <div className="user-menu-dropdown">
                  <button type="button" onClick={() => { setActiveTab("profile"); setOpenUserMenu(false); }}>
                    {text.profile}
                  </button>
                  <button type="button" onClick={() => { setActiveTab("points"); setOpenUserMenu(false); }}>
                    {text.points}
                  </button>
                  {role === "user" ? (
                    <>
                      <button type="button" onClick={() => { setActiveTab("library"); setOpenUserMenu(false); }}>
                        {text.uploads}
                      </button>
                      <button type="button" onClick={() => { setActiveTab("qa"); setOpenUserMenu(false); }}>
                        {text.qaSessions}
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => { setActiveTab("moderation"); setOpenUserMenu(false); }}>
                        {text.moderation}
                      </button>
                      <button type="button" onClick={() => { setActiveTab("categories"); setOpenUserMenu(false); }}>
                        {text.courses}
                      </button>
                      {role === "admin" && (
                        <button type="button" onClick={() => { setActiveTab("users"); setOpenUserMenu(false); }}>
                          {text.users}
                        </button>
                      )}
                    </>
                  )}
                  <button type="button" onClick={() => { setActiveTab("settings"); setOpenUserMenu(false); }}>
                    {text.settings}
                  </button>
                  <button type="button" className="danger-item" onClick={clearSession}>
                    {text.signOut}
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
