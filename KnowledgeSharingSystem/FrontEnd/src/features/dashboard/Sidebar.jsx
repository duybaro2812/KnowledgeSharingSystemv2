import { tFor } from "../../i18n";

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6.5 10.7 12 6l5.5 4.7V18a1.5 1.5 0 0 1-1.5 1.5h-2.7v-4.3h-2.6v4.3H8A1.5 1.5 0 0 1 6.5 18z"
        fill="currentColor"
        opacity="0.14"
      />
      <path
        d="M4.5 10.5 12 4.5l7.5 6V19a1 1 0 0 1-1 1h-4.3v-5.4H9.8V20H5.5a1 1 0 0 1-1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6.2 5.2h9.3a2 2 0 0 1 2 2v10.2H8.7a2.5 2.5 0 0 0-2.5 2.5z"
        fill="currentColor"
        opacity="0.12"
      />
      <path
        d="M6 5.5h9.8a1.8 1.8 0 0 1 1.8 1.8v11.2H8.8A2.8 2.8 0 0 0 6 21.3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.2 7.2v12.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M10.8 9h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M10.8 12.2h3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RecentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="currentColor"
        opacity="0.12"
      />
      <circle
        cx="12"
        cy="12"
        r="7.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M12 8v4.5l3 1.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.4 6.5 6.8 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function QaIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6.2 7.2h8.6a3.3 3.3 0 0 1 3.3 3.3v2.8a3.3 3.3 0 0 1-3.3 3.3H11l-3.5 2.7v-2.7H6.2a3.3 3.3 0 0 1-3.3-3.3v-2.8a3.3 3.3 0 0 1 3.3-3.3z"
        fill="currentColor"
        opacity="0.12"
      />
      <path
        d="M6.3 6.5h8.4a3.5 3.5 0 0 1 3.5 3.5v3a3.5 3.5 0 0 1-3.5 3.5H10.8l-3.3 2.5v-2.5H6.3A3.5 3.5 0 0 1 2.8 13v-3a3.5 3.5 0 0 1 3.5-3.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 10.6h5.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M8 13.2h3.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PointsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4.4 14 8.3l4.3.6-3.1 3 .8 4.2-4-2.1-4 2.1.8-4.2-3.1-3 4.3-.6z"
        fill="currentColor"
        opacity="0.14"
      />
      <path
        d="M12 4.6 14 8.6l4.4.7-3.2 3.1.8 4.4-4-2.2-4 2.2.8-4.4-3.2-3.1 4.4-.7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Sidebar(props) {
  const {
    user,
    stats,
    activeTab,
    setActiveTab,
    isSidebarCollapsed,
    isGuestMode,
    onGuestBlockedAction,
    qaUnreadCount = 0,
    resolveFileUrl,
  } = props;
  const role = user?.role || "user";
  const isUserRole = role === "user";
  const isAdminRole = role === "admin";
  const initials = (user?.name || "U").slice(0, 1).toUpperCase();
  const avatarSrc = user?.avatarUrl && typeof resolveFileUrl === "function" ? resolveFileUrl(user.avatarUrl) : "";
  const profileRoleLabel = isGuestMode ? "Guest" : user?.role;
  const pointValue = Number(user?.points || 0);
  const text = tFor(user);

  const menuItems = isUserRole
    ? [
        { key: "home", label: text.home, icon: <HomeIcon /> },
        { key: "recent", label: text.myDocuments, icon: <RecentIcon /> },
        { key: "library", label: text.myLibrary, icon: <LibraryIcon /> },
        { key: "qa", label: text.qaSessions, icon: <QaIcon />, badgeCount: qaUnreadCount },
        { key: "points", label: text.points, icon: <PointsIcon /> },
      ]
    : [
        { key: "home", label: text.home, icon: <HomeIcon /> },
        isAdminRole
          ? { key: "point-policy", label: text.pointsPolicy, icon: <PointsIcon /> }
          : { key: "points", label: text.points, icon: <PointsIcon /> },
        { key: "moderation", label: isAdminRole ? text.adminQueue : text.moderationQueue, icon: <RecentIcon /> },
        ...(isAdminRole ? [{ key: "users", label: text.users, icon: <QaIcon /> }] : []),
        { key: "categories", label: text.courses, icon: <LibraryIcon /> },
      ];

  const normalizedActiveTab = activeTab === "recent" ? "recent" : activeTab;
  const handleBrandClick = () => {
    if (normalizedActiveTab === "home") {
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        window.location.reload();
      }
      return;
    }
    setActiveTab("home");
  };

  return (
    <aside className={`sidebar role-sidebar role-${role} ${isSidebarCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-main">
        {!isSidebarCollapsed && (
          <button
            type="button"
            className="brand sidebar-brand sidebar-brand-btn"
            onClick={handleBrandClick}
            title={text.goHome}
          >
            <span className="sidebar-brand-mark" aria-hidden="true">
              N
            </span>
            <span>NeuShare</span>
          </button>
        )}

        <button
          type="button"
          className={`profile profile-panel profile-panel-btn ${isSidebarCollapsed ? "collapsed" : ""}`}
          onClick={() => {
            if (isGuestMode) {
              if (typeof onGuestBlockedAction === "function") {
                onGuestBlockedAction();
              }
              return;
            }
            setActiveTab("profile");
          }}
          title={text.openProfile}
          aria-label={text.openProfile}
        >
          <div className="avatar">
            {avatarSrc ? <img src={avatarSrc} alt={`${user?.name || "User"} avatar`} /> : initials}
          </div>
          {!isSidebarCollapsed && (
            <div className="profile-copy">
              <div className="profile-name">{user?.name}</div>
              <div className="profile-role">{profileRoleLabel}</div>
              <div className="profile-points-pill">{pointValue} pts</div>
            </div>
          )}
        </button>

        {isSidebarCollapsed ? (
          <div className="sidebar-stats-placeholder" aria-hidden="true" />
        ) : (
          <div className="stats sidebar-stats">
            <div>
              <b>{stats.uploads || 0}</b>
              <span>{text.upload}</span>
            </div>
            <div>
              <b>{stats.pending || 0}</b>
              <span>{text.pending}</span>
            </div>
            <div>
              <b>{stats.upvotes || 0}</b>
              <span>{text.upvote}</span>
            </div>
          </div>
        )}

        {isUserRole ? (
          <button
            type="button"
            className={`sidebar-upload-btn ${isSidebarCollapsed ? "icon-only" : ""}`}
            onClick={() => {
              if (isGuestMode) {
                if (typeof onGuestBlockedAction === "function") {
                  onGuestBlockedAction();
                }
                return;
              }
              setActiveTab("upload");
            }}
            title={text.newUpload}
          >
            <span className="sidebar-upload-icon">
              <PlusIcon />
            </span>
            {!isSidebarCollapsed && <span>{text.newUpload}</span>}
          </button>
        ) : (
          <button
            type="button"
            className={`sidebar-upload-btn queue-mode ${isSidebarCollapsed ? "icon-only" : ""}`}
            onClick={() => setActiveTab("moderation")}
            title={isAdminRole ? text.adminQueue : text.moderationQueue}
          >
            <span className="sidebar-upload-icon">
              <PlusIcon />
            </span>
            {!isSidebarCollapsed && <span>{isAdminRole ? text.adminQueue : text.moderationQueue}</span>}
          </button>
        )}

        <nav className="menu sidebar-menu" aria-label="Sidebar navigation">
          {menuItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`menu-item sidebar-menu-item ${
                normalizedActiveTab === item.key ? "active" : ""
              } ${isSidebarCollapsed ? "icon-only" : ""}`}
              onClick={() => setActiveTab(item.key)}
              title={item.label}
            >
              <span className="sidebar-menu-icon">{item.icon}</span>
              {!isSidebarCollapsed && <span>{item.label}</span>}
              {Number(item.badgeCount || 0) > 0 && (
                <span className="sidebar-menu-badge" aria-hidden="true">
                  {Number(item.badgeCount) > 10 ? "10+" : Number(item.badgeCount)}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {!isSidebarCollapsed && (
        <p className="sidebar-bottom-note">
          {text.sidebarNote}
        </p>
      )}
    </aside>
  );
}

export default Sidebar;
