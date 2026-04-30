const DEFAULT_PREVIEW_THRESHOLD = 30;
const DEFAULT_FULL_THRESHOLD = 40;

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const formatDate = (value) => {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "N/A";
  }
};

const formatSigned = (value) => {
  const numeric = toNumber(value);
  if (numeric > 0) return `+${numeric}`;
  return `${numeric}`;
};

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();

const EVENT_BACKED_TRANSACTION_TYPES = new Set([
  "answer_reward",
  "comment_reward",
  "hidden_knowledge_reward",
  "moderation_reward",
  "qa_rating_reward",
  "upload_reward",
  "upvote_reward",
]);

const EVENT_TYPES_BY_TRANSACTION_TYPE = {
  answer_reward: new Set(["answer_accepted"]),
  comment_reward: new Set(["comment_given", "comment_received"]),
  hidden_knowledge_reward: new Set(["hidden_knowledge_contribution"]),
  qa_rating_reward: new Set(["qa_session_rated"]),
  upload_reward: new Set(["upload_submitted", "upload_approved"]),
  upvote_reward: new Set(["upvote_received"]),
};

const composeModeratorDescription = (item) => {
  const note = normalizeText(item?.reviewNote || "");
  const moderator = normalizeText(item?.reviewedByName || "");
  const documentTitle = normalizeText(item?.documentTitle || "");

  if (note && documentTitle && moderator) {
    return `${note} - ${documentTitle} (Moderator: ${moderator})`;
  }
  if (note && documentTitle) {
    return `${note} - ${documentTitle}`;
  }
  if (note) return note;
  if (documentTitle) return `Reviewed document: ${documentTitle}`;
  return "";
};

const composeTransactionDescription = (tx, relatedEvent) => {
  const transactionType = normalizeStatus(tx?.transactionType || "");
  const txDescription = normalizeText(tx?.description || "");
  const documentTitle = normalizeText(tx?.documentTitle || "");
  const isEventBackedTransaction = EVENT_BACKED_TRANSACTION_TYPES.has(transactionType);

  if (isEventBackedTransaction) {
    const eventDescription = composeModeratorDescription(relatedEvent || {});
    if (eventDescription) return eventDescription;
  }

  if (transactionType === "penalty" && txDescription) {
    const readablePenalty = txDescription.replace(
      /^Penalty for deleted comment #(\d+):\s*/i,
      "Xoa binh luan #$1: ",
    );
    return documentTitle ? `${readablePenalty} - ${documentTitle}` : readablePenalty;
  }

  if (txDescription && documentTitle) return `${txDescription} - ${documentTitle}`;
  if (txDescription) return txDescription;
  if (documentTitle) return `Point transaction for document: ${documentTitle}`;
  return normalizeText(tx?.transactionType || "Transaction");
};

