import { useEffect, useMemo, useRef, useState } from "react";

function normalizeStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  return status === "closed" ? "closed" : "open";
}

function formatRelativeTime(value) {
  if (!value) return "N/A";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "N/A";
  const diff = Math.max(0, Date.now() - timestamp);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  if (diff < hourMs) return `${Math.max(1, Math.floor(diff / minuteMs))}m ago`;
  if (diff < dayMs) return `${Math.floor(diff / hourMs)}h ago`;
  return `${Math.floor(diff / dayMs)}d ago`;
}

function formatClock(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function getInitials(name) {
  const tokens = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return "NS";
  return tokens
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() || "")
    .join("");
}

function renderStars(totalFilled) {
  const filled = Math.max(0, Math.min(5, Number(totalFilled || 0)));
  return [1, 2, 3, 4, 5].map((index) => (
    <span
      key={index}
      className={`qa-star-icon ${index <= filled ? "filled" : ""}`}
      aria-hidden="true"
    >
      *
    </span>
  ));
}

function QaSessionCard({ session, isOwnerGroup, unreadCount, ratedValue, onOpen, disabled }) {
  const status = normalizeStatus(session?.status);
  const displayName = isOwnerGroup ? session?.askerName : session?.ownerName;
  const sessionId = Number(session?.sessionId || 0);
  const messageCount = Number(session?.totalMessages || 0);
  const ratingValue = Number(session?.rating || session?.stars || ratedValue || 0);
  const hasRated = Boolean(session?.hasRatedByCurrentUser || ratedValue);

  return (
    <button
      type="button"
      className={`qa-list-card ${status}`}
      onClick={() => onOpen(session)}
      disabled={disabled}
      aria-label={`Open Q&A session ${sessionId}`}
    >
      <div className="qa-list-card-row">
        <div className="qa-list-avatar">{getInitials(displayName)}</div>

        <div className="qa-list-main">
          <div className="qa-list-title-row">
            <strong>{displayName || "NeuShare member"}</strong>
            <span className={`qa-status-badge ${status}`}>{status}</span>
          </div>

          <p className="qa-list-document">{session?.documentTitle || "Untitled document"}</p>
          <p className="qa-list-card-message">
            {session?.latestMessage || "Open this session to read the full chat."}
          </p>
        </div>

        <div className="qa-list-right">
          {hasRated ? <div className="qa-list-rating">{renderStars(ratingValue || 5)}</div> : null}
          <small>{formatRelativeTime(session?.latestMessageAt || session?.updatedAt || session?.createdAt)}</small>
          <small>{messageCount} messages</small>
          {isOwnerGroup && status === "open" ? <span className="qa-list-chip">Needs reply</span> : null}
          {Number(unreadCount) > 0 ? <span className="qa-list-unread-pill">{unreadCount}</span> : null}
        </div>
      </div>
    </button>
  );
}

