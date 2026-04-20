import { useEffect, useMemo, useRef, useState } from "react";

const PDFJS_MODULE_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.min.mjs";
const PDFJS_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs";

function LimitedPdfPreview({ fileUrl, pageLimit = 5 }) {
  const hostRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [renderedPages, setRenderedPages] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    let loadingTask = null;

    const renderLimitedPdf = async () => {
      if (!fileUrl || !hostRef.current) {
        setIsLoading(false);
        setRenderedPages(0);
        return;
      }

      const hostElement = hostRef.current;
      hostElement.innerHTML = "";
      setError("");
      setIsLoading(true);
      setRenderedPages(0);

      try {
        const pdfJs = await import(/* @vite-ignore */ PDFJS_MODULE_URL);
        pdfJs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        loadingTask = pdfJs.getDocument({ url: fileUrl });
        const pdfDocument = await loadingTask.promise;
        const totalPages = Math.max(1, Math.min(Number(pageLimit || 5), Number(pdfDocument.numPages || 0)));

        for (let pageIndex = 1; pageIndex <= totalPages; pageIndex += 1) {
          if (isCancelled) return;

          const page = await pdfDocument.getPage(pageIndex);
          const viewport = page.getViewport({ scale: 1.18 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "limited-preview-canvas";

          await page.render({
            canvasContext: context,
            viewport,
          }).promise;

          const pageShell = document.createElement("div");
          pageShell.className = "limited-preview-page";
          const pageBadge = document.createElement("span");
          pageBadge.className = "limited-preview-page-number";
          pageBadge.textContent = `Page ${pageIndex}`;
          pageShell.appendChild(pageBadge);
          pageShell.appendChild(canvas);
          hostElement.appendChild(pageShell);
          setRenderedPages(pageIndex);
        }

        if (!isCancelled) {
          setIsLoading(false);
        }
      } catch (renderError) {
        if (isCancelled) return;
        setError(renderError?.message || "Unable to render preview pages.");
        setIsLoading(false);
      }
    };

    void renderLimitedPdf();

    return () => {
      isCancelled = true;
      if (loadingTask && typeof loadingTask.destroy === "function") {
        loadingTask.destroy();
      }
    };
  }, [fileUrl, pageLimit]);

  if (error) {
    return (
      <div className="preview-unavailable-state limited-preview-fallback">
        <h3>Preview unavailable</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="limited-viewer-wrap">
      <div className="limited-viewer-topbar">
        <span className="limited-viewer-badge">Preview mode</span>
        <p>Showing first {Number(pageLimit || 5)} pages</p>
      </div>
      <div className="limited-preview-shell">
        {isLoading && (
          <div className="limited-preview-loading">
            <span className="limited-preview-spinner" />
            <p>Loading first {Number(pageLimit || 5)} pages...</p>
          </div>
        )}
        <div ref={hostRef} className="limited-preview-host" />
        {!isLoading && renderedPages <= 0 && (
          <div className="preview-unavailable-state limited-preview-fallback">
            <h3>No preview pages</h3>
            <p>This document preview is not ready yet.</p>
          </div>
        )}
      </div>
      <div className="limited-viewer-footer">
        <span>Locked after page {Number(pageLimit || 5)}</span>
      </div>
      {isLoading && (
        <div className="limited-preview-loading limited-preview-loading-floating">
          <span className="limited-preview-spinner" />
          <p>Preparing preview...</p>
        </div>
      )}
    </div>
  );
}

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
    onReviewCommentPoint,
    onHideComment,
    isGuestMode,
    onNavigateToLogin,
    onNavigateToRegister,
    comments = [],
    onCreateComment,
    onCreateReply,
    isBusy = false,
  } = props;

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isQaOpen, setIsQaOpen] = useState(false);
  const [qaMessage, setQaMessage] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [replyInputByCommentId, setReplyInputByCommentId] = useState({});
  const [replyOpenByCommentId, setReplyOpenByCommentId] = useState({});
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isSubmittingReplyByCommentId, setIsSubmittingReplyByCommentId] = useState({});
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isSubmittingQa, setIsSubmittingQa] = useState(false);
  const [isEarnPointsOpen, setIsEarnPointsOpen] = useState(false);
  const previewFrameWrapRef = useRef(null);

  if (!previewDoc) return null;

  const isLocked = Boolean(previewDoc.isLockedForPoints);
  const previewPageLimit = Math.max(0, Number(previewDoc.previewPageLimit || 0));
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
  const canAskAuthor =
    Number.isInteger(docId) &&
    docId > 0 &&
    Number(currentUserId) > 0 &&
    !isOwner &&
    Boolean(onStartQa);
  const isModeratorOrAdmin = ["moderator", "admin"].includes(
    String(previewDoc.currentUserRole || "").toLowerCase(),
  );
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
  const canRenderLimitedPdf =
    isLocked &&
    previewPageLimit > 0 &&
    String(previewDoc.viewerKind || "").toLowerCase() === "pdf" &&
    Boolean(previewDoc.previewUrl);

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
    setIsEarnPointsOpen(false);
    setQaMessage("");
    setIsQaOpen(true);
  };

  const closeQaModal = () => {
    setIsQaOpen(false);
    setQaMessage("");
  };

  const openEarnPointsModal = () => {
    setIsQaOpen(false);
    setIsEarnPointsOpen(true);
  };

  const closeEarnPointsModal = () => {
    setIsEarnPointsOpen(false);
  };

  const focusPreviewCenter = () => {
    if (!previewFrameWrapRef.current) return;
    previewFrameWrapRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  };

  const handleOpenAskAuthor = () => {
    focusPreviewCenter();
    window.requestAnimationFrame(() => {
      openQaModal();
    });
  };

  const handleOpenEarnPoints = () => {
    focusPreviewCenter();
    window.requestAnimationFrame(() => {
      openEarnPointsModal();
    });
  };

  const handleSubmitReport = async () => {
    const normalized = reportReason.trim();
    if (!normalized || isSubmittingReport || isBusy) return;
    setIsSubmittingReport(true);
    try {
      if (onReport) {
        await onReport(docId, normalized);
      }
      closeReportModal();
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleStartQa = async () => {
    if (!onStartQa || isSubmittingQa || isBusy) return;
    setIsSubmittingQa(true);
    try {
      await onStartQa(docId, qaMessage);
      closeQaModal();
    } finally {
      setIsSubmittingQa(false);
    }
  };

  const handleCreateComment = async () => {
    const normalized = commentInput.trim();
    if (!normalized || !onCreateComment || isSubmittingComment || isBusy) return;
    setIsSubmittingComment(true);
    try {
      await onCreateComment(docId, normalized);
      setCommentInput("");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCreateReply = async (parentCommentId) => {
    const currentInput = replyInputByCommentId[parentCommentId] || "";
    const normalized = currentInput.trim();
    if (!normalized || !onCreateReply || isSubmittingReplyByCommentId[parentCommentId] || isBusy) return;
    setIsSubmittingReplyByCommentId((prev) => ({ ...prev, [parentCommentId]: true }));
    try {
      await onCreateReply(parentCommentId, normalized, docId);
      setReplyInputByCommentId((prev) => ({ ...prev, [parentCommentId]: "" }));
      setReplyOpenByCommentId((prev) => ({ ...prev, [parentCommentId]: false }));
    } finally {
      setIsSubmittingReplyByCommentId((prev) => ({ ...prev, [parentCommentId]: false }));
    }
  };

  const handleReviewCommentPoint = async (comment) => {
    if (!onReviewCommentPoint || !isModeratorOrAdmin) return;

    const rawPoints = window.prompt("Nhập điểm cho comment (10-15):", "10");
    if (rawPoints === null) return;
    const parsed = Number(rawPoints);
    if (!Number.isInteger(parsed) || parsed < 10 || parsed > 15) {
      window.alert("Điểm hợp lệ là số nguyên từ 10 đến 15.");
      return;
    }
    const note = window.prompt("Ghi chú đánh giá (tuỳ chọn):", "") || "";
    await onReviewCommentPoint(comment, parsed, note);
  };

  const renderCommentItem = (comment, depth = 0) => {
    const replyChildren = childrenByParent[comment.commentId] || [];
    const isReplyOpen = Boolean(replyOpenByCommentId[comment.commentId]);
    const replyInput = replyInputByCommentId[comment.commentId] || "";
    const pointEventStatus = String(comment?.pointEventStatus || "").toLowerCase();
    const hasPointEvaluation = ["approved", "rejected"].includes(pointEventStatus);
    const evaluatedPoints = Number(comment?.pointEventPoints || 0);
    const pointEvaluationLabel =
      pointEventStatus === "approved"
        ? `Đã đánh giá${evaluatedPoints > 0 ? `: ${evaluatedPoints} điểm` : ""}`
        : pointEventStatus === "rejected"
          ? "Đã đánh giá: từ chối"
          : "";

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
          {isModeratorOrAdmin && hasPointEvaluation && (
            <span className="comment-point-reviewed">{pointEvaluationLabel}</span>
          )}
          {isModeratorOrAdmin && (
            <>
              <button type="button" onClick={() => handleReviewCommentPoint(comment)}>
                {hasPointEvaluation ? "Sửa đánh giá điểm" : "Evaluate 10-15"}
              </button>
              <button
                type="button"
                className="danger-ghost"
                disabled={isBusy}
                onClick={() => {
                  const ok = window.confirm("Hide this comment from document discussion?");
                  if (ok && onHideComment) onHideComment(comment);
                }}
              >
                Hide
              </button>
            </>
          )}
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
              disabled={Boolean(isSubmittingReplyByCommentId[comment.commentId]) || isBusy}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                if (e.nativeEvent?.isComposing) return;
                e.preventDefault();
                void handleCreateReply(comment.commentId);
              }}
            />
            <button
              type="button"
              disabled={Boolean(isSubmittingReplyByCommentId[comment.commentId]) || isBusy}
              onClick={() => handleCreateReply(comment.commentId)}
            >
              {isSubmittingReplyByCommentId[comment.commentId] ? "Sending..." : "Send"}
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
              disabled={!previewDoc.canDownload || isLoading || isBusy}
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
              disabled={isBusy}
              onClick={() => onToggleLike && onToggleLike(docId)}
            >
              👍 {reaction.likeCount || 0}
            </button>
            <button
              type="button"
              className={reaction.disliked ? "active-dislike" : ""}
              disabled={isBusy}
              onClick={() => onToggleDislike && onToggleDislike(docId)}
            >
              👎 {reaction.dislikeCount || 0}
            </button>
            <button type="button" disabled={isBusy} onClick={() => onToggleSave && onToggleSave(docId)}>
              {reaction.saved ? "Saved" : "Save"}
            </button>
          </div>
        )}
        <div className="preview-actions-right">
          {canAskAuthor && (
            <button type="button" className="preview-qa-btn" disabled={isBusy} onClick={handleOpenAskAuthor}>
              Ask author
            </button>
          )}
          {isLocked && (
            <button type="button" className="preview-earn-btn" disabled={isBusy} onClick={handleOpenEarnPoints}>
              Earn points
            </button>
          )}
          <button type="button" className="danger-ghost preview-report-btn" disabled={isBusy} onClick={openReportModal}>
            Report Document
          </button>
        </div>
      </div>

      <div className="preview-frame-wrap" ref={previewFrameWrapRef}>
        <div className={isLocked && !canRenderLimitedPdf ? "preview-content blurred" : "preview-content"}>
          {isLoading ? (
            <div className="preview-loading-state">
              <h3>Preparing viewer</h3>
              <p>Your document is being opened inside NeuShare.</p>
            </div>
          ) : canRenderLimitedPdf ? (
            <LimitedPdfPreview fileUrl={previewDoc.previewUrl} pageLimit={previewPageLimit} />
          ) : previewDoc.previewUrl ? (
            <iframe
              title={`preview-${previewDoc.title}`}
              src={previewDoc.previewUrl}
              className="preview-frame"
              loading="lazy"
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
          <div className={canRenderLimitedPdf ? "preview-lock-overlay preview-lock-overlay-partial" : "preview-lock-overlay"}>
            <h3>🔒 {lockedOverlayTitle}</h3>
            <p>{lockedOverlayMessage}</p>
            <small>
              {canRenderLimitedPdf
                ? `You can preview the first ${previewPageLimit} pages. ${lockedOverlayHelper}`
                : lockedOverlayHelper}
            </small>
            <div className="lock-overlay-actions">
              {isGuestMode ? (
                <>
                  <button type="button" className="primary-btn guest-ask-btn" onClick={handleOpenAskAuthor}>
                    Đăng nhập
                  </button>
                  <button type="button" className="preview-earn-btn guest-earn-btn" onClick={handleOpenEarnPoints}>
                    Đăng ký
                  </button>
                </>
              ) : (
                <>
                  {canAskAuthor && (
                    <button type="button" onClick={handleOpenAskAuthor}>
                      Ask author
                    </button>
                  )}
                  <button type="button" className="preview-earn-btn" onClick={handleOpenEarnPoints}>
                    Earn points
                  </button>
                </>
              )}
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
            disabled={isBusy || isSubmittingComment}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              if (e.nativeEvent?.isComposing) return;
              e.preventDefault();
              void handleCreateComment();
            }}
          />
          <button
            type="button"
            className="primary-btn"
            disabled={!commentInput.trim() || isBusy || isSubmittingComment}
            onClick={handleCreateComment}
          >
            {isSubmittingComment ? "Sending..." : "Send"}
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
                disabled={!reportReason.trim() || isSubmittingReport || isBusy}
                onClick={handleSubmitReport}
              >
                {isSubmittingReport ? "Sending..." : "Send report"}
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
            {isGuestMode ? (
              <>
                <p className="report-modal-sub">
                  Bạn chưa đăng nhập. Vui lòng đăng nhập hoặc đăng ký để hỏi tác giả.
                </p>
                <div className="report-modal-actions">
                  <button type="button" onClick={closeQaModal}>
                    Close
                  </button>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => onNavigateToLogin && onNavigateToLogin()}
                  >
                    Đăng nhập
                  </button>
                  <button type="button" onClick={() => onNavigateToRegister && onNavigateToRegister()}>
                    Đăng ký
                  </button>
                </div>
              </>
            ) : (
              <>
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
                  <button
                    type="button"
                    className="primary-btn"
                    disabled={isSubmittingQa || isBusy}
                    onClick={handleStartQa}
                  >
                    {isSubmittingQa ? "Starting..." : "Start Q&A"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isEarnPointsOpen && (
        <div className="report-modal-backdrop" role="dialog" aria-modal="true">
          <div className="report-modal">
            <div className="report-modal-head">
              <h3>How to earn points</h3>
              <button type="button" className="report-close-btn" onClick={closeEarnPointsModal}>
                ×
              </button>
            </div>
            <p className="report-modal-sub">Contribute to the community to unlock full view and downloads.</p>
            <ul className="earn-points-list">
              <li>Upload tài liệu mới và chờ moderator/admin duyệt.</li>
              <li>Tài liệu được duyệt sẽ nhận thêm điểm thưởng.</li>
              <li>Bình luận và trả lời thảo luận có chất lượng.</li>
              <li>Nhận upvote/đánh giá tích cực từ người dùng khác.</li>
              <li>Tham gia Q&A và hỗ trợ người học khác.</li>
            </ul>
            <div className="report-modal-actions">
              <button type="button" onClick={closeEarnPointsModal}>
                Close
              </button>
              {isGuestMode ? (
                <>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => onNavigateToLogin && onNavigateToLogin()}
                  >
                    Đăng nhập
                  </button>
                  <button type="button" onClick={() => onNavigateToRegister && onNavigateToRegister()}>
                    Đăng ký
                  </button>
                </>
              ) : (
                <button type="button" className="primary-btn" onClick={onClose}>
                  Go upload now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default PreviewPanel;
