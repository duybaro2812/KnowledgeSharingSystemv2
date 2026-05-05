import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const PDFJS_MODULE_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.min.mjs";
const PDFJS_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs";

function ModalPortal({ children }) {
  if (typeof document === "undefined") return children;
  return createPortal(children, document.body);
}

function PaperPlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M21.8 3.7 18.3 20c-.2.9-1.2 1.2-1.9.7l-5.1-3.8-2.5 2.4c-.5.5-1.4.2-1.4-.6v-3.8L2.6 13c-.9-.3-.9-1.6 0-2L20.2 2.4c.9-.4 1.8.4 1.6 1.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LimitedPdfPreview({ fileUrl, pageLimit = 5, totalPages = null, lockOverlayContent = null }) {
  const hostRef = useRef(null);
  const lockedHostRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [renderedPages, setRenderedPages] = useState(0);
  const parsedPageLimit = Number(pageLimit);
  const normalizedPageLimit = Number.isFinite(parsedPageLimit) && parsedPageLimit > 0 ? parsedPageLimit : 3;
  const parsedTotalPages = Number(totalPages);
  const safeTotalPages =
    Number.isFinite(parsedTotalPages) && parsedTotalPages > normalizedPageLimit
      ? parsedTotalPages
      : normalizedPageLimit + 2;
  const lockedPagePreviewCount = Math.max(
    1,
    Math.min(3, safeTotalPages - normalizedPageLimit),
  );
  const hasLockOverlay = Boolean(lockOverlayContent);

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
      const lockedHostElement = lockedHostRef.current;
      hostElement.innerHTML = "";
      if (lockedHostElement) lockedHostElement.innerHTML = "";
      setError("");
      setIsLoading(true);
      setRenderedPages(0);

      try {
        const pdfJs = await import(/* @vite-ignore */ PDFJS_MODULE_URL);
        pdfJs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        loadingTask = pdfJs.getDocument({ url: fileUrl });
        const pdfDocument = await loadingTask.promise;
        const totalPagesToRender = Math.max(1, Math.min(normalizedPageLimit, Number(pdfDocument.numPages || 0)));
        const totalLockedPagesToRender =
          hasLockOverlay && lockedHostElement
            ? Math.min(
                Number(pdfDocument.numPages || 0),
                normalizedPageLimit + lockedPagePreviewCount,
              )
            : totalPagesToRender;

        const renderPage = async (pageIndex, targetElement, isLockedPage = false) => {
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
          pageShell.className = isLockedPage
            ? "limited-preview-page limited-preview-page-locked"
            : "limited-preview-page";
          const pageBadge = document.createElement("span");
          pageBadge.className = "limited-preview-page-number";
          pageBadge.textContent = `Page ${pageIndex}`;
          pageShell.appendChild(pageBadge);
          pageShell.appendChild(canvas);
          targetElement.appendChild(pageShell);
        };

        for (let pageIndex = 1; pageIndex <= totalPagesToRender; pageIndex += 1) {
          await renderPage(pageIndex, hostElement);
          setRenderedPages(pageIndex);
        }

        for (let pageIndex = normalizedPageLimit + 1; pageIndex <= totalLockedPagesToRender; pageIndex += 1) {
          await renderPage(pageIndex, lockedHostElement, true);
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
  }, [fileUrl, normalizedPageLimit, lockedPagePreviewCount, hasLockOverlay]);

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
        <p>Showing first {normalizedPageLimit} pages</p>
      </div>
      <div className="limited-preview-shell">
        {isLoading && (
          <div className="limited-preview-loading">
            <span className="limited-preview-spinner" />
            <p>Loading first {normalizedPageLimit} pages...</p>
          </div>
        )}
        <div ref={hostRef} className="limited-preview-host" />
        {lockOverlayContent && (
          <div className={isLoading || renderedPages <= 0 ? "limited-preview-lock-zone is-pending" : "limited-preview-lock-zone"}>
            <div ref={lockedHostRef} className="limited-preview-locked-pages" aria-hidden="true" />
            {!isLoading && renderedPages > 0 && (
              <div className="preview-lock-overlay preview-lock-overlay-embedded">
                {lockOverlayContent}
              </div>
            )}
          </div>
        )}
        {!isLoading && renderedPages <= 0 && (
          <div className="preview-unavailable-state limited-preview-fallback">
            <h3>No preview pages</h3>
            <p>This document preview is not ready yet.</p>
          </div>
        )}
      </div>
      {!lockOverlayContent && (
        <div className="limited-viewer-footer">
          <span>Locked after page {normalizedPageLimit}</span>
        </div>
      )}
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
    onRestoreComment,
    onDeleteHiddenComment,
    onOpenHiddenKnowledge,
    onSaveHiddenKnowledge,
    onAddHiddenKnowledgeFromComment,
    isGuestMode,
    onNavigateToLogin,
    onNavigateToRegister,
    focusCommentId = null,
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
  const [isHiddenKnowledgeOpen, setIsHiddenKnowledgeOpen] = useState(false);
  const [hiddenKnowledge, setHiddenKnowledge] = useState(null);
  const [hiddenKnowledgeTitle, setHiddenKnowledgeTitle] = useState("");
  const [hiddenKnowledgeContent, setHiddenKnowledgeContent] = useState("");
  const [hiddenKnowledgeStatus, setHiddenKnowledgeStatus] = useState("draft");
  const [hiddenKnowledgeError, setHiddenKnowledgeError] = useState("");
  const [isLoadingHiddenKnowledge, setIsLoadingHiddenKnowledge] = useState(false);
  const [isSavingHiddenKnowledge, setIsSavingHiddenKnowledge] = useState(false);
  const [addingKnowledgeCommentId, setAddingKnowledgeCommentId] = useState(null);
  const [isDownloadConfirmOpen, setIsDownloadConfirmOpen] = useState(false);
  const [isSubmittingDownload, setIsSubmittingDownload] = useState(false);
  const [isDownloadSuccessOpen, setIsDownloadSuccessOpen] = useState(false);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState("");
  const [commentPointModal, setCommentPointModal] = useState(null);
  const [isSubmittingCommentPoint, setIsSubmittingCommentPoint] = useState(false);
  const [hideCommentModal, setHideCommentModal] = useState(null);
  const [isSubmittingHideComment, setIsSubmittingHideComment] = useState(false);
  const [deleteCommentModal, setDeleteCommentModal] = useState(null);
  const [deleteCommentReason, setDeleteCommentReason] = useState("");
  const [deleteCommentPenalty, setDeleteCommentPenalty] = useState("0");
  const [isSubmittingDeleteComment, setIsSubmittingDeleteComment] = useState(false);
  const previewFrameWrapRef = useRef(null);
  const commentsPanelRef = useRef(null);
  const commentItemRefs = useRef({});
  const focusedCommentScrollKeyRef = useRef("");
  const currentPreviewDocId = Number(previewDoc?.documentId || 0);

  useEffect(() => {
    setDownloadSuccessMessage("");
    setIsDownloadSuccessOpen(false);
  }, [currentPreviewDocId]);

  const isDownloadModalOpen =
    isDownloadConfirmOpen ||
    isDownloadSuccessOpen ||
    Boolean(commentPointModal) ||
    Boolean(hideCommentModal) ||
    Boolean(deleteCommentModal) ||
    isReportOpen ||
    isQaOpen ||
    isEarnPointsOpen ||
    isHiddenKnowledgeOpen;

  useEffect(() => {
    if (!isDownloadModalOpen || typeof document === "undefined") return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isDownloadModalOpen]);

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
  const flattenedComments = useMemo(() => (Array.isArray(comments) ? comments : []), [comments]);

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
  const isGuestLike =
    Boolean(isGuestMode) ||
    String(previewDoc.currentUserRole || "").toLowerCase() === "guest" ||
    !Number.isInteger(Number(currentUserId)) ||
    Number(currentUserId) <= 0;
  const isModeratorOrAdmin = ["moderator", "admin"].includes(
    String(previewDoc.currentUserRole || "").toLowerCase(),
  );

  useEffect(() => {
    const targetCommentId = Number(focusCommentId || 0);
    if (targetCommentId <= 0 || docId <= 0) return;

    const key = `${docId}:${targetCommentId}`;
    if (focusedCommentScrollKeyRef.current === key) return;

    const targetElement = commentItemRefs.current[targetCommentId] || commentsPanelRef.current;
    if (!targetElement) return;

    focusedCommentScrollKeyRef.current = key;
    window.setTimeout(() => {
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }, 120);
  }, [docId, focusCommentId, flattenedComments.length]);
  const accessState = String(previewDoc.accessState || "").toLowerCase();
  const tier = String(previewDoc.tier || "").toLowerCase();
  const isPrivilegedState = accessState === "privileged" || tier === "privileged";
  const isFullState = accessState === "full_access" || tier === "full_access";
  const isDownloadUnlockedState =
    accessState === "download_unlocked" || tier === "download_unlocked";
  const isLimitedState = accessState === "limited_full" || tier === "view_limited";
  const hasFullAccess =
    !isLocked &&
    (Boolean(previewDoc.canFullView) || isPrivilegedState || isFullState || isDownloadUnlockedState);
  const lockedOverlayTitle =
    previewDoc.lockedOverlay?.title === "This document is locked"
      ? "Tài liệu này đang bị khóa"
      : previewDoc.lockedOverlay?.title || "Tài liệu này đang bị khóa";
  const lockedOverlayMessage =
    previewDoc.lockedOverlay?.message ||
    `Bạn cần ít nhất ${previewDoc.requiredPoints} điểm để mở khóa tài liệu này.`;
  const lockedOverlayHelper =
    previewDoc.lockedOverlay?.helperText ||
    "Bạn vẫn có thể thảo luận, bình luận, trả lời và đặt câu hỏi cho chủ sở hữu tài liệu.";
  const isGuestLockedState =
    accessState === "guest_locked" ||
    tier === "guest_locked";
  const shouldShowAuthCta = isGuestLike || isGuestLockedState;
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
  const effectiveDownloadCost = Number(
    previewDoc.downloadConfirmation?.pointsCost ?? previewDoc.downloadCost ?? 0,
  );
  const effectivePointsAfterDownload = Number.isFinite(
    Number(previewDoc.downloadConfirmation?.pointsAfterIfConfirmed),
  )
    ? Number(previewDoc.downloadConfirmation.pointsAfterIfConfirmed)
    : Math.max(0, Number(previewDoc.points || 0) - effectiveDownloadCost);

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

  const openDownloadConfirm = () => {
    if (!onDownload || !previewDoc.canDownload || isLoading || isBusy || isSubmittingDownload) return;
    setIsDownloadConfirmOpen(true);
  };

  const closeDownloadConfirm = () => {
    if (isSubmittingDownload) return;
    setIsDownloadConfirmOpen(false);
  };

  const handleConfirmDownload = async () => {
    if (!onDownload || isSubmittingDownload || isBusy) return;
    setIsSubmittingDownload(true);
    try {
      const result = await onDownload(docId, previewDoc);
      if (result !== false) {
        setDownloadSuccessMessage(
          "Tài liệu đã được tải xuống thành công. Nhấn xác nhận để tải lại trang và cập nhật điểm.",
        );
        setIsDownloadSuccessOpen(true);
      }
      setIsDownloadConfirmOpen(false);
    } finally {
      setIsSubmittingDownload(false);
    }
  };

  const confirmDownloadSuccessReload = () => {
    setIsDownloadSuccessOpen(false);
    window.location.reload();
  };

  const hydrateHiddenKnowledgeDraft = (data) => {
    setHiddenKnowledge(data || null);
    setHiddenKnowledgeTitle(data?.title || "");
    setHiddenKnowledgeContent(data?.content || "");
    setHiddenKnowledgeStatus(data?.status || "draft");
  };

  const openHiddenKnowledgeModal = async () => {
    setIsHiddenKnowledgeOpen(true);
    setHiddenKnowledgeError("");
    hydrateHiddenKnowledgeDraft(null);

    if (!onOpenHiddenKnowledge) {
      setHiddenKnowledgeError("Hidden knowledge is not available in this screen.");
      return;
    }

    setIsLoadingHiddenKnowledge(true);
    try {
      const data = await onOpenHiddenKnowledge(docId);
      hydrateHiddenKnowledgeDraft(data);
    } catch (error) {
      setHiddenKnowledgeError(error?.message || "Unable to open hidden knowledge.");
    } finally {
      setIsLoadingHiddenKnowledge(false);
    }
  };

  const closeHiddenKnowledgeModal = () => {
    setIsHiddenKnowledgeOpen(false);
    setHiddenKnowledgeError("");
    hydrateHiddenKnowledgeDraft(null);
  };

  const saveHiddenKnowledge = async () => {
    if (!onSaveHiddenKnowledge || isSavingHiddenKnowledge || isBusy) return;
    setIsSavingHiddenKnowledge(true);
    setHiddenKnowledgeError("");
    try {
      const data = await onSaveHiddenKnowledge(docId, {
        title: hiddenKnowledgeTitle,
        content: hiddenKnowledgeContent,
        status: hiddenKnowledgeStatus,
      });
      hydrateHiddenKnowledgeDraft(data);
      setIsHiddenKnowledgeOpen(false);
    } catch (error) {
      setHiddenKnowledgeError(error?.message || "Unable to save hidden knowledge.");
    } finally {
      setIsSavingHiddenKnowledge(false);
    }
  };

  const addCommentToHiddenKnowledge = async (comment) => {
    if (!onAddHiddenKnowledgeFromComment || addingKnowledgeCommentId || isBusy) return;
    const commentId = Number(comment?.commentId || 0);
    if (!commentId) return;
    setAddingKnowledgeCommentId(commentId);
    setIsHiddenKnowledgeOpen(true);
    setHiddenKnowledgeError("");
    hydrateHiddenKnowledgeDraft(null);
    setIsLoadingHiddenKnowledge(true);
    try {
      await onAddHiddenKnowledgeFromComment(comment, { silent: true });
      if (onOpenHiddenKnowledge) {
        const data = await onOpenHiddenKnowledge(docId);
        hydrateHiddenKnowledgeDraft(data);
      } else {
        setHiddenKnowledgeError("Hidden knowledge is not available in this screen.");
      }
    } catch (error) {
      setHiddenKnowledgeError(error?.message || "Unable to add this comment to hidden knowledge.");
    } finally {
      setIsLoadingHiddenKnowledge(false);
      setAddingKnowledgeCommentId(null);
    }
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
    if (shouldShowAuthCta) {
      if (onNavigateToLogin) onNavigateToLogin();
      return;
    }
    focusPreviewCenter();
    window.requestAnimationFrame(() => {
      openQaModal();
    });
  };

  const handleOpenEarnPoints = () => {
    if (shouldShowAuthCta) {
      if (onNavigateToRegister) onNavigateToRegister();
      return;
    }
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

  const handleReviewCommentPoint = (comment) => {
    if (!onReviewCommentPoint || !isModeratorOrAdmin) return;
    setCommentPointModal({
      comment,
      points: String(comment?.pointEventPoints || 10),
      note: "",
    });
  };

  const closeCommentPointModal = () => {
    if (isSubmittingCommentPoint) return;
    setCommentPointModal(null);
  };

  const submitCommentPointModal = async () => {
    if (!commentPointModal || !onReviewCommentPoint || isSubmittingCommentPoint) return;
    const parsed = Number(commentPointModal.points);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 15) {
      window.alert("Diem hop le la so nguyen tu 0 den 15.");
      return;
    }
    setIsSubmittingCommentPoint(true);
    try {
      await onReviewCommentPoint(commentPointModal.comment, parsed, commentPointModal.note || "");
      setCommentPointModal(null);
    } finally {
      setIsSubmittingCommentPoint(false);
    }
  };

  const openHideCommentModal = (comment) => {
    if (!onHideComment || isBusy || isSubmittingHideComment) return;
    setHideCommentModal({ comment });
  };

  const closeHideCommentModal = () => {
    if (isSubmittingHideComment) return;
    setHideCommentModal(null);
  };

  const confirmHideComment = async () => {
    if (!hideCommentModal?.comment || !onHideComment || isSubmittingHideComment || isBusy) return;
    setIsSubmittingHideComment(true);
    try {
      await onHideComment(hideCommentModal.comment);
      setHideCommentModal(null);
    } finally {
      setIsSubmittingHideComment(false);
    }
  };

  const handleRestoreHiddenComment = async (comment) => {
    if (!onRestoreComment || isBusy || isSubmittingDeleteComment) return;
    await onRestoreComment(comment);
  };

  const openDeleteCommentModal = (comment) => {
    if (!onDeleteHiddenComment || isBusy || isSubmittingDeleteComment) return;
    setDeleteCommentModal({ comment });
    setDeleteCommentReason("");
    setDeleteCommentPenalty("0");
  };

  const closeDeleteCommentModal = () => {
    if (isSubmittingDeleteComment) return;
    setDeleteCommentModal(null);
    setDeleteCommentReason("");
    setDeleteCommentPenalty("0");
  };

  const confirmDeleteHiddenComment = async () => {
    if (!deleteCommentModal?.comment || !onDeleteHiddenComment || isSubmittingDeleteComment || isBusy) return;
    const reason = deleteCommentReason.trim();
    const parsedPenalty = Number(deleteCommentPenalty);

    if (!reason) {
      window.alert("Vui lòng nhập lý do xóa bình luận.");
      return;
    }

    if (!Number.isInteger(parsedPenalty) || parsedPenalty < 0 || parsedPenalty > 15) {
      window.alert("Điểm trừ hợp lệ là số nguyên từ 0 đến 15.");
      return;
    }

    setIsSubmittingDeleteComment(true);
    try {
      await onDeleteHiddenComment(deleteCommentModal.comment, {
        reason,
        penaltyPoints: parsedPenalty,
      });
      setDeleteCommentModal(null);
      setDeleteCommentReason("");
      setDeleteCommentPenalty("0");
    } finally {
      setIsSubmittingDeleteComment(false);
    }
  };

  const lockOverlayContent = (
    <>
      <h3>Đã khóa: {lockedOverlayTitle}</h3>
      <p>{lockedOverlayMessage}</p>
      <small>
        {canRenderLimitedPdf
          ? `Bạn có thể xem trước ${previewPageLimit} trang đầu. ${lockedOverlayHelper}`
          : lockedOverlayHelper}
      </small>
      <div className="lock-overlay-actions">
        {shouldShowAuthCta ? (
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
                Hỏi tác giả
              </button>
            )}
            <button type="button" className="preview-earn-btn" onClick={handleOpenEarnPoints}>
              Kiếm điểm
            </button>
          </>
        )}
      </div>
    </>
  );

  const renderCommentItem = (comment, depth = 0) => {
    const replyChildren = childrenByParent[comment.commentId] || [];
    const isReplyOpen = Boolean(replyOpenByCommentId[comment.commentId]);
    const replyInput = replyInputByCommentId[comment.commentId] || "";
    const commentId = Number(comment.commentId || 0);
    const isFocusedComment = commentId > 0 && commentId === Number(focusCommentId || 0);
    const commentStatus = String(comment?.status || "").toLowerCase();
    const isHiddenComment = commentStatus === "hidden";
    const pointEventStatus = String(comment?.pointEventStatus || "").toLowerCase();
    const hasPointEvaluation = ["approved", "rejected"].includes(pointEventStatus);
    const isUnreviewedComment = isModeratorOrAdmin && !hasPointEvaluation && !isHiddenComment;
    const evaluatedPoints = Number(comment?.pointEventPoints || 0);
    const pointEvaluationLabel =
      pointEventStatus === "approved"
        ? `Da danh gia${evaluatedPoints > 0 ? `: ${evaluatedPoints} diem` : ""}`
        : pointEventStatus === "rejected"
          ? "Da danh gia: tu choi"
          : "";

    return (
      <div
        key={comment.commentId}
        ref={(node) => {
          if (!commentId) return;
          if (node) {
            commentItemRefs.current[commentId] = node;
          } else {
            delete commentItemRefs.current[commentId];
          }
        }}
        className={`comment-item ${isUnreviewedComment ? "is-unreviewed-comment" : ""} ${
          isHiddenComment ? "is-hidden-comment" : ""
        } ${
          isFocusedComment ? "is-focused-comment" : ""
        }`}
        style={{ marginLeft: `${Math.min(depth, 4) * 18}px` }}
      >
        <div className="comment-head">
          <div className="comment-author-line">
            <strong>{comment.authorName || "User"}</strong>
            {isModeratorOrAdmin && isHiddenComment && (
              <span className="comment-hidden-badge">Đã ẩn</span>
            )}
          </div>
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
                {hasPointEvaluation ? "Sua danh gia diem" : "Evaluate 0-15"}
              </button>
              {onAddHiddenKnowledgeFromComment && (
                <button
                  type="button"
                  disabled={isBusy || Number(addingKnowledgeCommentId || 0) === Number(comment.commentId)}
                  onClick={() => addCommentToHiddenKnowledge(comment)}
                >
                  {Number(addingKnowledgeCommentId || 0) === Number(comment.commentId)
                    ? "Adding..."
                    : "Add experience"}
                </button>
              )}
              {isHiddenComment ? (
                <>
                  <button
                    type="button"
                    disabled={isBusy || isSubmittingDeleteComment || !onRestoreComment}
                    onClick={() => handleRestoreHiddenComment(comment)}
                  >
                    Hiện lại
                  </button>
                  <button
                    type="button"
                    className="danger-ghost"
                    disabled={isBusy || isSubmittingDeleteComment || !onDeleteHiddenComment}
                    onClick={() => openDeleteCommentModal(comment)}
                  >
                    Xóa
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="danger-ghost"
                  disabled={isBusy || isSubmittingHideComment}
                  onClick={() => openHideCommentModal(comment)}
                >
                  Hide
                </button>
              )}
            </>
          )}
        </div>

        {isReplyOpen && (
          <div className="reply-editor">
            <textarea
              rows={2}
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
                if (e.key !== "Enter" || e.shiftKey) return;
                if (e.nativeEvent?.isComposing) return;
                e.preventDefault();
                void handleCreateReply(comment.commentId);
              }}
            />
            <button
              type="button"
              className="qa-send-btn comment-send-btn"
              aria-label="Send reply"
              title="Send reply"
              disabled={Boolean(isSubmittingReplyByCommentId[comment.commentId]) || isBusy || !replyInput.trim()}
              onClick={() => handleCreateReply(comment.commentId)}
            >
              <PaperPlaneIcon />
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
            {previewDoc.title} ({previewDoc.displayFileName || previewDoc.downloadFileName || previewDoc.originalFileName})
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
                ? effectiveDownloadCost > 0
                  ? `${effectiveDownloadCost} pts`
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
              disabled={!previewDoc.canDownload || isLoading || isBusy || isSubmittingDownload}
              onClick={openDownloadConfirm}
              title={
                previewDoc.canDownload
                  ? effectiveDownloadCost > 0
                    ? `Download cost: ${effectiveDownloadCost} points`
                    : "Download document"
                  : "Download is locked for your current point tier"
              }
            >
              {isSubmittingDownload
                ? "Downloading..."
                : previewDoc.canDownload
                ? effectiveDownloadCost > 0
                  ? `Download (${effectiveDownloadCost} pts)`
                  : "Download"
                : "Download locked"}
            </button>
            <button
              type="button"
              className={reaction.liked ? "active-like" : ""}
              disabled={isBusy}
              onClick={() => onToggleLike && onToggleLike(docId)}
            >
              + {reaction.likeCount || 0}
            </button>
            <button
              type="button"
              className={reaction.disliked ? "active-dislike" : ""}
              disabled={isBusy}
              onClick={() => onToggleDislike && onToggleDislike(docId)}
            >
              - {reaction.dislikeCount || 0}
            </button>
            <button type="button" disabled={isBusy} onClick={() => onToggleSave && onToggleSave(docId)}>
              {reaction.saved ? "Saved" : "Save"}
            </button>
            <button type="button" disabled={isBusy} onClick={openHiddenKnowledgeModal}>
              {"T\u1ed5ng h\u1ee3p kinh nghi\u1ec7m"}
            </button>
          </div>
        )}
        <div className="preview-actions-right">
          {canAskAuthor && (
            <button
              type="button"
              className="preview-ask-author-btn"
              disabled={isBusy || isSubmittingQa}
              onClick={handleOpenAskAuthor}
            >
              Hỏi tác giả
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
            <LimitedPdfPreview
              fileUrl={previewDoc.previewUrl}
              pageLimit={previewPageLimit}
              totalPages={previewDoc.totalPages}
              lockOverlayContent={lockOverlayContent}
            />
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

        {isLocked && !canRenderLimitedPdf && (
          <div className="preview-lock-overlay">
            {lockOverlayContent}
          </div>
        )}
      </div>

      <section className="comments-panel" ref={commentsPanelRef}>
        <h3>Comments</h3>
        <div className="comment-editor">
          <textarea
            rows={2}
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            placeholder="Write a comment..."
            disabled={isBusy || isSubmittingComment}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.shiftKey) return;
              if (e.nativeEvent?.isComposing) return;
              e.preventDefault();
              void handleCreateComment();
            }}
          />
          <button
            type="button"
            className="qa-send-btn comment-send-btn"
            aria-label="Send comment"
            title="Send comment"
            disabled={!commentInput.trim() || isBusy || isSubmittingComment}
            onClick={handleCreateComment}
          >
            <PaperPlaneIcon />
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
                x
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

      {isDownloadConfirmOpen && (
        <ModalPortal>
          <div className="report-modal-backdrop" role="dialog" aria-modal="true">
            <div className="report-modal download-confirm-modal">
              <div className="report-modal-head download-confirm-head">
                <div>
                  <h3>Xác nhận tải tài liệu</h3>
                  <p className="report-modal-sub">NeuShare sẽ trừ điểm khi file bắt đầu tải xuống.</p>
                </div>
                <button type="button" className="report-close-btn" onClick={closeDownloadConfirm}>
                  x
                </button>
              </div>

              <div className="download-confirm-summary">
                <div>
                  <span>Tài liệu</span>
                  <strong>{previewDoc.title || "Document"}</strong>
                </div>
                <div>
                  <span>Điểm hiện tại</span>
                  <strong>{Number(previewDoc.points || 0)} pts</strong>
                </div>
                <div>
                  <span>Phí tải xuống</span>
                  <strong>{effectiveDownloadCost} pts</strong>
                </div>
                <div>
                  <span>Sau khi tải</span>
                  <strong>{effectivePointsAfterDownload} pts</strong>
                </div>
              </div>

              <p className="download-confirm-note">
                Bạn có chắc chắn muốn tải tài liệu này không?
              </p>

              <div className="report-modal-actions download-confirm-actions">
                <button type="button" onClick={closeDownloadConfirm} disabled={isSubmittingDownload}>
                  Hủy
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  disabled={isSubmittingDownload || isBusy}
                  onClick={handleConfirmDownload}
                >
                  {isSubmittingDownload ? "Đang tải..." : "Đồng ý tải xuống"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {isDownloadSuccessOpen && (
        <ModalPortal>
          <div className="report-modal-backdrop" role="dialog" aria-modal="true">
            <div className="report-modal download-confirm-modal download-success-modal">
              <div className="report-modal-head download-confirm-head">
                <div>
                  <h3>Tải xuống thành công</h3>
                  <p className="report-modal-sub">NeuShare sẽ tải lại trang để cập nhật điểm mới.</p>
                </div>
              </div>

              <div className="download-success-body">
                <div className="download-success-icon" aria-hidden="true">✓</div>
                <div>
                  <strong>{previewDoc.title || "Tài liệu"}</strong>
                  <p>{downloadSuccessMessage}</p>
                </div>
              </div>

              <div className="report-modal-actions download-confirm-actions">
                <button
                  type="button"
                  className="primary-btn"
                  onClick={confirmDownloadSuccessReload}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {commentPointModal && (
        <ModalPortal>
          <div className="report-modal-backdrop" role="dialog" aria-modal="true">
            <div className="report-modal point-review-modal">
            <div className="report-modal-head">
              <h3>Chấm điểm bình luận</h3>
              <button type="button" className="report-close-btn" onClick={closeCommentPointModal}>
                x
              </button>
            </div>
            <p className="report-modal-sub">
              Comment #{commentPointModal.comment?.commentId} - {commentPointModal.comment?.authorName || "User"}
            </p>
            <div className="moderation-comment-content">
              {commentPointModal.comment?.content || ""}
            </div>
            <label className="point-review-field">
              <span>Điểm bình luận (0-15)</span>
              <input
                type="number"
                min="0"
                max="15"
                value={commentPointModal.points}
                disabled={isSubmittingCommentPoint || isBusy}
                onChange={(event) =>
                  setCommentPointModal((prev) => ({ ...prev, points: event.target.value }))
                }
              />
            </label>
            <label className="point-review-field">
              <span>Ghi chú kiểm duyệt</span>
              <textarea
                rows={4}
                value={commentPointModal.note}
                disabled={isSubmittingCommentPoint || isBusy}
                onChange={(event) =>
                  setCommentPointModal((prev) => ({ ...prev, note: event.target.value }))
                }
                placeholder="Nhập ghi chú nếu cần"
              />
            </label>
            <div className="report-modal-actions">
              <button type="button" onClick={closeCommentPointModal} disabled={isSubmittingCommentPoint}>
                Hủy
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={isSubmittingCommentPoint || isBusy}
                onClick={submitCommentPointModal}
              >
                {isSubmittingCommentPoint ? "Đang lưu..." : "Xác nhận chấm điểm"}
              </button>
            </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {hideCommentModal && (
        <ModalPortal>
          <div className="report-modal-backdrop" role="dialog" aria-modal="true">
            <div className="report-modal hide-comment-modal">
              <div className="report-modal-head">
                <h3>Ẩn bình luận</h3>
                <button type="button" className="report-close-btn" onClick={closeHideCommentModal}>
                  x
                </button>
              </div>
              <p className="report-modal-sub">
                Bình luận này sẽ bị ẩn khỏi phần thảo luận của tài liệu.
              </p>
              <div className="moderation-comment-content">
                <strong>{hideCommentModal.comment?.authorName || "User"}</strong>
                <p>{hideCommentModal.comment?.content || ""}</p>
              </div>
              <p className="download-confirm-note">
                Bạn có chắc chắn muốn ẩn bình luận này không?
              </p>
              <div className="report-modal-actions">
                <button type="button" onClick={closeHideCommentModal} disabled={isSubmittingHideComment}>
                  Hủy
                </button>
                <button
                  type="button"
                  className="danger"
                  disabled={isSubmittingHideComment || isBusy}
                  onClick={confirmHideComment}
                >
                  {isSubmittingHideComment ? "Đang ẩn..." : "Xác nhận ẩn"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {deleteCommentModal && (
        <ModalPortal>
          <div className="report-modal-backdrop" role="dialog" aria-modal="true">
            <div className="report-modal delete-comment-modal">
              <div className="report-modal-head">
                <h3>Xóa bình luận đã ẩn</h3>
                <button type="button" className="report-close-btn" onClick={closeDeleteCommentModal}>
                  x
                </button>
              </div>
              <p className="report-modal-sub">
                Bình luận sẽ bị xóa khỏi hệ thống, người dùng sẽ nhận thông báo kèm lý do và điểm bị trừ.
              </p>
              <div className="moderation-comment-content">
                <strong>{deleteCommentModal.comment?.authorName || "User"}</strong>
                <p>{deleteCommentModal.comment?.content || ""}</p>
              </div>
              <label className="point-review-field">
                <span>Lý do xóa</span>
                <textarea
                  rows={4}
                  value={deleteCommentReason}
                  disabled={isSubmittingDeleteComment || isBusy}
                  onChange={(event) => setDeleteCommentReason(event.target.value)}
                  placeholder="Nhập lý do để gửi tới người dùng"
                />
              </label>
              <label className="point-review-field">
                <span>Điểm trừ (0-15)</span>
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={deleteCommentPenalty}
                  disabled={isSubmittingDeleteComment || isBusy}
                  onChange={(event) => setDeleteCommentPenalty(event.target.value)}
                />
              </label>
              <div className="report-modal-actions">
                <button type="button" onClick={closeDeleteCommentModal} disabled={isSubmittingDeleteComment}>
                  Hủy
                </button>
                <button
                  type="button"
                  className="danger"
                  disabled={isSubmittingDeleteComment || isBusy}
                  onClick={confirmDeleteHiddenComment}
                >
                  {isSubmittingDeleteComment ? "Đang xóa..." : "Xác nhận xóa"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {isQaOpen && (
        <ModalPortal>
          <div className="report-modal-backdrop" role="dialog" aria-modal="true">
            <div className="report-modal">
              <div className="report-modal-head">
                <h3>Ask the author</h3>
                <button type="button" className="report-close-btn" onClick={closeQaModal}>
                  x
                </button>
              </div>
              {shouldShowAuthCta ? (
                <>
                  <p className="report-modal-sub">
                    Ban chua dang nhap. Vui long dang nhap hoac dang ky de hoi tac gia.
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
                    <button type="button" onClick={() => onNavigateToRegister && onNavigateToRegister()}>Đăng ký</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="report-modal-sub">Start a private Q&A session with the document owner.</p>
                  <textarea
                    className="report-textarea"
                    value={qaMessage}
                    onChange={(e) => setQaMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" || e.shiftKey) return;
                      if (e.nativeEvent?.isComposing) return;
                      e.preventDefault();
                      void handleStartQa();
                    }}
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
        </ModalPortal>
      )}

      {isEarnPointsOpen && (
        <ModalPortal>
          <div className="report-modal-backdrop" role="dialog" aria-modal="true">
            <div className="report-modal">
              <div className="report-modal-head">
                <h3>How to earn points</h3>
                <button type="button" className="report-close-btn" onClick={closeEarnPointsModal}>
                  x
                </button>
              </div>
              <p className="report-modal-sub">Contribute to the community to unlock full view and downloads.</p>
              <ul className="earn-points-list">
                <li>Upload tai lieu moi va cho moderator/admin duyet.</li>
                <li>Tai lieu duoc duyet se nhan them diem thuong.</li>
                <li>Binh luan va tra loi thao luan co chat luong.</li>
                <li>Nhan upvote/danh gia tich cuc tu nguoi dung khac.</li>
                <li>Tham gia Q&A va ho tro nguoi hoc khac.</li>
              </ul>
              <div className="report-modal-actions">
                <button type="button" onClick={closeEarnPointsModal}>
                  Close
                </button>
                {shouldShowAuthCta ? (
                  <>
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => onNavigateToLogin && onNavigateToLogin()}
                    >
                      Đăng nhập
                    </button>
                    <button type="button" onClick={() => onNavigateToRegister && onNavigateToRegister()}>Đăng ký</button>
                  </>
                ) : (
                  <button type="button" className="primary-btn" onClick={onClose}>
                    Go upload now
                  </button>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {isHiddenKnowledgeOpen && (
        <ModalPortal>
          <div className="report-modal-backdrop" role="dialog" aria-modal="true">
            <div className="report-modal hidden-knowledge-modal">
              <div className="report-modal-head">
                <h3>{"T\u1ed5ng h\u1ee3p kinh nghi\u1ec7m"}</h3>
                <button type="button" className="report-close-btn" onClick={closeHiddenKnowledgeModal}>
                  x
                </button>
              </div>

              {isLoadingHiddenKnowledge ? (
                <p className="report-modal-sub">Loading hidden knowledge...</p>
              ) : hiddenKnowledgeError ? (
                <div className="hidden-knowledge-error">
                  <strong>Access blocked</strong>
                  <p>{hiddenKnowledgeError}</p>
                  <small>Users need more than 60 points to view this page.</small>
                </div>
              ) : hiddenKnowledge?.canEdit ? (
                <div className="hidden-knowledge-editor">
                  <label>
                    <span>Title</span>
                    <input
                      type="text"
                      value={hiddenKnowledgeTitle}
                      onChange={(event) => setHiddenKnowledgeTitle(event.target.value)}
                      disabled={isSavingHiddenKnowledge || isBusy}
                    />
                  </label>
                  <label>
                    <span>Status</span>
                    <select
                      value={hiddenKnowledgeStatus}
                      onChange={(event) => setHiddenKnowledgeStatus(event.target.value)}
                      disabled={isSavingHiddenKnowledge || isBusy}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                  <label>
                    <span>Content</span>
                    <textarea
                      value={hiddenKnowledgeContent}
                      onChange={(event) => setHiddenKnowledgeContent(event.target.value)}
                      disabled={isSavingHiddenKnowledge || isBusy}
                      rows={14}
                    />
                  </label>
                  <div className="report-modal-actions">
                    <button type="button" onClick={closeHiddenKnowledgeModal}>
                      Close
                    </button>
                    <button
                      type="button"
                      className="primary-btn"
                      disabled={isSavingHiddenKnowledge || isBusy || !hiddenKnowledgeTitle.trim()}
                      onClick={saveHiddenKnowledge}
                    >
                      {isSavingHiddenKnowledge ? "Saving..." : "Xác nhận"}
                    </button>
                  </div>
                </div>
              ) : (
                <article className="hidden-knowledge-reader">
                  <h4>{hiddenKnowledgeTitle || hiddenKnowledge?.title}</h4>
                  <p className="report-modal-sub">
                    Required points: {Number(hiddenKnowledge?.requiredPoints || hiddenKnowledge?.minPointsToView || 61)}
                  </p>
                  <pre>{hiddenKnowledgeContent || "No hidden knowledge content yet."}</pre>
                </article>
              )}
            </div>
          </div>
        </ModalPortal>
      )}
    </section>
  );
}

export default PreviewPanel;