function QaTabView({ model, controller }) {
  const [isListMode, setIsListMode] = useState(!model.activeSession?.sessionId);
  const [draftMessage, setDraftMessage] = useState("");
  const [selectedStars, setSelectedStars] = useState(0);
  const [draftFeedback, setDraftFeedback] = useState("");
  const messageListRef = useRef(null);

  const sessions = useMemo(() => {
    const list = Array.isArray(model.sessions) ? [...model.sessions] : [];
    list.sort((a, b) => {
      const timeA = new Date(a?.latestMessageAt || a?.updatedAt || a?.createdAt || 0).getTime();
      const timeB = new Date(b?.latestMessageAt || b?.updatedAt || b?.createdAt || 0).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return Number(b?.sessionId || 0) - Number(a?.sessionId || 0);
    });
    return list;
  }, [model.sessions]);

  const startedSessions = useMemo(
    () => sessions.filter((session) => Number(session?.askerUserId || 0) === model.currentUserId),
    [sessions, model.currentUserId],
  );

  const ownerSessions = useMemo(
    () => sessions.filter((session) => Number(session?.ownerUserId || 0) === model.currentUserId),
    [sessions, model.currentUserId],
  );

  const activeSession = model.activeSession || null;
  const activeSessionId = Number(activeSession?.sessionId || 0);
  const messages = Array.isArray(model.messages) ? model.messages : [];
  const ratedValue = model.ratedSessionMap?.[activeSessionId];
  const status = normalizeStatus(activeSession?.status);
  const isClosed = status === "closed";
  const isAsker = Number(activeSession?.askerUserId || 0) === model.currentUserId;
  const explicitRating = Number(activeSession?.rating || activeSession?.stars || 0);
  const persistedRating = Number(ratedValue || 0);
  const hasRated = Boolean(activeSession?.hasRatedByCurrentUser || ratedValue);
  const ratingToDisplay = explicitRating > 0 ? explicitRating : persistedRating > 0 ? persistedRating : 5;
  const canSubmitRating = isClosed && isAsker && !hasRated;
  const noticeText = hasRated
    ? "Rating submitted successfully."
    : isClosed
      ? "This Q&A session has been closed."
      : "";

  useEffect(() => {
    if (activeSessionId > 0) {
      setIsListMode(false);
    }
  }, [activeSessionId]);

  useEffect(() => {
    const preset = Number(activeSession?.rating || activeSession?.stars || ratedValue || 0);
    setSelectedStars(preset > 0 ? Math.min(5, preset) : 0);
    setDraftFeedback("");
    setDraftMessage("");
  }, [activeSessionId, activeSession?.rating, activeSession?.stars, ratedValue]);

  useEffect(() => {
    const container = messageListRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages.length, activeSessionId]);

  const handleOpenSession = async (session) => {
    setIsListMode(false);
    await controller.onOpenSession(session);
  };

  const handleSendMessage = async () => {
    const message = String(draftMessage || "").trim();
    if (!message || !activeSessionId || model.isBusy || isClosed) return;
    setDraftMessage("");
    await controller.onSendMessage(activeSessionId, message);
  };

  const handleCloseSession = async () => {
    if (!activeSessionId || model.isBusy) return;
    const accepted = window.confirm("Do you want to close this Q&A session?");
    if (!accepted) return;
    await controller.onCloseSession(activeSessionId);
  };

  const handleRateSession = async () => {
    if (!activeSessionId || model.isBusy || selectedStars < 1) return;
    await controller.onRateSession(activeSessionId, selectedStars, draftFeedback);
  };

  if (isListMode || !activeSession) {
    return (
      <section className="panel qa-page">
        <div className="qa-page-head">
          <div>
            <h2>
              Q&A Sessions
              {model.unreadCount > 0 ? <span className="qa-unread-pill">{model.unreadCount}</span> : null}
            </h2>
            <p className="hint">Private 1-on-1 conversations with document owners.</p>
          </div>
        </div>

        <div className="qa-list-page">
          <section className="qa-status-group">
            <div className="qa-status-group-head">
              <h3>Sessions I Started ({startedSessions.length})</h3>
            </div>
            <div className="qa-list-grid">
              {startedSessions.length > 0 ? (
                startedSessions.map((session) => (
                  <QaSessionCard
                    key={`asker-${session.sessionId}`}
                    session={session}
                    isOwnerGroup={false}
                    unreadCount={model.unreadSessionMap?.[Number(session?.sessionId || 0)] || 0}
                    ratedValue={model.ratedSessionMap?.[Number(session?.sessionId || 0)]}
                    onOpen={handleOpenSession}
                    disabled={model.isBusy}
                  />
                ))
              ) : (
                <div className="qa-message-empty">
                  <h4>No sessions started yet</h4>
                  <p>Open a document and start your first Q&A conversation.</p>
                </div>
              )}
            </div>
          </section>

          <section className="qa-status-group">
            <div className="qa-status-group-head">
              <h3>Sessions on My Documents ({ownerSessions.length})</h3>
            </div>
            <div className="qa-list-grid">
              {ownerSessions.length > 0 ? (
                ownerSessions.map((session) => (
                  <QaSessionCard
                    key={`owner-${session.sessionId}`}
                    session={session}
                    isOwnerGroup
                    unreadCount={model.unreadSessionMap?.[Number(session?.sessionId || 0)] || 0}
                    ratedValue={model.ratedSessionMap?.[Number(session?.sessionId || 0)]}
                    onOpen={handleOpenSession}
                    disabled={model.isBusy}
                  />
                ))
              ) : (
                <div className="qa-message-empty">
                  <h4>No sessions on your documents</h4>
                  <p>When other users ask about your documents, sessions will appear here.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    );
  }

  return (
    <section className="panel qa-page qa-chat-page">
      <div className="qa-chat-topbar">
        <button type="button" className="qa-back-btn" onClick={() => setIsListMode(true)}>
          Back to sessions
        </button>
      </div>

      <article className="qa-chat-panel single">
        <header className="qa-chat-head qa-chat-head-hero">
          <div className="qa-chat-head-main">
            <div className="qa-chat-user">
              <div className="qa-list-avatar">
                {getInitials(isAsker ? activeSession?.ownerName : activeSession?.askerName)}
              </div>
              <div>
                <h3>{isAsker ? activeSession?.ownerName : activeSession?.askerName}</h3>
                <p>{activeSession?.documentTitle || "Untitled document"}</p>
              </div>
            </div>

            <div className="qa-chat-head-actions">
              {hasRated ? <div className="qa-list-rating">{renderStars(ratingToDisplay)}</div> : null}
              <span className={`qa-status-badge ${status}`}>{status}</span>
              {isClosed ? (
                <button type="button" className="qa-back-btn" onClick={() => setIsListMode(true)}>
                  Close session
                </button>
              ) : (
                <button type="button" className="warn-btn" onClick={handleCloseSession} disabled={model.isBusy}>
                  Close
                </button>
              )}
            </div>
          </div>

          {noticeText ? <div className="qa-inline-notice qa-inline-notice-fixed">{noticeText}</div> : null}
        </header>

        <div ref={messageListRef} className="qa-message-list">
          {messages.length > 0 ? (
            messages.map((message) => {
              const isMine = Number(message?.senderUserId || 0) === model.currentUserId;
              const senderName = message?.senderName || (isMine ? model.user?.name : "NeuShare member");
              return (
                <div
                  key={message?.messageId || `${message?.createdAt || ""}-${message?.message || ""}`}
                  className={`qa-message-row ${isMine ? "mine" : ""}`}
                >
                  <div className={`qa-message-avatar ${isMine ? "mine" : ""}`}>{getInitials(senderName)}</div>
                  <div className={`qa-message-bubble ${isMine ? "mine" : "theirs"}`}>
                    <strong>{senderName}</strong>
                    <p>{message?.message || ""}</p>
                    <small>{formatClock(message?.createdAt)}</small>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="qa-message-empty">
              <h4>No messages yet</h4>
              <p>Start the conversation by sending the first message.</p>
            </div>
          )}
        </div>

        {isClosed ? (
          canSubmitRating ? (
            <section className="qa-rating-card">
              <h4>Rate this Q&A session</h4>
              <div className="qa-stars" role="radiogroup" aria-label="Choose rating from one to five stars">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={selectedStars >= value ? "active" : ""}
                    onClick={() => setSelectedStars(value)}
                    aria-label={`${value} stars`}
                  >
                    *
                  </button>
                ))}
              </div>
              <textarea
                value={draftFeedback}
                onChange={(event) => setDraftFeedback(event.target.value)}
                placeholder="Optional feedback for this session"
                maxLength={500}
                disabled={model.isBusy}
              />
              <button
                type="button"
                className="primary-btn"
                onClick={handleRateSession}
                disabled={model.isBusy || selectedStars < 1}
              >
                Submit rating
              </button>
            </section>
          ) : (
            <footer className="qa-closed-note">
              <p>This session has been closed.</p>
            </footer>
          )
        ) : (
          <form
            className="qa-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSendMessage();
            }}
          >
            <div className="qa-composer-row">
              <textarea
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                placeholder="Type your message..."
                maxLength={2000}
                disabled={model.isBusy}
              />
              <button type="submit" className="qa-send-btn" disabled={model.isBusy || !draftMessage.trim()}>
                Send
              </button>
            </div>
          </form>
        )}
      </article>
    </section>
  );
}

export default QaTabView;
