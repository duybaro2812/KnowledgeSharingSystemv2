function Sidebar(props) {
  const { user, stats, activeTab, setActiveTab, clearSession } = props;

  return (
    <aside className="sidebar">
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

      <button
        className="primary-btn sidebar-new-btn"
        onClick={() => setActiveTab("upload")}
      >
        + New
      </button>

      <div className="menu">
        <button
          className={`menu-item ${activeTab === "home" ? "active" : ""}`}
          onClick={() => setActiveTab("home")}
        >
          Home
        </button>
        <button
          className={`menu-item ${activeTab === "library" ? "active" : ""}`}
          onClick={() => setActiveTab("library")}
        >
          My library
        </button>
        <button className="menu-item" onClick={() => setActiveTab("home")}>
          Recent
        </button>
      </div>

      <button className="ghost-btn" onClick={clearSession}>
        Logout
      </button>
    </aside>
  );
}

export default Sidebar;
