const formatPoint = (value) => {
  const num = Number(value || 0);
  if (num > 0) return `+${num}`;
  return `${num}`;
};

function PointsTabView(props) {
  const { model, controller } = props;
  const summary = model.summary || {};

  return (
    <section className="panel">
      <h2>Points</h2>
      <div className="action-row" style={{ marginBottom: 12 }}>
        <button type="button" disabled={model.isBusy} onClick={controller.onRefresh}>
          {model.isBusy ? "Refreshing..." : "Refresh points"}
        </button>
      </div>
      {model.isBusy && <p className="hint">Updating point summary and events...</p>}

      <div className="stats profile-page-stats">
        <div>
          <b>{Number(summary.currentPoints || 0)}</b>
          <span>Current</span>
        </div>
        <div>
          <b>{Number(summary.totalEarned || 0)}</b>
          <span>Total earned</span>
        </div>
        <div>
          <b>{Number(summary.totalSpent || 0)}</b>
          <span>Total spent</span>
        </div>
        <div>
          <b>{Number(summary.pendingEvents || 0)}</b>
          <span>Pending events</span>
        </div>
      </div>

      {model.policy && (
        <div className="panel" style={{ marginTop: 12 }}>
          <h3>Point policy</h3>
          <p>
            Preview threshold: <b>{model.policy.unlock?.previewThreshold}</b> | Full view threshold:{" "}
            <b>{model.policy.unlock?.fullViewThreshold}</b>
          </p>
          <p>
            Download cost: <b>{model.policy.download?.standardCost}</b> points (standard),{" "}
            <b>{model.policy.download?.priorityCost}</b> points when points ≥{" "}
            <b>{model.policy.download?.priorityThreshold}</b>.
          </p>
        </div>
      )}

      <div className="panel" style={{ marginTop: 12 }}>
        <h3>Recent point events</h3>
        {model.events.length === 0 ? (
          <p className="hint">No point events yet.</p>
        ) : (
          <ul className="list">
            {model.events.map((event) => (
              <li key={`event-${event.eventId}`}>
                <span>
                  #{event.eventId} - {event.eventType} - <b>{event.status}</b> - suggested:{" "}
                  {formatPoint(event.points)}
                  {event.documentTitle ? ` - doc: ${event.documentTitle}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel" style={{ marginTop: 12 }}>
        <h3>Point transactions</h3>
        {model.transactions.length === 0 ? (
          <p className="hint">No point transactions yet.</p>
        ) : (
          <ul className="list">
            {model.transactions.map((tx) => (
              <li key={`tx-${tx.transactionId}`}>
                <span>
                  #{tx.transactionId} - {tx.transactionType} - <b>{formatPoint(tx.points)}</b>
                  {tx.documentTitle ? ` - doc: ${tx.documentTitle}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default PointsTabView;
