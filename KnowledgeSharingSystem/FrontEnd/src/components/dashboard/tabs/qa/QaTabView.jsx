import { useMemo, useState } from "react";

function formatSessionTime(value) {
  if (!value) return "Just now";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "Just now";
  }
}

function getInitials(name) {
  const clean = String(name || "").trim();
  if (!clean) return "U";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

function QaTabView(props) {
  const { model, controller } = props;
  const [draftMessage, setDraftMessage] = useState("");
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isClosingSession, setIsClosingSession] = useState(false);
  const [isRating, setIsRating] = useState(false);
  const [openingSessionId, setOpeningSessionId] = useState(0);
  const [inlineNotice, setInlineNotice] = useState("");

  const activeSession = model.activeSession;
  const isSessionRated = Boolean(
    activeSession &&
      (activeSession.hasRatedByCurrentUser ||
        model.ratedSessionMap?.[Number(activeSession.sessionId)]),
  );
  const totalSessions = Array.isArray(model.sessions) ? model.sessions.length : 0;
  const openSessions = Array.isArray(model.sessions)
    ? model.sessions.filter((session) => session.status === "open").length
    : 0;
  const closedSessions = Math.max(0, totalSessions - openSessions);

  const canRateSession = useMemo(() => {
    if (!activeSession) return false;
    const isAsker = Number(activeSession.askerUserId) === Number(model.currentUserId);
    return activeSession.status === "closed" && isAsker && !isSessionRated;
  }, [activeSession, model.currentUserId, isSessionRated]);

  const submitMessage = async () => {
    const normalized = draftMessage.trim();
    if (!normalized || !activeSession?.sessionId || isSending) return;
    setIsSending(true);
    setInlineNotice("");
    try {
      await controller.onSendMessage(activeSession.sessionId, normalized);
      setDraftMessage("");
      setInlineNotice("Message sent.");
    } finally {
      setIsSending(false);
    }
  };

  const handleComposerKeyDown = async (event) => {
    if (event.key !== "Enter") return;
    if (event.shiftKey) return;
    if (event.nativeEvent?.isComposing) return;
    event.preventDefault();
    await submitMessage();
  };

  const submitRating = async () => {
    if (!activeSession?.sessionId || isRating) return;
    setIsRating(true);
    setInlineNotice("");
    try {
      await controller.onRateSession(activeSession.sessionId, ratingStars, ratingFeedback);
      setRatingStars(5);
      setRatingFeedback("");
      setInlineNotice("Rating submitted successfully.");
    } finally {
      setIsRating(false);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setInlineNotice("");
    try {
      await controller.onRefresh();
      setInlineNotice("Session list updated.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenSession = async (session) => {
    const sessionId = Number(session?.sessionId || 0);
    if (!sessionId || openingSessionId === sessionId) return;
    setOpeningSessionId(sessionId);
    setInlineNotice("");
    try {
      await controller.onOpenSession(session);
    } finally {
      setOpeningSessionId(0);
    }
  };

  const handleCloseSession = async () => {
    const sessionId = Number(activeSession?.sessionId || 0);
    if (!sessionId || isClosingSession) return;
    setIsClosingSession(true);
    setInlineNotice("");
    try {
      await controller.onCloseSession(sessionId);
      setInlineNotice("This Q&A session is now closed.");
    } finally {
      setIsClosingSession(false);
    }
  };

  return (
    <section className="qa-page panel">
      <div className="qa-page-head">
        <div>
          <h2>
            Q&A sessions{" "}
            {model.unreadCount > 0 && (
              <span className="qa-unread-pill" aria-label={`${model.unreadCount} unread Q&A notifications`}>
                {model.unreadCount}
              </span>
            )}
          </h2>
          <p className="hint">
            Ask document owners questions, continue private discussions, and rate helpful support.
          </p>
        </div>
        <div className="qa-head-actions">
          <div className="qa-mini-stats" aria-hidden="true">
            <span>{totalSessions} total</span>
            <span>{openSessions} open</span>
            <span>{closedSessions} closed</span>
          </div>
          <select
            value={model.filter}
            onChange={(e) => controller.onChangeFilter(e.target.value)}
            aria-label="Filter Q&A sessions"
          >
            <option value="all">All sessions</option>
            <option value="open">Open only</option>
            <option value="closed">Closed only</option>
          </select>
          <button type="button" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="qa-layout">
        <aside className="qa-session-list">
          {isRefreshing && (
            <div className="qa-list-loading">
              <span className="qa-spinner" aria-hidden="true" />
              <p>Updating session list...</p>
            </div>
          )}
          {model.sessions.length === 0 ? (
            <p className="hint">No Q&A sessions yet. Open a document and ask the author a question.</p>
          ) : (
            model.sessions.map((session) => {
              const isActive = Number(activeSession?.sessionId) === Number(session.sessionId);
              const isOpening = Number(openingSessionId) === Number(session.sessionId);
              const unreadCount = Number(model.unreadSessionMap?.[session.sessionId] || 0);
              const isUnread = unreadCount > 0 && !isActive;
              const counterpart =
                Number(session.askerUserId) === Number(model.currentUserId)
                  ? session.ownerName
                  : session.askerName;

              return (
                <button
                  key={session.sessionId}
                  type="button"
                  className={`qa-session-card ${isActive ? "active" : ""} ${isUnread ? "unread" : ""}`}
                  onClick={() => handleOpenSession(session)}
                  disabled={isOpening}
                >
                  <div className="qa-session-card-top">
                    <strong>{session.documentTitle}</strong>
                    <div className="qa-session-top-right">
                      <span className={`qa-status-badge ${session.status}`}>{session.status}</span>
                      {isUnread && <span className="qa-session-unread-dot" aria-hidden="true" />}
                    </div>
                  </div>
                  <p className="qa-counterpart">With {counterpart || "NeuShare member"}</p>
                  <p className="qa-snippet">{session.latestMessage || "No messages yet."}</p>
                  <small>
                    {session.totalMessages || 0} messages •{" "}
                    {formatSessionTime(session.latestMessageAt || session.updatedAt || session.createdAt)}
                  </small>
                  {isOpening && <span className="qa-card-opening">Opening...</span>}
                </button>
              );
            })
          )}
        </aside>

        <div className="qa-chat-panel">
          {!activeSession ? (
            <div className="qa-empty-state">
              <h3>Select a session</h3>
              <p>Choose a Q&A session from the left to see the conversation.</p>
            </div>
          ) : (
            <>
              <div className="qa-chat-head">
                <div>
                  <h3>{activeSession.documentTitle}</h3>
                  <p>
                    Asker: {activeSession.askerName} • Owner: {activeSession.ownerName}
                  </p>
                </div>
                <div className="qa-chat-head-actions">
                  <span className={`qa-status-badge ${activeSession.status}`}>{activeSession.status}</span>
                  {activeSession.status === "open" && (
                    <button
                      type="button"
                      className="danger-ghost"
                      onClick={handleCloseSession}
                      disabled={isClosingSession}
                    >
                      {isClosingSession ? "Closing..." : "Close session"}
                    </button>
                  )}
                </div>
              </div>

              {inlineNotice && <div className="qa-inline-notice">{inlineNotice}</div>}

              <div className="qa-message-list">
                {model.messages.length === 0 ? (
                  <div className="qa-message-empty">
                    <h4>No messages yet</h4>
                    <p>Start the conversation with a clear question to get faster support.</p>
                  </div>
                ) : (
                  model.messages.map((message) => {
                    const mine = Number(message.senderUserId) === Number(model.currentUserId);
                    const senderName = message.senderName || "User";
                    return (
                      <div key={message.messageId} className={`qa-message-row ${mine ? "mine" : "theirs"}`}>
                        {!mine && (
                          <span className="qa-message-avatar" aria-hidden="true">
                            {getInitials(senderName)}
                          </span>
                        )}
                        <article className={`qa-message-bubble ${mine ? "mine" : "theirs"}`}>
                          <strong>{senderName}</strong>
                          <p>{message.message}</p>
                          <small>{formatSessionTime(message.createdAt)}</small>
                        </article>
                        {mine && (
                          <span className="qa-message-avatar mine" aria-hidden="true">
                            {getInitials(senderName)}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {activeSession.status === "open" ? (
                <div className="qa-composer">
                  <div className="qa-composer-row">
                    <textarea
                      rows={2}
                      value={draftMessage}
                      onChange={(e) => setDraftMessage(e.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      placeholder="Write your message..."
                      disabled={isSending}
                    />
                    <button
                      type="button"
                      className="qa-send-btn"
                      disabled={!draftMessage.trim() || isSending}
                      onClick={submitMessage}
                      aria-label="Send message"
                      title="Send message"
                    >
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M21 3L10 14"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M21 3L14 21L10 14L3 10L21 3Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                  <button
                    type="button"
                    className="primary-btn qa-send-mobile"
                    disabled={!draftMessage.trim() || isSending}
                    onClick={submitMessage}
                  >
                    {isSending ? "Sending..." : "Send message"}
                  </button>
                </div>
              ) : (
                <div className="qa-closed-note">
                  <p>This Q&A session is closed.</p>
                  {isSessionRated && <p>Your rating was submitted for this session.</p>}
                </div>
              )}

              {canRateSession && (
                <div className="qa-rating-card">
                  <h4>Rate this session</h4>
                  <div className="qa-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={star <= ratingStars ? "active" : ""}
                        onClick={() => setRatingStars(star)}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={3}
                    value={ratingFeedback}
                    onChange={(e) => setRatingFeedback(e.target.value)}
                    placeholder="Share brief feedback for this Q&A session..."
                    disabled={isRating}
                  />
                  <button type="button" className="primary-btn" onClick={submitRating} disabled={isRating}>
                    {isRating ? "Submitting..." : "Submit rating"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default QaTabView;
