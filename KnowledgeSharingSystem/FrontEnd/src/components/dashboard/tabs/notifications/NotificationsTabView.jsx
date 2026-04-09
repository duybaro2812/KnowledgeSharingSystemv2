import { useMemo, useState } from "react";

function NotificationsTabView(props) {
  const { model, controller } = props;
  const [activeFilter, setActiveFilter] = useState("all");
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const visibleNotifications = useMemo(() => {
    const source = Array.isArray(model.notifications) ? model.notifications : [];
    if (activeFilter === "all") return source;
    if (activeFilter === "unread") return source.filter((item) => !item.isRead);
    return source.filter((item) => item.kindKey === activeFilter);
  }, [activeFilter, model.notifications]);

  const handleMarkAllRead = async () => {
    if (isMarkingAll || !controller.onMarkAllRead) return;
    setIsMarkingAll(true);
    try {
      await controller.onMarkAllRead();
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <section className="panel notifications-page">
      <div className="notifications-head">
        <div>
          <h2>Notifications</h2>
          <p>Follow approvals, moderation updates, comments, Q&A, plagiarism checks, and points.</p>
        </div>
        <div className="notifications-head-actions">
          <span className="notifications-unread-pill">{model.unreadCount} unread</span>
          <button type="button" onClick={handleMarkAllRead} disabled={isMarkingAll || model.unreadCount === 0}>
            {isMarkingAll ? "Marking..." : "Mark all read"}
          </button>
        </div>
      </div>

      <div className="notifications-filter-row">
        {model.categories.map((item) => (
          <button
            key={item.key}
            type="button"
            className={activeFilter === item.key ? "active" : ""}
            onClick={() => setActiveFilter(item.key)}
          >
            {item.label} <span>{item.count}</span>
          </button>
        ))}
      </div>

      <div className="notifications-list">
        {visibleNotifications.length === 0 && (
          <div className="notifications-empty-state">
            <h3>No notifications in this filter</h3>
            <p>Try switching filter or come back after new activity.</p>
          </div>
        )}

        {visibleNotifications.map((n) => (
          <article
            key={n.notificationId}
            className={`notifications-item ${n.isRead ? "read" : "unread"}`}
            onClick={() => controller.onOpen && controller.onOpen(n)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                controller.onOpen && controller.onOpen(n);
              }
            }}
          >
            <div className="notifications-item-icon" aria-hidden="true">
              {n.kindIcon || "🔔"}
            </div>
            <div className="notifications-item-main">
              <div className="notifications-item-top">
                <strong>{n.title}</strong>
                <span className="notifications-kind-chip">{n.kindLabel}</span>
              </div>
              <p>{n.message}</p>
              <small>{new Date(n.createdAt).toLocaleString()}</small>
            </div>
            <div className="notifications-item-actions">
              {!n.isRead && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    controller.onMarkRead && controller.onMarkRead(n.notificationId);
                  }}
                >
                  Mark read
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default NotificationsTabView;
