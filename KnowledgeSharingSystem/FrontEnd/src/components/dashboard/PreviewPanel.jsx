import { useMemo, useState } from "react";

function PreviewPanel(props) {
  const {
    previewDoc,
    onClose,
    getDocReactionCounts,
    onToggleLike,
    onToggleDislike,
    onToggleSave,
    onReport,
    comments = [],
    onCreateComment,
    onCreateReply,
  } = props;

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [replyInputByCommentId, setReplyInputByCommentId] = useState({});
  const [replyOpenByCommentId, setReplyOpenByCommentId] = useState({});

  if (!previewDoc) return null;

  const isLocked = Boolean(previewDoc.isLockedForPoints);
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

  const openReportModal = () => {
    setReportReason("");
    setIsReportOpen(true);
  };

  const closeReportModal = () => {
    setIsReportOpen(false);
    setReportReason("");
  };

  const handleSubmitReport = async () => {
    const normalized = reportReason.trim();
    if (!normalized) return;
    if (onReport) {
      await onReport(docId, normalized);
    }
    closeReportModal();
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
        </div>
        <div className="preview-head-actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {!isLocked && (
        <div className="preview-actions">
          <a className="preview-cta" href={previewDoc.fileUrl} target="_blank" rel="noreferrer">
            Download
          </a>
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
          <button type="button" className="danger-ghost" onClick={openReportModal}>
            Report Document
          </button>
        </div>
      )}

      <div className="preview-frame-wrap">
        <div className={isLocked ? "preview-content blurred" : "preview-content"}>
          {previewDoc.previewUrl ? (
            <iframe
              title={`preview-${previewDoc.title}`}
              src={previewDoc.previewUrl}
              className="preview-frame"
            />
          ) : (
            <p>{previewDoc.previewReason || "No preview available for this file type."}</p>
          )}
        </div>

        {isLocked && (
          <div className="preview-lock-overlay">
            <h3>🔒 This is a preview</h3>
            <p>
              You need at least <b>{previewDoc.requiredPoints}</b> points to unlock this
              document.
            </p>
            <div className="lock-overlay-actions">
              <button type="button">Earn points</button>
              <button type="button" className="danger-ghost" onClick={openReportModal}>
                Report Document
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
    </section>
  );
}

export default PreviewPanel;
