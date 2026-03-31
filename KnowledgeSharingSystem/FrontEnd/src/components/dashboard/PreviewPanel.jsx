import { useState } from "react";

function PreviewPanel(props) {
  const {
    previewDoc,
    onClose,
    getDocReactionCounts,
    onToggleLike,
    onToggleDislike,
    onToggleSave,
    onReport,
  } = props;

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  if (!previewDoc) return null;

  const isLocked = !!previewDoc.isLockedForPoints;
  const docId = Number(previewDoc.documentId || 0);
  const reaction = getDocReactionCounts
    ? getDocReactionCounts(docId)
    : { likeCount: 0, dislikeCount: 0, liked: false, disliked: false, saved: false };

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
