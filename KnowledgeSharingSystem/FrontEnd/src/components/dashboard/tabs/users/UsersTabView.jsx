function UsersTabView(props) {
  const { model, controller } = props;

  return (
    <section className="panel">
      <h2>User role management</h2>
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
                    disabled={!canPromote}
                    onClick={() => controller.onPromote(u.userId)}
                  >
                    Promote moderator
                  </button>
                  <button
                    type="button"
                    disabled={!canDemote}
                    onClick={() => controller.onDemote(u.userId)}
                  >
                    Demote user
                  </button>
                  <button
                    type="button"
                    disabled={!canLockUnlock || !u.isActive}
                    onClick={() => controller.onLock(u.userId)}
                  >
                    Lock
                  </button>
                  <button
                    type="button"
                    disabled={!canLockUnlock || !!u.isActive}
                    onClick={() => controller.onUnlock(u.userId)}
                  >
                    Unlock
                  </button>
                  <button
                    type="button"
                    className="danger-btn"
                    disabled={!canDelete}
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
