function ProfileTabView(props) {
  const { model } = props;
  const user = model.user || {};

  return (
    <section className="panel">
      <h2>Profile</h2>
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
          <b>{model.stats.followers}</b>
          <span>Followers</span>
        </div>
        <div>
          <b>{model.stats.uploads}</b>
          <span>Uploads</span>
        </div>
        <div>
          <b>{model.stats.upvotes}</b>
          <span>Upvotes</span>
        </div>
      </div>
    </section>
  );
}

export default ProfileTabView;
