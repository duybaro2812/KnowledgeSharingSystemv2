import { useMemo, useState } from "react";

function PreviewPanel(props) {
  const {
    previewDoc,
    onClose,
    getDocReactionCounts,
    onToggleLike,
    onToggleDislike,
    onToggleSave,
    onDownload,
    onReport,
    onStartQa,
    comments = [],
    onCreateComment,
    onCreateReply,
  } = props;

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isQaOpen, setIsQaOpen] = useState(false);
  const [qaMessage, setQaMessage] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [replyInputByCommentId, setReplyInputByCommentId] = useState({});
  const [replyOpenByCommentId, setReplyOpenByCommentId] = useState({});

  if (!previewDoc) return null;

  const isLocked = Boolean(previewDoc.isLockedForPoints);
  const isLoading = Boolean(previewDoc.isLoading);
  const docId = Number(previewDoc.documentId || 0);
  const reaction = getDocReactionCounts
    ? getDocReactionCounts(docId)
    : { likeCount: 0, dislikeCount: 0, liked: false, disliked: false, saved: false };

  const childrenByParent = useMemo(() => {
    const bucket = {};
    (comments || []).forEach((comment) => {
      const parentId = Number(comment.parentCommentId || 0);
      if (!bucket[parentId]) bucket[parentId] = [];
      bucket[parentId].push(comment);
    });
    return bucket;
  }, [comments]);

  const rootComments = childrenByParent[0] || [];
  const ownerUserId = Number(previewDoc.ownerUserId || previewDoc.ownerId || 0);
  const currentUserId = Number(previewDoc.currentUserId || 0);
  const normalizeName = (value) => String(value || "").trim().toLowerCase();
  const isOwnerById =
    Number.isInteger(ownerUserId) &&
    ownerUserId > 0 &&
    Number.isInteger(currentUserId) &&
    currentUserId > 0 &&
    ownerUserId === currentUserId;
  const isOwnerByName =
    !isOwnerById &&
    normalizeName(previewDoc.ownerName) &&
    normalizeName(previewDoc.currentUserName) &&
    normalizeName(previewDoc.ownerName) === normalizeName(previewDoc.currentUserName);
  const isOwner = Boolean(previewDoc.isOwner || isOwnerById || isOwnerByName);
  const canAskAuthor = Number.isInteger(docId) && docId > 0 && !isOwner && Boolean(onStartQa);
  const accessState = String(previewDoc.accessState || "").toLowerCase();
  const tier = String(previewDoc.tier || "").toLowerCase();
  const isPrivilegedState = accessState === "privileged" || tier === "privileged";
  const isFullState = accessState === "full_access" || tier === "full_access";
  const isLimitedState = accessState === "limited_full" || tier === "view_limited";
  const hasFullAccess = !isLocked && (Boolean(previewDoc.canFullView) || isPrivilegedState || isFullState);
  const lockedOverlayTitle = previewDoc.lockedOverlay?.title || "This document is locked";
  const lockedOverlayMessage =
    previewDoc.lockedOverlay?.message ||
    `You need at least ${previewDoc.requiredPoints} points to unlock this document.`;
  const lockedOverlayHelper =
    previewDoc.lockedOverlay?.helperText ||
    "You can still discuss, comment, reply, and ask the owner questions.";

  let stateLabel = "Preview";
  let stateClass = "state-preview";
  let stateMessage = "You are viewing a limited document state.";

  if (isLoading) {
    stateLabel = "Preparing";
    stateClass = "state-preparing";
    stateMessage = "NeuShare is preparing your in-app viewer.";
  } else if (isLocked) {
    stateLabel = "Locked";
    stateClass = "state-locked";
    stateMessage = `Unlock from ${previewDoc.requiredPoints} points to read full document pages.`;
  } else if (hasFullAccess) {
    stateLabel = "Full Access";
    stateClass = "state-full";
    stateMessage = previewDoc.canDownload
      ? "You can view and download this document."
      : "You can view full content. Download is currently locked.";
  } else if (isLimitedState || !isLocked) {
    stateLabel = "Limited Full View";
    stateClass = "state-limited";
    stateMessage = previewDoc.accessReason || "Full view is currently limited by your access tier.";
  }

  const hasViewQuotaLimit =
    previewDoc.dailyViewLimit !== null &&
    previewDoc.dailyViewLimit !== undefined &&
    Number(previewDoc.dailyViewLimit) > 0;

  const openReportModal = () => {
    setReportReason("");
    setIsReportOpen(true);
  };

  const closeReportModal = () => {
    setIsReportOpen(false);
    setReportReason("");
  };

  const openQaModal = () => {
    setQaMessage("");
    setIsQaOpen(true);
  };

  const closeQaModal = () => {
    setIsQaOpen(false);
    setQaMessage("");
  };

  const handleSubmitReport = async () => {
    const normalized = reportReason.trim();
    if (!normalized) return;
    if (onReport) {
      await onReport(docId, normalized);
    }
    closeReportModal();
  };

  const handleStartQa = async () => {
    if (!onStartQa) return;
    await onStartQa(docId, qaMessage);
    closeQaModal();
  };

  const handleCreateComment = async () => {
    const normalized = commentInput.trim();
    if (!normalized || !onCreateComment) return;
    await onCreateComment(docId, normalized);
    setCommentInput("");
  };

  const handleCreateReply = async (parentCommentId) => {
    const currentInput = replyInputByCommentId[parentCommentId] || "";
    const normalized = currentInput.trim();
    if (!normalized || !onCreateReply) return;
    await onCreateReply(parentCommentId, normalized, docId);
    setReplyInputByCommentId((prev) => ({ ...prev, [parentCommentId]: "" }));
    setReplyOpenByCommentId((prev) => ({ ...prev, [parentCommentId]: false }));
  };

  const renderCommentItem = (comment, depth = 0) => {
    const replyChildren = childrenByParent[comment.commentId] || [];
    const isReplyOpen = Boolean(replyOpenByCommentId[comment.commentId]);
    const replyInput = replyInputByCommentId[comment.commentId] || "";

    return (
      <div
        key={comment.commentId}
        className="comment-item"
        style={{ marginLeft: `${Math.min(depth, 4) * 18}px` }}
      >
        <div className="comment-head">
          <strong>{comment.authorName || "User"}</strong>
          <span className="comment-time">{new Date(comment.createdAt).toLocaleString()}</span>
        </div>
        <p className="comment-content">{comment.content}</p>
        <div className="comment-actions">
          <button
            type="button"
            onClick={() =>
              setReplyOpenByCommentId((prev) => ({
                ...prev,
                [comment.commentId]: !prev[comment.commentId],
              }))
            }
          >
            Reply
          </button>
        </div>

        {isReplyOpen && (
          <div className="reply-editor">
            <input
              type="text"
              value={replyInput}
              onChange={(e) =>
                setReplyInputByCommentId((prev) => ({
                  ...prev,
                  [comment.commentId]: e.target.value,
                }))
              }
              placeholder="Write a reply..."
            />
            <button type="button" onClick={() => handleCreateReply(comment.commentId)}>
              Send
            </button>
          </div>
        )}

        {replyChildren.length > 0 && (
          <div className="comment-children">
            {replyChildren.map((child) => renderCommentItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="panel preview-panel">
      <div className="preview-head">
        <div>
          <h2>Document reader</h2>
          <p>
            {previewDoc.title} ({previewDoc.originalFileName})
          </p>
          <p className="preview-owner">Author: {previewDoc.ownerName || "NeuShare member"}</p>
        </div>
        <div className="preview-head-actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="preview-state-strip">
        <div className={`preview-state-badge ${stateClass}`}>{stateLabel}</div>
        <p className="preview-state-message">{stateMessage}</p>
        <div className="preview-state-metrics">
          <div className="preview-state-metric">
            <span>Your points</span>
            <b>{Number(previewDoc.points || 0)}</b>
          </div>
          <div className="preview-state-metric">
            <span>Required points</span>
            <b>{Number(previewDoc.requiredPoints || 30)}</b>
          </div>
          <div className="preview-state-metric">
            <span>Download</span>
            <b>
              {previewDoc.canDownload
                ? previewDoc.downloadCost > 0
                  ? `${previewDoc.downloadCost} pts`
                  : "Enabled"
                : "Locked"}
            </b>
          </div>
          <div className="preview-state-metric">
            <span>View quota</span>
            <b>
              {hasViewQuotaLimit
                ? `${Number(previewDoc.viewsRemainingToday || 0)} left`
                : "Unlimited"}
            </b>
          </div>
        </div>
      </div>

      <div className="preview-actions">
        {!isLocked && (
          <div className="preview-actions-left">
            <button
              type="button"
              className="preview-cta"
              disabled={!previewDoc.canDownload || isLoading}
              onClick={() => onDownload && onDownload(docId, previewDoc)}
              title={
                previewDoc.canDownload
                  ? previewDoc.downloadCost > 0
                    ? `Download cost: ${previewDoc.downloadCost} points`
                    : "Download document"
                  : "Download is locked for your current point tier"
              }
            >
              {previewDoc.canDownload
                ? previewDoc.downloadCost > 0
                  ? `Download (${previewDoc.downloadCost} pts)`
                  : "Download"
                : "Download locked"}
            </button>
            <button
              type="button"
              className={reaction.liked ? "active-like" : ""}
              onClick={() => onToggleLike && onToggleLike(docId)}
            >
              👍 {reaction.likeCount || 0}
            </button>
            <button
              type="button"
              className={reaction.disliked ? "active-dislike" : ""}
              onClick={() => onToggleDislike && onToggleDislike(docId)}
            >
              👎 {reaction.dislikeCount || 0}
            </button>
            <button type="button" onClick={() => onToggleSave && onToggleSave(docId)}>
              {reaction.saved ? "Saved" : "Save"}
            </button>
          </div>
        )}
        <div className="preview-actions-right">
          {canAskAuthor && (
            <button type="button" className="preview-qa-btn" onClick={openQaModal}>
              Ask author
            </button>
          )}
          <button type="button" className="danger-ghost preview-report-btn" onClick={openReportModal}>
            Report Document
          </button>
        </div>
      </div>

      <div className="preview-frame-wrap">
        <div className={isLocked ? "preview-content blurred" : "preview-content"}>
          {isLoading ? (
            <div className="preview-loading-state">
              <h3>Preparing viewer</h3>
              <p>Your document is being opened inside NeuShare.</p>
            </div>
          ) : previewDoc.previewUrl ? (
            <iframe
              title={`preview-${previewDoc.title}`}
              src={previewDoc.previewUrl}
              className="preview-frame"
            />
          ) : (
            <div className="preview-unavailable-state">
              <h3>Viewer not ready</h3>
              <p>{previewDoc.previewReason || "No preview available for this file type."}</p>
              {previewDoc.fileUrl && (
                <a href={previewDoc.fileUrl} target="_blank" rel="noreferrer">
                  Open original file
                </a>
              )}
            </div>
          )}
        </div>

        {isLocked && (
          <div className="preview-lock-overlay">
            <h3>🔒 {lockedOverlayTitle}</h3>
            <p>{lockedOverlayMessage}</p>
            <small>{lockedOverlayHelper}</small>
            <div className="lock-overlay-actions">
              {canAskAuthor && (
                <button type="button" onClick={openQaModal}>
                  Ask author
                </button>
              )}
              <button type="button" onClick={openReportModal}>
                Report
              </button>
            </div>
          </div>
        )}
      </div>

      <section className="comments-panel">
        <h3>Comments</h3>
        <div className="comment-editor">
          <input
            type="text"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            placeholder="Write a comment..."
          />
          <button
            type="button"
            className="primary-btn"
            disabled={!commentInput.trim()}
            onClick={handleCreateComment}
          >
            Send
          </button>
        </div>

        <div className="comment-list">
          {rootComments.length === 0 && (
            <p className="comment-empty">No comments yet. Be the first to comment.</p>
          )}
          {rootComments.map((comment) => renderCommentItem(comment))}
        </div>
      </section>

      {isReportOpen && (
        <div className="report-modal-backdrop" role="dialog" aria-modal="true">
          <div className="report-modal">
            <div className="report-modal-head">
              <h3>Report Document</h3>
              <button type="button" className="report-close-btn" onClick={closeReportModal}>
                ×
              </button>
            </div>
            <p className="report-modal-sub">Please enter the reason for reporting this document.</p>
            <textarea
              className="report-textarea"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Enter report reason..."
              rows={4}
            />
            <div className="report-modal-actions">
              <button type="button" onClick={closeReportModal}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={!reportReason.trim()}
                onClick={handleSubmitReport}
              >
                Send report
              </button>
            </div>
          </div>
        </div>
      )}

      {isQaOpen && (
        <div className="report-modal-backdrop" role="dialog" aria-modal="true">
          <div className="report-modal">
            <div className="report-modal-head">
              <h3>Ask the author</h3>
              <button type="button" className="report-close-btn" onClick={closeQaModal}>
                ×
              </button>
            </div>
            <p className="report-modal-sub">Start a private Q&A session with the document owner.</p>
            <textarea
              className="report-textarea"
              value={qaMessage}
              onChange={(e) => setQaMessage(e.target.value)}
              placeholder="Write your first question..."
              rows={4}
            />
            <div className="report-modal-actions">
              <button type="button" onClick={closeQaModal}>
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={handleStartQa}>
                Start Q&A
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default PreviewPanel;
