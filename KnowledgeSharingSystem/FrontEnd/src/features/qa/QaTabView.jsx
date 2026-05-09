import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

function ModalPortal({ children }) {
  if (typeof document === "undefined") return children;
  return createPortal(children, document.body);
}

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
  const [draftQuestionSummary, setDraftQuestionSummary] = useState("");
  const [draftAuthorSolution, setDraftAuthorSolution] = useState("");
  const [draftIsSatisfied, setDraftIsSatisfied] = useState(true);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [qaNoticeModal, setQaNoticeModal] = useState(null);
  const [addingMessageId, setAddingMessageId] = useState(null);
  const [messageReportModal, setMessageReportModal] = useState(null);
  const [messageReportReason, setMessageReportReason] = useState("");
  const [isSubmittingMessageReport, setIsSubmittingMessageReport] = useState(false);
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
  const isAnyModalOpen = Boolean(isCloseModalOpen || isRatingModalOpen || qaNoticeModal || messageReportModal);
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
    setDraftQuestionSummary("");
    setDraftAuthorSolution("");
    setDraftIsSatisfied(true);
    setDraftMessage("");
    setIsCloseModalOpen(false);
    setIsRatingModalOpen(false);
  }, [activeSessionId, activeSession?.rating, activeSession?.stars, ratedValue]);

  useEffect(() => {
    if (!isAnyModalOpen || typeof document === "undefined") return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isAnyModalOpen]);

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
    setIsCloseModalOpen(true);
  };

  const handleConfirmCloseSession = async () => {
    if (!activeSessionId || model.isBusy || isSubmittingClose) return;
    setIsSubmittingClose(true);
    try {
      await controller.onCloseSession(activeSessionId);
      setIsCloseModalOpen(false);
    } finally {
      setIsSubmittingClose(false);
    }
  };

  const handleRateSession = async () => {
    if (!activeSessionId || model.isBusy || isSubmittingRating || selectedStars < 1) return;
    setIsSubmittingRating(true);
    try {
      await controller.onRateSession(activeSessionId, selectedStars, {
        feedback: draftFeedback,
        questionSummary: draftQuestionSummary,
        authorSolution: draftAuthorSolution,
        satisfactionNote: draftFeedback,
        isSatisfied: draftIsSatisfied,
      });
      setIsRatingModalOpen(false);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const openRatingModal = () => {
    if (!canSubmitRating || model.isBusy) return;
    setSelectedStars((current) => (current > 0 ? current : 5));
    setIsRatingModalOpen(true);
  };

  const handleAddMessageExperience = async (message) => {
    const messageId = Number(message?.messageId || 0);
    if (!messageId || model.isBusy || addingMessageId) return;
    setAddingMessageId(messageId);
    try {
      await controller.onAddMessageExperience(message);
      setQaNoticeModal({
        title: "Đã thêm kinh nghiệm",
        message: "Nội dung Q&A đã được thêm vào trang tổng hợp kinh nghiệm của tài liệu.",
      });
    } catch (error) {
      setQaNoticeModal({
        title: "Không thể thêm kinh nghiệm",
        message: error?.message || "Không thể thêm nội dung Q&A vào trang tổng hợp kinh nghiệm.",
      });
    } finally {
      setAddingMessageId(null);
    }
  };

  const openMessageReportModal = (message) => {
    setMessageReportModal({ message });
    setMessageReportReason("");
  };

  const closeMessageReportModal = () => {
    if (isSubmittingMessageReport) return;
    setMessageReportModal(null);
    setMessageReportReason("");
  };

  const submitMessageReport = async () => {
    const reason = messageReportReason.trim();
    const messageId = Number(messageReportModal?.message?.messageId || 0);
    if (!reason || !activeSessionId || !messageId || !controller.onReportMessage || isSubmittingMessageReport) return;
    setIsSubmittingMessageReport(true);
    try {
      await controller.onReportMessage(activeSessionId, messageId, reason);
      setMessageReportModal(null);
      setMessageReportReason("");
    } finally {
      setIsSubmittingMessageReport(false);
    }
  };

  const handleModerateMessage = async (message, action) => {
    const messageId = Number(message?.messageId || 0);
    if (!activeSessionId || !messageId || !controller.onModerateMessage || model.isBusy) return;
    await controller.onModerateMessage(
      activeSessionId,
      messageId,
      action,
      action === "hide" ? "Hidden from Q&A moderation." : "Restored from Q&A moderation.",
    );
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
              const messageStatus = String(message?.status || "active").toLowerCase();
              const isHiddenMessage = messageStatus === "hidden";
              return (
                <div
                  key={message?.messageId || `${message?.createdAt || ""}-${message?.message || ""}`}
                  className={`qa-message-row ${isMine ? "mine" : ""} ${isHiddenMessage ? "hidden" : ""}`}
                >
                  <div className={`qa-message-avatar ${isMine ? "mine" : ""}`}>{getInitials(senderName)}</div>
                  <div className={`qa-message-bubble ${isMine ? "mine" : "theirs"}`}>
                    <strong>
                      {senderName}
                      {isHiddenMessage ? <span className="qa-message-hidden-badge">Đã ẩn</span> : null}
                    </strong>
                    <p>{isHiddenMessage && !model.isModerator ? "Tin nhắn này đã bị ẩn." : message?.message || ""}</p>
                    <div className="qa-message-meta">
                      <small>{formatClock(message?.createdAt)}</small>
                      {!isMine && !isHiddenMessage && controller.onReportMessage ? (
                        <button
                          type="button"
                          className="qa-message-report-btn"
                          disabled={model.isBusy}
                          onClick={() => openMessageReportModal(message)}
                        >
                          Report
                        </button>
                      ) : null}
                      {model.isModerator && controller.onAddMessageExperience ? (
                        <button
                          type="button"
                          className="qa-message-experience-btn"
                          disabled={model.isBusy || Number(addingMessageId || 0) === Number(message?.messageId || 0)}
                          onClick={() => handleAddMessageExperience(message)}
                        >
                          {Number(addingMessageId || 0) === Number(message?.messageId || 0)
                            ? "Adding..."
                            : "Add experience"}
                        </button>
                      ) : null}
                      {model.isModerator && controller.onModerateMessage ? (
                        <button
                          type="button"
                          className="qa-message-report-btn"
                          disabled={model.isBusy}
                          onClick={() => {
                            void handleModerateMessage(message, isHiddenMessage ? "restore" : "hide");
                          }}
                        >
                          {isHiddenMessage ? "Restore" : "Hide"}
                        </button>
                      ) : null}
                    </div>
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
          <footer className="qa-closed-note">
            <p>This session has been closed.</p>
            {canSubmitRating ? (
              <button
                type="button"
                className="primary-btn qa-rate-open-btn"
                onClick={openRatingModal}
                disabled={model.isBusy}
              >
                Đánh giá phiên chat
              </button>
            ) : null}
          </footer>
        ) : (
          <form
            className="qa-composer"
            onSubmit={(event) => {
              event.preventDefault();
            }}
          >
            <div className="qa-composer-row">
              <textarea
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.shiftKey) return;
                  if (event.nativeEvent?.isComposing) return;
                  event.preventDefault();
                  void handleSendMessage();
                }}
                placeholder="Type your message..."
                maxLength={2000}
                disabled={model.isBusy}
              />
              <button
                type="button"
                className="qa-send-btn"
                aria-label="Send message"
                title="Send message"
                disabled={model.isBusy || !draftMessage.trim()}
                onClick={() => {
                  void handleSendMessage();
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M21.8 3.7 18.3 20c-.2.9-1.2 1.2-1.9.7l-5.1-3.8-2.5 2.4c-.5.5-1.4.2-1.4-.6v-3.8L2.6 13c-.9-.3-.9-1.6 0-2L20.2 2.4c.9-.4 1.8.4 1.6 1.3Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
          </form>
        )}
      </article>

      {isCloseModalOpen && (
        <ModalPortal>
          <div className="report-modal-backdrop" role="dialog" aria-modal="true">
            <div className="report-modal qa-session-modal">
              <div className="report-modal-head">
                <h3>Xác nhận đóng phiên chat</h3>
                <button
                  type="button"
                  className="report-close-btn"
                  onClick={() => setIsCloseModalOpen(false)}
                  disabled={isSubmittingClose}
                >
                  x
                </button>
              </div>
              <p className="report-modal-sub">
                Sau khi đóng, phiên Q&A sẽ chuyển sang trạng thái chỉ đọc. Người hỏi có thể gửi đánh giá cho phiên này.
              </p>
              <div className="qa-modal-summary">
                <strong>{activeSession?.documentTitle || "Untitled document"}</strong>
                <span>
                  {isAsker ? activeSession?.ownerName : activeSession?.askerName || "NeuShare member"}
                </span>
              </div>
              <div className="report-modal-actions">
                <button type="button" onClick={() => setIsCloseModalOpen(false)} disabled={isSubmittingClose}>
                  Hủy
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleConfirmCloseSession}
                  disabled={isSubmittingClose || model.isBusy}
                >
                  {isSubmittingClose ? "Đang đóng..." : "Xác nhận đóng"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {isRatingModalOpen && (
        <ModalPortal>
          <div className="report-modal-backdrop" role="dialog" aria-modal="true">
            <div className="report-modal qa-session-modal qa-rating-modal">
              <div className="report-modal-head">
                <h3>Đánh giá phiên Q&A</h3>
                <button
                  type="button"
                  className="report-close-btn"
                  onClick={() => setIsRatingModalOpen(false)}
                  disabled={isSubmittingRating}
                >
                  x
                </button>
              </div>
              <p className="report-modal-sub">
                Vui lòng nêu thắc mắc của bạn, cách tác giả đã giải đáp, và bạn có hài lòng với câu trả lời không.
              </p>

              <label className="point-review-field">
                <span>Số sao đánh giá</span>
                <div className="qa-stars qa-stars-modal" role="radiogroup" aria-label="Choose rating from one to five stars">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={selectedStars >= value ? "active" : ""}
                      onClick={() => setSelectedStars(value)}
                      aria-label={`${value} stars`}
                      disabled={isSubmittingRating || model.isBusy}
                    >
                      *
                    </button>
                  ))}
                </div>
              </label>

              <label className="point-review-field">
                <span>Thắc mắc của bạn</span>
                <textarea
                  rows={3}
                  value={draftQuestionSummary}
                  onChange={(event) => setDraftQuestionSummary(event.target.value)}
                  placeholder="Ví dụ: Tôi chưa hiểu cách áp dụng công thức ở dạng bài này..."
                  maxLength={2000}
                  disabled={isSubmittingRating || model.isBusy}
                />
              </label>

              <label className="point-review-field">
                <span>Cách tác giả giải đáp</span>
                <textarea
                  rows={3}
                  value={draftAuthorSolution}
                  onChange={(event) => setDraftAuthorSolution(event.target.value)}
                  placeholder="Ví dụ: Tác giả giải thích từng bước và đưa ví dụ tương tự..."
                  maxLength={2000}
                  disabled={isSubmittingRating || model.isBusy}
                />
              </label>

              <label className="point-review-field">
                <span>Nhận xét thêm</span>
                <textarea
                  rows={3}
                  value={draftFeedback}
                  onChange={(event) => setDraftFeedback(event.target.value)}
                  placeholder="Bạn hài lòng với câu trả lời chứ?"
                  maxLength={2000}
                  disabled={isSubmittingRating || model.isBusy}
                />
              </label>

              <label className="qa-rating-satisfied qa-rating-satisfied-modal">
                <input
                  type="checkbox"
                  checked={draftIsSatisfied}
                  disabled={isSubmittingRating || model.isBusy}
                  onChange={(event) => setDraftIsSatisfied(event.target.checked)}
                />
                <span>Tôi hài lòng với câu trả lời.</span>
              </label>

              <div className="report-modal-actions">
                <button type="button" onClick={() => setIsRatingModalOpen(false)} disabled={isSubmittingRating}>
                  Hủy
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleRateSession}
                  disabled={isSubmittingRating || model.isBusy || selectedStars < 1}
                >
                  {isSubmittingRating ? "Đang gửi..." : "Gửi đánh giá"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {qaNoticeModal && (
        <ModalPortal>
          <div className="report-modal-backdrop" role="dialog" aria-modal="true">
            <div className="report-modal qa-session-modal">
              <div className="report-modal-head">
                <h3>{qaNoticeModal.title}</h3>
                <button type="button" className="report-close-btn" onClick={() => setQaNoticeModal(null)}>
                  x
                </button>
              </div>
              <p className="report-modal-sub">{qaNoticeModal.message}</p>
              <div className="report-modal-actions">
                <button type="button" className="primary-btn" onClick={() => setQaNoticeModal(null)}>
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {messageReportModal && (
        <ModalPortal>
          <div className="report-modal-backdrop" role="dialog" aria-modal="true">
            <div className="report-modal qa-session-modal">
              <div className="report-modal-head">
                <h3>Báo cáo tin nhắn Q&A</h3>
                <button
                  type="button"
                  className="report-close-btn"
                  onClick={closeMessageReportModal}
                  disabled={isSubmittingMessageReport}
                >
                  x
                </button>
              </div>
              <p className="report-modal-sub">
                Mô tả ngắn gọn lý do tin nhắn này cần được quản trị viên xem xét.
              </p>
              <div className="qa-reported-message-preview">
                {messageReportModal.message?.message || ""}
              </div>
              <textarea
                className="report-textarea"
                rows={4}
                maxLength={255}
                value={messageReportReason}
                onChange={(event) => setMessageReportReason(event.target.value)}
                placeholder="Nhập lý do báo cáo..."
              />
              <div className="report-modal-actions">
                <button type="button" onClick={closeMessageReportModal} disabled={isSubmittingMessageReport}>
                  Hủy
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  disabled={!messageReportReason.trim() || isSubmittingMessageReport || model.isBusy}
                  onClick={submitMessageReport}
                >
                  {isSubmittingMessageReport ? "Đang gửi..." : "Gửi báo cáo"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </section>
  );
}

export default QaTabView;
