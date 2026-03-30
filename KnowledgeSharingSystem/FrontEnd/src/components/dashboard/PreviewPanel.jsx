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

  if (!previewDoc) return null;

  const isLocked = !!previewDoc.isLockedForPoints;
  const docId = Number(previewDoc.documentId || 0);
  const reaction = getDocReactionCounts
    ? getDocReactionCounts(docId)
    : { likeCount: 0, dislikeCount: 0, liked: false, disliked: false, saved: false };

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
          <button
            type="button"
            className="danger-ghost"
            onClick={() => onReport && onReport(docId)}
          >
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
              <button
                type="button"
                className="danger-ghost"
                onClick={() => onReport && onReport(docId)}
              >
                Report Document
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default PreviewPanel;

