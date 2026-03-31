function Sidebar(props) {
  const { user, stats, activeTab, setActiveTab, clearSession } = props;
  const role = user?.role || "user";
  const isUserRole = role === "user";
  const isAdminRole = role === "admin";

  const menuItems = isUserRole
    ? [
        { key: "home", label: "Home" },
        { key: "library", label: "My library" },
        { key: "home", label: "Recent" },
      ]
    : [
        { key: "moderation", label: isAdminRole ? "Admin queue" : "Moderation queue" },
        ...(isAdminRole ? [{ key: "users", label: "Users" }] : []),
        { key: "notifications", label: "Notifications" },
        { key: "categories", label: "Categories" },
        { key: "home", label: "Home" },
      ];

  return (
    <aside className={`sidebar role-sidebar role-${role}`}>
      <div className="brand">NeoShare</div>
      <button
        type="button"
        className="profile profile-trigger"
        onClick={() => setActiveTab("profile")}
      >
        <div className="avatar">{(user?.name || "U").slice(0, 1).toUpperCase()}</div>
        <div>
          <div className="profile-name">{user?.name}</div>
          <div className="profile-role">{user?.role}</div>
        </div>
      </button>
      <div className="stats">
        <div>
          <b>{stats.followers}</b>
          <span>Followers</span>
        </div>
        <div>
          <b>{stats.uploads}</b>
          <span>Uploads</span>
        </div>
        <div>
          <b>{stats.upvotes}</b>
          <span>Upvotes</span>
        </div>
      </div>

      {isUserRole ? (
        <button className="primary-btn sidebar-new-btn" onClick={() => setActiveTab("upload")}>
          + New
        </button>
      ) : (
        <button
          className="primary-btn sidebar-new-btn queue-btn"
          onClick={() => setActiveTab("moderation")}
        >
          {isAdminRole ? "Open admin queue" : "Open moderation queue"}
        </button>
      )}

      <div className="menu">
        {menuItems.map((item, index) => (
          <button
            key={`${item.key}-${index}`}
            className={`menu-item ${activeTab === item.key ? "active" : ""}`}
            onClick={() => setActiveTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <button className="ghost-btn" onClick={clearSession}>
        Logout
      </button>
    </aside>
  );
}

export default Sidebar;