function PointsTabView(props) {
  const { model, controller } = props;
  const summary = model.summary || {};
  const currentPoints = toNumber(summary.currentPoints);
  const previewThreshold = toNumber(model.policy?.unlock?.previewThreshold, DEFAULT_PREVIEW_THRESHOLD);
  const fullThreshold = toNumber(model.policy?.unlock?.fullViewThreshold, DEFAULT_FULL_THRESHOLD);

  const tiers = [
    {
      key: "starter",
      min: 0,
      max: Math.max(0, previewThreshold - 1),
      label: "Starter",
      desc: "Comment, reply, ask Q&A. Document viewer remains locked.",
    },
    {
      key: "reader",
      min: previewThreshold,
      max: Math.max(previewThreshold, fullThreshold - 1),
      label: "Reader",
      desc: "View full documents. Download is still locked.",
    },
    {
      key: "full",
      min: fullThreshold,
      max: Number.POSITIVE_INFINITY,
      label: "Full Access",
      desc: "View and download documents. Downloads consume points.",
    },
  ];

  const currentTier =
    tiers.find((tier) => currentPoints >= tier.min && currentPoints <= tier.max) || tiers[0];
  const nextTier = tiers.find((tier) => currentPoints < tier.min) || null;
  const progressDenominator = Math.max(1, nextTier ? nextTier.min : fullThreshold);
  const progressValue = Math.min(100, Math.round((currentPoints / progressDenominator) * 100));

  const earningWays = [
    { label: "Upload a document", pts: "+10" },
    { label: "Someone downloads your document", pts: "+5" },
    { label: "Receive enough upvotes", pts: "+2" },
    { label: "Receive 5-star Q&A rating", pts: "+3" },
    { label: "Download a document", pts: "-5" },
  ];

  const reviewedEvents = (Array.isArray(model.events) ? model.events : []).filter(
    (item) => normalizeStatus(item?.status) !== "pending",
  );

  const latestReviewedEventByTransactionKey = new Map();
  reviewedEvents.forEach((item) => {
    const documentId = Number(item?.documentId || 0);
    if (!Number.isInteger(documentId) || documentId <= 0) return;
    const eventType = normalizeStatus(item?.eventType || "");
    Object.entries(EVENT_TYPES_BY_TRANSACTION_TYPE).forEach(([transactionType, eventTypes]) => {
      if (!eventTypes.has(eventType)) return;
      const key = `${transactionType}:${documentId}`;
      if (!latestReviewedEventByTransactionKey.has(key)) {
        latestReviewedEventByTransactionKey.set(key, item);
      }
    });
  });

  const mergedHistory = [
    ...reviewedEvents.map((item) => ({
      id: `event-${item.eventId}`,
      description: composeModeratorDescription(item) || item.eventType || "Point event",
      type: "event",
      status: normalizeStatus(item.status || "pending"),
      points: toNumber(item.points),
      createdAt: item.createdAt,
      documentTitle: item.documentTitle || "",
    })),
    ...(Array.isArray(model.transactions) ? model.transactions : []).map((item) => ({
      relatedEvent:
        latestReviewedEventByTransactionKey.get(
          `${normalizeStatus(item?.transactionType || "")}:${Number(item?.documentId || 0)}`,
        ) || null,
      source: item,
      id: `tx-${item.transactionId}`,
      description: "",
      type: "transaction",
      status: "applied",
      points: toNumber(item.points),
      createdAt: item.createdAt,
      documentTitle: item.documentTitle || "",
    })),
  ]
    .map((item) =>
      item.type === "transaction"
        ? {
            ...item,
            description: composeTransactionDescription(item.source, item.relatedEvent),
          }
        : item,
    )
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
    .slice(0, 60);

  return (
    <section className="panel points-page">
      <div className="points-page-head">
        <div>
          <h2>Points & Access</h2>
          <p className="hint">Your points determine available access in NeuShare.</p>
        </div>
        <button type="button" disabled={model.isBusy} onClick={controller.onRefresh}>
          {model.isBusy ? "Refreshing..." : "Refresh points"}
        </button>
      </div>

      <article className="points-balance-card">
        <div className="points-balance-top">
          <div>
            <p>Your current balance</p>
            <h3>{currentPoints}</h3>
          </div>
          <span className="points-tier-pill">{currentTier.label}</span>
        </div>
        <p>{currentTier.desc}</p>
        <div className="points-progress-rail">
          <div className="points-progress-fill" style={{ width: `${progressValue}%` }} />
        </div>
        <small>
          {nextTier
            ? `Earn ${Math.max(0, nextTier.min - currentPoints)} more points to unlock ${nextTier.label}.`
            : "You have unlocked full platform access."}
        </small>
      </article>

      <div className="points-tier-grid">
        {tiers.map((tier) => {
          const isCurrent = currentTier.key === tier.key;
          const isUnlocked = currentPoints >= tier.min;
          return (
            <article
              key={tier.key}
              className={`points-tier-card ${isCurrent ? "current" : ""} ${isUnlocked ? "unlocked" : "locked"}`}
            >
              <div className="points-tier-top">
                <strong>{tier.label}</strong>
                <span>
                  {tier.max === Number.POSITIVE_INFINITY ? `${tier.min}+` : `${tier.min}-${tier.max}`}
                </span>
              </div>
              <p>{tier.desc}</p>
            </article>
          );
        })}
      </div>

      <section className="points-earnings">
        <h3>How to earn points</h3>
        <div className="points-earning-grid">
          {earningWays.map((way) => (
            <article key={way.label} className="points-earning-card">
              <span>{way.label}</span>
              <b>{way.pts}</b>
            </article>
          ))}
        </div>
      </section>

      <section className="points-history">
        <h3>Transaction history</h3>
        {mergedHistory.length === 0 ? (
          <p className="hint">No point transactions yet.</p>
        ) : (
          <div className="points-table-wrap">
            <table className="points-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Points</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {mergedHistory.map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td>{item.type}</td>
                    <td>
                      <span className={`points-status-chip ${normalizeStatus(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className={toNumber(item.points) >= 0 ? "positive" : "negative"}>
                      {formatSigned(item.points)}
                    </td>
                    <td>{formatDate(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

export default PointsTabView;
