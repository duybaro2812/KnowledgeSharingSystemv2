function SettingsTabView(props) {
  const { model } = props;

  return (
    <section className="panel">
      <h2>Settings</h2>
      <p className="hint">Settings UI placeholder. We can connect profile/update/password options next.</p>
      <div className="settings-list">
        <div className="settings-item">
          <b>Account</b>
          <span>{model.user?.email || "-"}</span>
        </div>
        <div className="settings-item">
          <b>Language</b>
          <span>Vietnamese (default)</span>
        </div>
        <div className="settings-item">
          <b>Notifications</b>
          <span>Enabled</span>
        </div>
      </div>
    </section>
  );
}

export default SettingsTabView;
