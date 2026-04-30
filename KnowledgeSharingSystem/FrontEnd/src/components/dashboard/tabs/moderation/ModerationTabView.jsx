import { useMemo, useState } from "react";

import { useEffect } from "react";
import { createPortal } from "react-dom";

function ModalPortal({ children }) {
  if (typeof document === "undefined") return children;
  return createPortal(children, document.body);
}

function ModerationTabView(props) {
  const { model, controller } = props;
  const [commentNoteById, setCommentNoteById] = useState({});
  const [checkingDuplicateByDocId, setCheckingDuplicateByDocId] = useState({});
  const [duplicateModal, setDuplicateModal] = useState(null);
  const [pointReviewModal, setPointReviewModal] = useState(null);
  const [experienceNoticeModal, setExperienceNoticeModal] = useState(null);
  const [addingExperienceKey, setAddingExperienceKey] = useState("");
  const [reviewedQaRatingEventsById, setReviewedQaRatingEventsById] = useState({});
  const [isSubmittingPointReview, setIsSubmittingPointReview] = useState(false);
  const controlsDisabled = Boolean(model.isBusy);
  const isAnyModalOpen = Boolean(duplicateModal || pointReviewModal || experienceNoticeModal);

  const focus = model.moderationFocus || {};
  const focusedCommentId = Number(focus.commentId || 0);
  const focusedDocumentId = Number(focus.documentId || 0);
  const focusedQaSessionId = Number(focus.qaSessionId || 0);
  const focusedPointEventId = Number(focus.pointEventId || 0);
  const activeQueue = model.moderationQueue || "documents";
  const isDocumentsQueue = activeQueue === "documents";
  const isCommentsQueue = activeQueue === "comments";
  const isQaRatingsQueue = activeQueue === "qa-ratings";

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

  const prioritizedComments = useMemo(() => {
    const source = Array.isArray(model.pendingComments) ? model.pendingComments : [];
    if (!focusedCommentId && !focusedDocumentId) return source;
    return [...source].sort((a, b) => {
      const aScore =
        Number(a.commentId) === focusedCommentId
          ? 100
          : Number(a.documentId) === focusedDocumentId
            ? 10
            : 0;
      const bScore =
        Number(b.commentId) === focusedCommentId
          ? 100
          : Number(b.documentId) === focusedDocumentId
            ? 10
            : 0;
      return bScore - aScore;
    });
  }, [model.pendingComments, focusedCommentId, focusedDocumentId]);

  const prioritizedQaRatings = useMemo(() => {
    const source = Array.isArray(model.qaRatingEvents) ? model.qaRatingEvents : [];
    if (!focusedQaSessionId && !focusedPointEventId) return source;
    return [...source].sort((a, b) => {
      const aScore =
        Number(a.eventId) === focusedPointEventId
          ? 100
          : Number(a.qaSessionId) === focusedQaSessionId
            ? 10
            : 0;
      const bScore =
        Number(b.eventId) === focusedPointEventId
          ? 100
          : Number(b.qaSessionId) === focusedQaSessionId
            ? 10
            : 0;
      return bScore - aScore;
    });
  }, [model.qaRatingEvents, focusedQaSessionId, focusedPointEventId]);

  const qaRatingReviewItems = useMemo(() => {
    const pendingIds = new Set(
      prioritizedQaRatings.map((event) => Number(event.eventId || 0)).filter((eventId) => eventId > 0),
    );
    const pendingItems = prioritizedQaRatings.map((event) => ({
      ...event,
      reviewState:
        event.reviewState ||
        (String(event.status || "").toLowerCase() === "approved" ? "reviewed" : "pending"),
    }));
    const reviewedItems = Object.values(reviewedQaRatingEventsById)
      .filter((event) => !pendingIds.has(Number(event.eventId || 0)))
      .sort((a, b) => {
        const aTime = new Date(a.reviewedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.reviewedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      });

    return [...pendingItems, ...reviewedItems];
  }, [prioritizedQaRatings, reviewedQaRatingEventsById]);

  const standaloneCommentPointEvents = useMemo(() => {
    const pendingCommentIds = new Set(
      prioritizedComments.map((comment) => Number(comment.commentId || 0)).filter((id) => id > 0),
    );
    return (Array.isArray(model.commentPointEvents) ? model.commentPointEvents : []).filter(
      (event) => !pendingCommentIds.has(Number(event.commentId || 0)),
    );
  }, [model.commentPointEvents, prioritizedComments]);

  const formatDate = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
  };

  const getCourseLabel = (doc) =>
    doc?.categoryName || doc?.courseName || doc?.course || doc?.categoryNames || "N/A";

  const getQaRatingDetails = (event) => {
    const meta = event?.metadataJson || {};
    const stars = Number(meta.stars || event?.stars || 0);
    const questionSummary = String(meta.questionSummary || "").trim();
    const authorSolution = String(meta.authorSolution || "").trim();
    const satisfactionNote = String(meta.satisfactionNote || meta.feedback || "").trim();
    const feedback = String(meta.feedback || satisfactionNote || "").trim();
    const isSatisfied =
      typeof meta.isSatisfied === "boolean"
        ? meta.isSatisfied
        : meta.isSatisfied === null || meta.isSatisfied === undefined || meta.isSatisfied === ""
          ? null
          : String(meta.isSatisfied || "").toLowerCase() === "true";

    return {
      stars,
      questionSummary,
      authorSolution,
      satisfactionNote,
      feedback,
      isSatisfied,
      feedbackId: Number(meta.feedbackId || 0),
    };
  };

  const getDuplicateSummary = (result) => {
    const check = result?.plagiarismCheck || result || {};
    const candidates = Array.isArray(check.topCandidates) ? check.topCandidates : [];
    const topCandidate = candidates[0] || null;
    const percent = Number(check.maxPlagiarismPercent || topCandidate?.plagiarismPercent || 0);
    const comparedTitle = topCandidate?.title || topCandidate?.documentTitle || "không có tài liệu trùng đáng kể";

    if (!topCandidate || percent <= 0) {
      return {
        title: "Không phát hiện đạo văn đáng kể",
        message: "Không tìm thấy tài liệu có mức trùng lặp đáng kể trong hệ thống.",
        percent: 0,
        comparedTitle,
        candidates,
      };
    }

    return {
      title: "Kết quả kiểm tra đạo văn",
      message: `Có ${percent}% đạo văn với tài liệu "${comparedTitle}".`,
      percent,
      comparedTitle,
      candidates,
    };
  };

  const handleCheckDuplicate = async (doc) => {
    const documentId = Number(doc?.documentId || doc || 0);
    if (!documentId || controlsDisabled || checkingDuplicateByDocId[documentId]) return;

    setCheckingDuplicateByDocId((prev) => ({ ...prev, [documentId]: true }));
    try {
      const result = await controller.onCheckDuplicate(documentId);
      if (result) {
        setDuplicateModal({
          documentId,
          documentTitle: doc?.title || `Document #${documentId}`,
          summary: getDuplicateSummary(result),
        });
      }
    } finally {
      setCheckingDuplicateByDocId((prev) => ({ ...prev, [documentId]: false }));
    }
  };

  const openPointReviewModal = ({ event, context }) => {
    setPointReviewModal({
      event,
      context,
      points: String(event?.points ?? 10),
      note: "",
    });
  };

  const closePointReviewModal = () => {
    if (isSubmittingPointReview) return;
    setPointReviewModal(null);
  };

  const submitPointReviewModal = async () => {
    if (!pointReviewModal || isSubmittingPointReview) return;
    const eventId = Number(pointReviewModal.event?.eventId || 0);
    const parsedPoints = Number(pointReviewModal.points);
    const isCommentPoint = pointReviewModal.context?.kind === "comment";
    const isQaRatingPoint = pointReviewModal.context?.kind === "qa_rating";
    const eventSnapshot = pointReviewModal.event;
    const reviewNote =
      pointReviewModal.note || `Moderator scored event #${eventId} with ${parsedPoints} points.`;

    if (!Number.isInteger(eventId) || eventId <= 0) return;
    if (!Number.isInteger(parsedPoints)) {
      setExperienceNoticeModal({
        title: "Điểm không hợp lệ",
        message: "Điểm phải là số nguyên.",
      });
      return;
    }
    if (isCommentPoint && (parsedPoints < 0 || parsedPoints > 15)) {
      setExperienceNoticeModal({
        title: "Điểm không hợp lệ",
        message: "Điểm comment hợp lệ là số nguyên từ 0 đến 15.",
      });
      return;
    }

    setIsSubmittingPointReview(true);
    try {
      await controller.onApprovePointEventInline(eventId, parsedPoints, reviewNote);
      if (isQaRatingPoint) {
        setReviewedQaRatingEventsById((prev) => ({
          ...prev,
          [eventId]: {
            ...(prev[eventId] || {}),
            ...eventSnapshot,
            eventId,
            points: parsedPoints,
            reviewedPoints: parsedPoints,
            reviewNote,
            reviewState: "reviewed",
            reviewedAt: new Date().toISOString(),
          },
        }));
      }
      setPointReviewModal(null);
    } finally {
      setIsSubmittingPointReview(false);
    }
  };

  const renderDuplicateList = (documentId) => {
    const rows = model.duplicateByDocId[documentId];
    if (!rows) return null;

    return (
      <div className="duplicates-box">
        {rows.length === 0 ? (
          <p>No duplicate found.</p>
        ) : (
          <ul>
            {rows.map((dup) => (
              <li key={`${documentId}-${dup.documentId}`}>
                #{dup.documentId} - {dup.title || dup.documentTitle} ({dup.duplicateReason || `${dup.plagiarismPercent || 0}%`})
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const renderDocumentCard = (doc, options = {}) => {
    const documentId = Number(doc.documentId || 0);
    const isChecking = Boolean(checkingDuplicateByDocId[documentId]);
    const isFocused = Number(focusedDocumentId) === documentId;

    return (
      <article key={`${options.kind || "document"}-${documentId}`} className={`moderation-item ${isFocused ? "is-focused" : ""}`}>
        <div className="moderation-document-head">
          <div>
            <h3>
              #{documentId} - {doc.title}
            </h3>
            <p>
              Owner: <b>{doc.ownerName || "N/A"}</b>
              {doc.ownerEmail ? ` (${doc.ownerEmail})` : ""}
            </p>
            <p>Course: <b>{getCourseLabel(doc)}</b></p>
            <p>Updated: <b>{formatDate(doc.updatedAt || doc.createdAt)}</b></p>
            {options.reported && (
              <>
                <p>
                  Reports: <b>{doc.totalReports || 0}</b> | Unique reporters: <b>{doc.uniqueReporterCount || 0}</b>
                </p>
                {doc.latestReportReason && <p>Latest reason: {doc.latestReportReason}</p>}
              </>
            )}
          </div>
          <span className={`moderation-status-pill ${String(doc.status || "pending").toLowerCase()}`}>
            {doc.status || (options.reported ? "Reported" : "Pending")}
          </span>
        </div>

        <div className="action-row">
          <button type="button" disabled={controlsDisabled} onClick={() => controller.onOpenPreview(doc)}>
            Open
          </button>
          <button type="button" disabled={controlsDisabled || isChecking} onClick={() => handleCheckDuplicate(doc)}>
            {isChecking ? "Checking..." : "Check duplicate"}
          </button>
          {!options.reported && (
            <>
              <button type="button" disabled={controlsDisabled} onClick={() => controller.onApprove(documentId)}>
                Approve
              </button>
              <button type="button" className="danger" disabled={controlsDisabled} onClick={() => controller.onReject(documentId)}>
                Reject
              </button>
            </>
          )}
          {options.reported ? (
            <>
              <button disabled={controlsDisabled} onClick={() => controller.onResolveReportedUnlock(documentId)}>
                Unlock
              </button>
              <button className="danger" disabled={controlsDisabled} onClick={() => controller.onResolveReportedDelete(documentId)}>
                Delete + Penalty
              </button>
            </>
          ) : (
            <button className="danger" disabled={controlsDisabled} onClick={() => controller.onDelete(documentId)}>
              Delete
            </button>
          )}
        </div>
        {renderDuplicateList(documentId)}
      </article>
    );
  };

  const handleAddCommentExperience = async (comment) => {
    const commentId = Number(comment?.commentId || 0);
    if (!commentId || controlsDisabled || addingExperienceKey) return;
    setAddingExperienceKey(`comment:${commentId}`);
    try {
      await controller.onAddCommentExperience(comment);
      setExperienceNoticeModal({
        title: "Đã thêm kinh nghiệm",
        message: `Bình luận #${commentId} đã được thêm vào trang tổng hợp kinh nghiệm của tài liệu.`,
      });
    } catch (error) {
      setExperienceNoticeModal({
        title: "Không thể thêm kinh nghiệm",
        message: error?.message || "Không thể thêm bình luận này vào trang tổng hợp kinh nghiệm.",
      });
    } finally {
      setAddingExperienceKey("");
    }
  };

  const handleAddQaRatingExperience = async (event) => {
    const eventId = Number(event?.eventId || 0);
    if (!eventId || controlsDisabled || addingExperienceKey) return;
    setAddingExperienceKey(`qa-rating:${eventId}`);
    try {
      await controller.onAddQaRatingExperience(event);
      setReviewedQaRatingEventsById((prev) => ({
        ...prev,
        [eventId]: {
          ...(prev[eventId] || event),
          eventId,
          experienceAdded: true,
          experienceAddedAt: new Date().toISOString(),
        },
      }));
      setExperienceNoticeModal({
        title: "Đã thêm kinh nghiệm",
        message: `Q&A rating event #${eventId} đã được thêm vào trang tổng hợp kinh nghiệm của tài liệu.`,
      });
    } catch (error) {
      setExperienceNoticeModal({
        title: "Không thể thêm kinh nghiệm",
        message: error?.message || "Không thể thêm đánh giá Q&A này vào trang tổng hợp kinh nghiệm.",
      });
    } finally {
      setAddingExperienceKey("");
    }
  };

  const handleDeleteQaRating = async (event) => {
    const eventId = Number(event?.eventId || 0);
    if (!eventId || controlsDisabled || addingExperienceKey) return;
    const confirmed = window.confirm(
      `Delete Q&A rating event #${eventId}? This will remove the rating feedback and revert approved points if needed.`,
    );
    if (!confirmed) return;

    setReviewedQaRatingEventsById((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
    await controller.onDeleteQaRating(eventId);
  };

  const renderQaRatingReviewSection = () => (
    <>
      <div className="moderation-subhead">
        <h3>QA Rating Review</h3>
        <p>Review user rating feedback, approve owner reward points, and add useful answers to hidden knowledge.</p>
      </div>
      {qaRatingReviewItems.length === 0 ? (
        <p className="subtle-text">No pending Q&A rating events.</p>
      ) : (
        <div className="moderation-list">
          {qaRatingReviewItems.map((event) => {
            const details = getQaRatingDetails(event);
            const isReviewed = String(event.reviewState || "").toLowerCase() === "reviewed";
            const reviewedPoints = Number(event.reviewedPoints ?? event.points ?? 0);
            const isFocused =
              Number(event.eventId) === focusedPointEventId ||
              (focusedPointEventId <= 0 && focusedQaSessionId > 0 && Number(event.qaSessionId) === focusedQaSessionId);
            const addKey = `qa-rating:${Number(event.eventId || 0)}`;

            return (
              <article
                key={`qa-rating-event-${event.eventId}`}
                className={`moderation-item moderation-rating-item ${isFocused ? "is-focused" : ""}`}
              >
                <h3>
                  Session #{event.qaSessionId} rating {isFocused ? "- From notification" : ""}
                </h3>
                {(isReviewed || event.experienceAdded) && (
                  <div className="moderation-card-status-row">
                    {isReviewed && (
                      <span className="moderation-reviewed-badge">
                        Đã đánh giá: {reviewedPoints} điểm
                      </span>
                    )}
                    {event.experienceAdded && (
                      <span className="moderation-experience-badge">Đã thêm kinh nghiệm</span>
                    )}
                  </div>
                )}
                <p>
                  Document #{event.documentId || "N/A"}: <b>{event.documentTitle || "N/A"}</b>
                </p>
                <p>
                  Owner reward target: <b>{event.userName || event.username || `User #${event.userId}`}</b>
                </p>
                <p>
                  Rating: <b>{details.stars > 0 ? `${details.stars}/5` : "N/A"}</b>
                  {typeof details.isSatisfied === "boolean"
                    ? ` - ${details.isSatisfied ? "Satisfied" : "Not satisfied"}`
                    : ""}
                </p>
                {details.questionSummary && (
                  <p>
                    Thắc mắc: <b>{details.questionSummary}</b>
                  </p>
                )}
                {details.authorSolution && (
                  <p>
                    Cách tác giả giải đáp: <b>{details.authorSolution}</b>
                  </p>
                )}
                <p>
                  Feedback: <b>{details.feedback || "No feedback text."}</b>
                </p>
                <p>
                  {isReviewed ? "Reviewed points" : "Suggested points"}: <b>{event.points}</b>
                </p>
                <div className="action-row">
                  <button
                    type="button"
                    disabled={controlsDisabled || !Number(event.documentId || 0)}
                    onClick={() =>
                      controller.onOpenPreview({
                        documentId: event.documentId,
                        title: event.documentTitle,
                      })
                    }
                  >
                    Open document
                  </button>
                  {isReviewed ? (
                    <span className="moderation-reviewed-badge">Đã đánh giá: {reviewedPoints} điểm</span>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={controlsDisabled}
                        onClick={() => openPointReviewModal({ event, context: { kind: "qa_rating" } })}
                      >
                        Evaluate points
                      </button>
                      <button
                        type="button"
                        className="danger"
                        disabled={controlsDisabled}
                        onClick={() => controller.onRejectPointEventInline(event.eventId, "Rejected by moderator.")}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    disabled={controlsDisabled || Boolean(addingExperienceKey)}
                    onClick={() => handleAddQaRatingExperience(event)}
                  >
                    {addingExperienceKey === addKey ? "Adding..." : "Add experience"}
                  </button>
                  <button
                    type="button"
                    className="danger"
                    disabled={controlsDisabled || Boolean(addingExperienceKey)}
                    onClick={() => handleDeleteQaRating(event)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );

  if (!model.isModerator) {
    return (
      <section className="panel">
        <h2>Moderation queue</h2>
        <p>No permission.</p>
      </section>
    );
  }

  return (
    <section className="panel moderation-panel">
      <div className="moderation-header-row">
        <div>
          <h2>Moderator Workspace</h2>
          <p>Review documents, comments, and Q&A ratings in separated moderation URLs.</p>
        </div>
        <button type="button" disabled={controlsDisabled} onClick={() => controller.onRefreshOverview()}>
          Refresh overview
        </button>
      </div>

      <div className="moderation-queue-tabs" aria-label="Moderation queue sections">
        <button
          type="button"
          className={isDocumentsQueue ? "active" : ""}
          onClick={() => controller.onChangeQueue("documents")}
        >
          Documents
        </button>
        <button
          type="button"
          className={isCommentsQueue ? "active" : ""}
          onClick={() => controller.onChangeQueue("comments")}
        >
          Comments
        </button>
        <button
          type="button"
          className={isQaRatingsQueue ? "active" : ""}
          onClick={() => controller.onChangeQueue("qa-ratings")}
        >
          QA Rating Review
        </button>
      </div>

      {controlsDisabled && <p className="hint">Processing moderation action...</p>}

      <div className="moderation-dashboard-cards">
        <article className="moderation-dashboard-card">
          <span>Pending documents</span>
          <b>{Number(model.queueSummary?.pendingDocs || 0)}</b>
        </article>
        <article className="moderation-dashboard-card">
          <span>Pending comments</span>
          <b>{Number(model.queueSummary?.pendingComments || 0)}</b>
        </article>
        <article className="moderation-dashboard-card">
          <span>Pending reports</span>
          <b>{Number(model.queueSummary?.pendingReports || 0)}</b>
        </article>
        <article className="moderation-dashboard-card">
          <span>Pending point events</span>
          <b>{Number(model.queueSummary?.pendingPointEvents || 0)}</b>
        </article>
        <article className="moderation-dashboard-card">
          <span>Pending Q&A ratings</span>
          <b>{Number(model.pendingQaRatingCount || 0)}</b>
        </article>
      </div>

      {isDocumentsQueue ? (
        <>
          <div className="moderation-subhead">
            <h3>Pending uploads</h3>
            <p>Open the document, check duplicate, then approve or reject.</p>
          </div>
          {model.pendingDocs.length === 0 ? (
            <p className="subtle-text">No pending documents.</p>
          ) : (
            <div className="moderation-list">
              {model.pendingDocs.map((doc) => renderDocumentCard(doc, { kind: "pending" }))}
            </div>
          )}
          <div className="moderation-subhead">
            <h3>Reported documents</h3>
            <p>Auto-locked documents with active report signals.</p>
          </div>
          {model.reportedDocs.length === 0 ? (
            <p className="subtle-text">No active reported documents.</p>
          ) : (
            <div className="moderation-list">
              {model.reportedDocs.map((doc) => renderDocumentCard(doc, { kind: "reported", reported: true }))}
            </div>
          )}
        </>
      ) : isCommentsQueue ? (
        <>
          <div className="moderation-subhead">
            <h3>Comment point review</h3>
            <p>Open the document from notification or score comment point events here.</p>
          </div>

          {prioritizedComments.length === 0 ? (
            <p className="subtle-text">No pending comments.</p>
          ) : (
            <div className="moderation-list">
              {prioritizedComments.map((comment) => {
                const linkedPointEvents = model.commentPointEventsByCommentId?.[Number(comment.commentId)] || [];
                const isFocused =
                  Number(comment.commentId) === focusedCommentId ||
                  (focusedCommentId <= 0 && focusedDocumentId > 0 && Number(comment.documentId) === focusedDocumentId);

                return (
                  <article
                    key={`pending-comment-${comment.commentId}`}
                    className={`moderation-item moderation-comment-item ${isFocused ? "is-focused" : ""}`}
                  >
                    <h3>
                      Comment #{comment.commentId} {isFocused ? "- From notification" : ""}
                    </h3>
                    <p>
                      Document #{comment.documentId}: <b>{comment.documentTitle}</b>
                    </p>
                    <p>
                      Author: <b>{comment.authorName}</b>
                    </p>
                    <p className="moderation-comment-content">{comment.content}</p>
                    <div className="action-row">
                      <button
                        type="button"
                        disabled={controlsDisabled}
                        onClick={() => controller.onOpenPreview({ documentId: comment.documentId, title: comment.documentTitle })}
                      >
                        Open document
                      </button>
                      <button
                        type="button"
                        disabled={controlsDisabled}
                        onClick={() => controller.onApproveComment(comment.commentId, commentNoteById[comment.commentId] || "")}
                      >
                        Approve comment
                      </button>
                      <button
                        type="button"
                        className="danger"
                        disabled={controlsDisabled}
                        onClick={() => controller.onRejectComment(comment.commentId, commentNoteById[comment.commentId] || "")}
                      >
                        Reject comment
                      </button>
                      <button
                        type="button"
                        className="danger"
                        disabled={controlsDisabled}
                        onClick={() => controller.onHideComment(comment.commentId, comment.documentId)}
                      >
                        Hide comment
                      </button>
                    </div>

                    <textarea
                      className="moderation-note-input"
                      rows={2}
                      placeholder="Review note for comment (required when reject)"
                      value={commentNoteById[comment.commentId] || ""}
                      disabled={controlsDisabled}
                      onChange={(event) =>
                        setCommentNoteById((prev) => ({ ...prev, [comment.commentId]: event.target.value }))
                      }
                    />

                    {linkedPointEvents.length > 0 && (
                      <div className="moderation-linked-events">
                        <h4>Point events generated from this comment</h4>
                        {linkedPointEvents.map((event) => (
                          <div
                            key={`comment-event-${event.eventId}`}
                            className={`moderation-inline-event ${Number(event.eventId) === focusedPointEventId ? "is-focused" : ""}`}
                          >
                            <p>
                              Event #{event.eventId} - <b>{event.eventType}</b> - Suggested points: <b>{event.points}</b>
                            </p>
                            <div className="action-row">
                              <button
                                type="button"
                                disabled={controlsDisabled}
                                onClick={() => openPointReviewModal({ event, context: { kind: "comment", comment } })}
                              >
                                Evaluate 0-15 points
                              </button>
                              <button
                                type="button"
                                className="danger"
                                disabled={controlsDisabled}
                                onClick={() => controller.onRejectPointEventInline(event.eventId, "Rejected by moderator.")}
                              >
                                Reject points
                              </button>
                              <button
                                type="button"
                                disabled={controlsDisabled || Boolean(addingExperienceKey)}
                                onClick={() => handleAddCommentExperience(comment)}
                              >
                                {addingExperienceKey === `comment:${Number(comment.commentId || 0)}` ? "Adding..." : "Add experience"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {standaloneCommentPointEvents.length > 0 && (
            <>
              <div className="moderation-subhead">
                <h3>Comment point events</h3>
                <p>Approved comments that still need moderator point scoring.</p>
              </div>
              <div className="moderation-list">
                {standaloneCommentPointEvents.map((event) => (
                  <article
                    key={`standalone-comment-event-${event.eventId}`}
                    className={`moderation-item ${Number(event.eventId) === focusedPointEventId ? "is-focused" : ""}`}
                  >
                    <h3>Comment #{event.commentId} point review</h3>
                    <p>
                      Document #{event.documentId}: <b>{event.documentTitle || "N/A"}</b>
                    </p>
                    <p>
                      User: <b>{event.userName || event.username || `#${event.userId}`}</b>
                    </p>
                    <p>
                      Event #{event.eventId} - <b>{event.eventType}</b> - Suggested points: <b>{event.points}</b>
                    </p>
                    <div className="action-row">
                      <button
                        type="button"
                        disabled={controlsDisabled}
                        onClick={() =>
                          controller.onOpenPreview({
                            documentId: event.documentId,
                            title: event.documentTitle,
                          })
                        }
                      >
                        Open document
                      </button>
                      <button
                        type="button"
                        disabled={controlsDisabled}
                        onClick={() => openPointReviewModal({ event, context: { kind: "comment" } })}
                      >
                        Evaluate 0-15 points
                      </button>
                      <button
                        type="button"
                        className="danger"
                        disabled={controlsDisabled}
                        onClick={() => controller.onRejectPointEventInline(event.eventId, "Rejected by moderator.")}
                      >
                        Reject points
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {renderQaRatingReviewSection()}
        </>
      )}

      {duplicateModal && (
        <ModalPortal>
          <div className="report-modal-backdrop" role="dialog" aria-modal="true">
            <div className="report-modal duplicate-result-modal">
            <div className="report-modal-head">
              <h3>{duplicateModal.summary.title}</h3>
              <button type="button" className="report-close-btn" onClick={() => setDuplicateModal(null)}>
                x
              </button>
            </div>
            <p className="report-modal-sub">#{duplicateModal.documentId} - {duplicateModal.documentTitle}</p>
            <div className="duplicate-result-box">
              <strong>{duplicateModal.summary.message}</strong>
              {duplicateModal.summary.candidates.length > 0 && (
                <ul>
                  {duplicateModal.summary.candidates.slice(0, 5).map((candidate) => (
                    <li key={`dup-modal-${candidate.documentId}`}>
                      #{candidate.documentId} - {candidate.title || candidate.documentTitle} - {candidate.plagiarismPercent || candidate.similarityPercent || 0}%
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="report-modal-actions">
              <button type="button" className="primary-btn" onClick={() => setDuplicateModal(null)}>
                Xác nhận
              </button>
            </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {pointReviewModal && (
        <ModalPortal>
          <div className="report-modal-backdrop" role="dialog" aria-modal="true">
            <div className="report-modal point-review-modal">
            <div className="report-modal-head">
              <h3>Chấm điểm đóng góp</h3>
              <button type="button" className="report-close-btn" onClick={closePointReviewModal}>
                x
              </button>
            </div>
            <p className="report-modal-sub">
              Event #{pointReviewModal.event?.eventId} - {pointReviewModal.event?.eventType}
            </p>
            <label className="point-review-field">
              <span>{pointReviewModal.context?.kind === "comment" ? "Điểm bình luận (0-15)" : "Điểm"}</span>
              <input
                type="number"
                min={pointReviewModal.context?.kind === "comment" ? "0" : undefined}
                max={pointReviewModal.context?.kind === "comment" ? "15" : undefined}
                value={pointReviewModal.points}
                disabled={isSubmittingPointReview || controlsDisabled}
                onChange={(event) => setPointReviewModal((prev) => ({ ...prev, points: event.target.value }))}
              />
            </label>
            <label className="point-review-field">
              <span>Ghi chú kiểm duyệt</span>
              <textarea
                rows={4}
                value={pointReviewModal.note}
                disabled={isSubmittingPointReview || controlsDisabled}
                onChange={(event) => setPointReviewModal((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="Nhập lý do hoặc nhận xét chấm điểm"
              />
            </label>
            <div className="report-modal-actions">
              <button type="button" onClick={closePointReviewModal} disabled={isSubmittingPointReview}>
                Hủy
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={isSubmittingPointReview || controlsDisabled}
                onClick={submitPointReviewModal}
              >
                {isSubmittingPointReview ? "Đang lưu..." : "Xác nhận chấm điểm"}
              </button>
            </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {experienceNoticeModal && (
        <ModalPortal>
          <div className="report-modal-backdrop" role="dialog" aria-modal="true">
            <div className="report-modal point-review-modal">
              <div className="report-modal-head">
                <h3>{experienceNoticeModal.title}</h3>
                <button type="button" className="report-close-btn" onClick={() => setExperienceNoticeModal(null)}>
                  x
                </button>
              </div>
              <p className="report-modal-sub">{experienceNoticeModal.message}</p>
              <div className="report-modal-actions">
                <button type="button" className="primary-btn" onClick={() => setExperienceNoticeModal(null)}>
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </section>
  );
}

export default ModerationTabView;
