import { useEffect, useMemo, useState } from "react";

function AdminIcon({ name }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    focusable: "false",
  };
  const paths = {
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    docs: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h6" />
      </>
    ),
    award: (
      <>
        <circle cx="12" cy="8" r="6" />
        <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
      </>
    ),
    activity: (
      <>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </>
    ),
    shield: (
      <>
        <path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    lock: (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    ),
    unlock: (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="m19 6-1 14H6L5 6" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </>
    ),
    logs: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 14h4" />
        <path d="M7 10h8" />
        <path d="M7 6h10" />
      </>
    ),
  };

  return (
    <svg className="admin-icon" {...common}>
      {paths[name] || paths.activity}
    </svg>
  );
}

const getInitials = (value) => {
  const words = String(value || "U").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "U";
};

const normalizePolicyDrafts = (policy) =>
  (Array.isArray(policy?.settings) ? policy.settings : []).map((setting) => ({
    key: String(setting.key || ""),
    category: String(setting.category || "custom"),
    label: String(setting.label || setting.key || ""),
    description: String(setting.description || ""),
    value: String(setting.value ?? 0),
    min: Number(setting.min ?? -100000),
    max: Number(setting.max ?? 100000),
    isCustom: Boolean(setting.isCustom || String(setting.key || "").startsWith("custom.")),
  }));

const makeCustomPolicyKey = (value) => {
  const slug = String(value || "custom_rule")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return `custom.${slug || "custom_rule"}`;
};

