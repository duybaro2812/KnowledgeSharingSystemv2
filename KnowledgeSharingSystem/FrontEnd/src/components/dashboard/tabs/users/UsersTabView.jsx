function UsersTabView(props) {
  const { model, controller } = props;

  return (
    <section className="panel">
      <div className="moderation-header-row">
        <h2>Admin workspace</h2>
        <button type="button" disabled={model.isBusy} onClick={() => controller.onRefreshOverview()}>
          Refresh overview
        </button>
      </div>
      {model.isBusy && <p className="hint">Processing user action...</p>}

      <div className="moderation-dashboard-cards">
        <article className="moderation-dashboard-card">
          <span>Total users</span>
          <b>{Number(model.adminDashboard?.totalUsers || 0)}</b>
        </article>
        <article className="moderation-dashboard-card">
          <span>Active users</span>
          <b>{Number(model.adminDashboard?.activeUsers || 0)}</b>
        </article>
        <article className="moderation-dashboard-card">
          <span>Locked users</span>
          <b>{Number(model.adminDashboard?.lockedUsers || 0)}</b>
        </article>
        <article className="moderation-dashboard-card">
          <span>Total documents</span>
          <b>{Number(model.adminDashboard?.totalDocuments || 0)}</b>
        </article>
        <article className="moderation-dashboard-card">
          <span>Pending documents</span>
          <b>{Number(model.adminDashboard?.pendingDocuments || 0)}</b>
        </article>
        <article className="moderation-dashboard-card">
          <span>Total downloads</span>
          <b>{Number(model.adminDashboard?.totalDownloads || 0)}</b>
        </article>
        <article className="moderation-dashboard-card">
          <span>Approved docs</span>
          <b>{Number(model.adminDashboard?.approvedDocuments || 0)}</b>
        </article>
        <article className="moderation-dashboard-card">
          <span>Rejected docs</span>
          <b>{Number(model.adminDashboard?.rejectedDocuments || 0)}</b>
        </article>
        <article className="moderation-dashboard-card">
          <span>Hidden docs</span>
          <b>{Number(model.adminDashboard?.hiddenDocuments || 0)}</b>
        </article>
      </div>

      <div className="moderation-subhead">
        <h3>User role breakdown</h3>
        <p>
          Admin: <b>{Number(model.adminDashboard?.roleBreakdown?.admin || 0)}</b> · Moderator:{" "}
          <b>{Number(model.adminDashboard?.roleBreakdown?.moderator || 0)}</b> · User:{" "}
          <b>{Number(model.adminDashboard?.roleBreakdown?.user || 0)}</b>
        </p>
      </div>

      <h3>User role management</h3>
      {model.users.length === 0 ? (
        <p className="hint">No users found.</p>
      ) : (
        <ul className="list">
          {model.users.map((u) => {
            const isSelf = Number(u.userId) === model.currentUserId;
            const isAdmin = u.role === "admin";
            const canPromote = !isSelf && !isAdmin && u.role !== "moderator";
            const canDemote = !isSelf && !isAdmin && u.role === "moderator";
            const canLockUnlock = !isSelf && !isAdmin;
            const canDelete = !isSelf && !isAdmin;

            return (
              <li key={u.userId}>
                <span>
                  #{u.userId} - {u.name} ({u.username}) - {u.email} - role: <b>{u.role}</b> - status:{" "}
                  <b>{u.isActive ? "active" : "locked"}</b>
                </span>
                <span className="list-actions">
                  <button
                    type="button"
                    disabled={!canPromote || model.isBusy}
                    onClick={() => controller.onPromote(u.userId)}
                  >
                    Promote moderator
                  </button>
                  <button
                    type="button"
                    disabled={!canDemote || model.isBusy}
                    onClick={() => controller.onDemote(u.userId)}
                  >
                    Demote user
                  </button>
                  <button
                    type="button"
                    disabled={!canLockUnlock || !u.isActive || model.isBusy}
                    onClick={() => controller.onLock(u.userId)}
                  >
                    Lock
                  </button>
                  <button
                    type="button"
                    disabled={!canLockUnlock || !!u.isActive || model.isBusy}
                    onClick={() => controller.onUnlock(u.userId)}
                  >
                    Unlock
                  </button>
                  <button
                    type="button"
                    className="danger-btn"
                    disabled={!canDelete || model.isBusy}
                    onClick={() => {
                      const ok = window.confirm(
                        `Delete user #${u.userId} (${u.username})? This will soft-delete the account.`,
                      );
                      if (ok) controller.onDelete(u.userId);
                    }}
                  >
                    Delete user
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

    </section>
  );
}

export default UsersTabView;
