function NotificationsTabView(props) {
  const { model, controller } = props;

  return (
    <section className="panel">
      <h2>Notifications</h2>
      <ul className="list">
        {model.notifications.map((n) => (
          <li key={n.notificationId}>
            <div>
              <b>{n.title}</b>
              <p>{n.message}</p>
            </div>
            {!n.isRead && (
              <button onClick={() => controller.onMarkRead(n.notificationId)}>
                Mark read
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default NotificationsTabView;