function UsersTabView(props) {
  const { model, controller } = props;
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [policyDrafts, setPolicyDrafts] = useState(() => normalizePolicyDrafts(model.pointPolicy));
  const [newPolicyRule, setNewPolicyRule] = useState({
    key: "",
    label: "",
    value: "0",
    description: "",
  });

  useEffect(() => {
    setPolicyDrafts(normalizePolicyDrafts(model.pointPolicy));
  }, [model.pointPolicy]);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return model.users.filter((user) => {
      const role = String(user.role || "").toLowerCase();
      const matchesRole = roleFilter === "all" || role === roleFilter;
      const haystack = [user.name, user.username, user.email, user.role, user.userId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesRole && (!keyword || haystack.includes(keyword));
    });
  }, [model.users, roleFilter, search]);

  const statCards = [
    { label: "Total Users", value: model.adminDashboard.totalUsers, icon: "users", tone: "blue", trend: "+ platform" },
    { label: "Documents", value: model.adminDashboard.totalDocuments, icon: "docs", tone: "teal", trend: "library" },
    { label: "Pending Docs", value: model.adminDashboard.pendingDocuments, icon: "activity", tone: "amber", trend: "review" },
    { label: "Downloads", value: model.adminDashboard.totalDownloads, icon: "award", tone: "indigo", trend: "usage" },
  ];

  const groupedPolicyDrafts = useMemo(
    () =>
      policyDrafts.reduce((acc, setting) => {
        const category = setting.category || "custom";
        if (!acc[category]) acc[category] = [];
        acc[category].push(setting);
        return acc;
      }, {}),
    [policyDrafts],
  );

  const updatePolicyDraft = (key, field, value) => {
    setPolicyDrafts((current) =>
      current.map((setting) => (setting.key === key ? { ...setting, [field]: value } : setting)),
    );
  };

  const handleAddCustomPolicyRule = () => {
    const label = newPolicyRule.label.trim();
    const keyInput = newPolicyRule.key.trim();
    const key = keyInput ? (keyInput.startsWith("custom.") ? keyInput : `custom.${keyInput}`) : makeCustomPolicyKey(label);
    if (!label || !/^custom\.[a-zA-Z0-9_.-]{1,72}$/.test(key)) {
      window.alert("Custom rule needs a label and a key like custom.my_rule.");
      return;
    }
    if (policyDrafts.some((setting) => setting.key === key)) {
      window.alert("This policy key already exists.");
      return;
    }
    const value = Number(newPolicyRule.value);
    if (!Number.isInteger(value)) {
      window.alert("Custom rule value must be an integer.");
      return;
    }
    setPolicyDrafts((current) => [
      ...current,
      {
        key,
        category: "custom",
        label,
        description: newPolicyRule.description.trim(),
        value: String(value),
        min: -100000,
        max: 100000,
        isCustom: true,
      },
    ]);
    setNewPolicyRule({ key: "", label: "", value: "0", description: "" });
  };

  const handleSavePointPolicy = async () => {
    const settings = policyDrafts.map((setting) => ({
      key: setting.key,
      label: setting.label,
      description: setting.description,
      value: Number(setting.value),
    }));
    const invalid = settings.find((setting) => !Number.isInteger(setting.value));
    if (invalid) {
      window.alert(`${invalid.label || invalid.key} must be an integer.`);
      return;
    }
    await controller.onUpdatePointPolicy(settings);
  };

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <div>
          <h2>Admin Dashboard</h2>
          <p>Full platform overview and management.</p>
        </div>
        <button type="button" className="admin-primary-btn" disabled={model.isBusy} onClick={() => controller.onRefreshOverview()}>
          Refresh overview
        </button>
      </div>

      {model.isBusy && <p className="hint">Processing user action...</p>}

      <div className="admin-stat-grid">
        {statCards.map((item) => (
          <article key={item.label} className="admin-stat-card">
            <div className="admin-stat-top">
              <span className={`admin-stat-icon ${item.tone}`}>
                <AdminIcon name={item.icon} />
              </span>
              <small>{item.trend}</small>
            </div>
            <strong>{Number(item.value || 0).toLocaleString()}</strong>
            <span>{item.label}</span>
          </article>
        ))}
      </div>

      <div className="admin-dashboard-grid">
        <section className="admin-panel-card wide">
          <h3>
            <AdminIcon name="activity" />
            Document Status Breakdown
          </h3>
          <div className="admin-status-grid">
            <div className="approved">
              <strong>{Number(model.adminDashboard.approvedDocuments || 0)}</strong>
              <span>Approved</span>
            </div>
            <div className="pending">
              <strong>{Number(model.adminDashboard.pendingDocuments || 0)}</strong>
              <span>Pending</span>
            </div>
            <div className="rejected">
              <strong>{Number(model.adminDashboard.rejectedDocuments || 0)}</strong>
              <span>Rejected</span>
            </div>
          </div>
        </section>

        <section className="admin-panel-card">
          <h3>
            <AdminIcon name="users" />
            User Roles
          </h3>
          <div className="admin-role-list">
            {["admin", "moderator", "user"].map((role) => (
              <div key={role}>
                <span className={`admin-role-dot ${role}`} />
                <span>{role}</span>
                <strong>{Number(model.adminDashboard.roleBreakdown?.[role] || 0)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="admin-table-card">
        <div className="admin-table-head">
          <div>
            <h3>
              <AdminIcon name="users" />
              User Management
            </h3>
            <p>{model.users.length} registered users</p>
          </div>
        </div>

        <div className="admin-filter-row">
          <label className="admin-search">
            <AdminIcon name="search" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or email..." />
          </label>
          <div className="admin-segmented">
            {["all", "user", "moderator", "admin"].map((role) => (
              <button key={role} type="button" className={roleFilter === role ? "active" : ""} onClick={() => setRoleFilter(role)}>
                {role}
              </button>
            ))}
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <p className="hint">No users found.</p>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Username</th>
                  <th>Points</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isSelf = Number(user.userId) === model.currentUserId;
                  const isAdmin = String(user.role || "").toLowerCase() === "admin";
                  const canPromote = !isSelf && !isAdmin && user.role !== "moderator";
                  const canDemote = !isSelf && !isAdmin && user.role === "moderator";
                  const canLockUnlock = !isSelf && !isAdmin;
                  const canDelete = !isSelf && !isAdmin;

                  return (
                    <tr key={user.userId} className={!user.isActive ? "is-muted" : ""}>
                      <td>
                        <div className="admin-user-cell">
                          <span className="admin-avatar">{getInitials(user.name || user.username)}</span>
                          <div>
                            <strong>{user.name || user.username}</strong>
                            <small>{user.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`admin-role-pill ${String(user.role || "user").toLowerCase()}`}>{user.role}</span>
                      </td>
                      <td>{user.username || `#${user.userId}`}</td>
                      <td className="center-cell">
                        <strong>{Number(user.points || 0).toLocaleString()}</strong>
                      </td>
                      <td className="center-cell">
                        <span className={`admin-status-pill ${user.isActive ? "active" : "locked"}`}>
                          {user.isActive ? "Active" : "Locked"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-icon-actions">
                          <button type="button" disabled={!canPromote || model.isBusy} onClick={() => controller.onPromote(user.userId)} title="Promote moderator">
                            <AdminIcon name="shield" />
                          </button>
                          <button type="button" disabled={!canDemote || model.isBusy} onClick={() => controller.onDemote(user.userId)} title="Demote user">
                            <AdminIcon name="users" />
                          </button>
                          <button
                            type="button"
                            disabled={!canLockUnlock || model.isBusy}
                            onClick={() => (user.isActive ? controller.onLock(user.userId) : controller.onUnlock(user.userId))}
                            title={user.isActive ? "Lock" : "Unlock"}
                          >
                            <AdminIcon name={user.isActive ? "lock" : "unlock"} />
                          </button>
                          <button
                            type="button"
                            className="danger"
                            disabled={!canDelete || model.isBusy}
                            onClick={() => {
                              const ok = window.confirm(`Delete user #${user.userId} (${user.username})? This will soft-delete the account.`);
                              if (ok) controller.onDelete(user.userId);
                            }}
                            title="Delete"
                          >
                            <AdminIcon name="trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-table-card compact">
        <div className="admin-table-head">
          <div>
            <h3>
              <AdminIcon name="logs" />
              Audit Logs
            </h3>
            <p>Recent admin and moderation actions.</p>
          </div>
        </div>
        {model.auditLogs.length === 0 ? (
          <p className="hint">No audit logs loaded.</p>
        ) : (
          <div className="admin-log-list">
            {model.auditLogs.slice(0, 8).map((log) => (
              <article key={`${log.source}-${log.sourceId}`}>
                <span className="admin-log-icon">
                  <AdminIcon name="activity" />
                </span>
                <div>
                  <strong>{log.action || log.source}</strong>
                  <p>{log.targetName || log.note || "No details"}</p>
                </div>
                <time>{log.createdAt ? new Date(log.createdAt).toLocaleString() : "N/A"}</time>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export default UsersTabView;
