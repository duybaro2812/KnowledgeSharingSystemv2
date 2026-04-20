function ProfileTabView(props) {
  const { model } = props;
  const user = model.user || {};

  return (
    <section className="panel">
      <h2>Profile</h2>
      {model.isBusy && <p className="hint">Refreshing profile data...</p>}
      <div className="profile-page">
        <div className="profile-page-avatar">{(user?.name || "U").slice(0, 1).toUpperCase()}</div>
        <div className="profile-page-info">
          <p><b>Name:</b> {user?.name || "-"}</p>
          <p><b>Username:</b> {user?.username || "-"}</p>
          <p><b>Email:</b> {user?.email || "-"}</p>
          <p><b>Role:</b> {user?.role || "-"}</p>
          <p><b>Points:</b> {Number(user?.points || 0)}</p>
        </div>
      </div>
      <div className="stats profile-page-stats">
        <div>
          <b>{model.stats.uploads || 0}</b>
          <span>Upload</span>
        </div>
        <div>
          <b>{model.stats.pending || 0}</b>
          <span>Pending</span>
        </div>
        <div>
          <b>{model.stats.upvotes || 0}</b>
          <span>Upvote</span>
        </div>
      </div>
    </section>
  );
}

export default ProfileTabView;
