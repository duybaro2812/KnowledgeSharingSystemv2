import { Fragment, useMemo, useState } from "react";

import { useEffect } from "react";
import { createPortal } from "react-dom";

function ModalPortal({ children }) {
  if (typeof document === "undefined") return children;
  return createPortal(children, document.body);
}

function ButtonIcon({ name }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    focusable: "false",
  };

  if (name === "save") {
    return (
      <svg className="button-icon" {...common}>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
        <path d="M17 21v-8H7v8" />
        <path d="M7 3v5h8" />
      </svg>
    );
  }

  if (name === "edit") {
    return (
      <svg className="button-icon" {...common}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    );
  }

  if (name === "open") {
    return (
      <svg className="button-icon" {...common}>
        <path d="M15 3h6v6" />
        <path d="M10 14 21 3" />
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      </svg>
    );
  }

  if (name === "delete") {
    return (
      <svg className="button-icon" {...common}>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="m19 6-1 14H6L5 6" />
      </svg>
    );
  }

  if (name === "experience") {
    return (
      <svg className="button-icon" {...common}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    );
  }

  return null;
}

const COMMENT_REVIEW_CACHE_KEY = "kss.reviewedCommentRows";
const COMMENT_REVIEW_ROW_CACHE_KEY = "kss.reviewedCommentRowData";

const readCommentReviewCache = () => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(COMMENT_REVIEW_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeCommentReviewCache = (nextCache) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(COMMENT_REVIEW_CACHE_KEY, JSON.stringify(nextCache || {}));
  } catch {
    // Ignore storage failures; the in-memory state still drives the current render.
  }
};

const readCommentReviewRowCache = () => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(COMMENT_REVIEW_ROW_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, row]) => {
        const eventType = String(row?.eventType || row?.pointEvent?.eventType || "comment_given").toLowerCase();
        return eventType === "comment_given";
      }),
    );
  } catch {
    return {};
  }
};

const writeCommentReviewRowCache = (nextCache) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(COMMENT_REVIEW_ROW_CACHE_KEY, JSON.stringify(nextCache || {}));
  } catch {
    // Ignore storage failures; the in-memory state still drives the current render.
  }
};

const MODERATION_PAGE_SIZE = 15;

function ModerationTabView(props) {
  const { model, controller } = props;
  const [commentNoteById, setCommentNoteById] = useState({});
  const [checkingDuplicateByDocId, setCheckingDuplicateByDocId] = useState({});
  const [duplicateModal, setDuplicateModal] = useState(null);
  const [pointReviewModal, setPointReviewModal] = useState(null);
  const [experienceNoticeModal, setExperienceNoticeModal] = useState(null);
  const [documentExperienceModal, setDocumentExperienceModal] = useState(null);
  const [qaRatingDetailModal, setQaRatingDetailModal] = useState(null);
  const [addingExperienceKey, setAddingExperienceKey] = useState("");
  const [reviewedQaRatingEventsById, setReviewedQaRatingEventsById] = useState({});
  const [isSubmittingPointReview, setIsSubmittingPointReview] = useState(false);
  const [documentSearch, setDocumentSearch] = useState("");
  const [commentSearch, setCommentSearch] = useState("");
  const [qaRatingSearch, setQaRatingSearch] = useState("");
  const [documentPage, setDocumentPage] = useState(1);
  const [commentPage, setCommentPage] = useState(1);
  const [qaRatingPage, setQaRatingPage] = useState(1);
  const [docStatusDraftById, setDocStatusDraftById] = useState({});
  const [docPointDraftById, setDocPointDraftById] = useState({});
  const [commentPointDraftById, setCommentPointDraftById] = useState({});
  const [qaPointDraftById, setQaPointDraftById] = useState({});
  const [savedDocRowsById, setSavedDocRowsById] = useState({});
  const [savedCommentRowsById, setSavedCommentRowsById] = useState(() => readCommentReviewCache());
  const [cachedCommentRowsById, setCachedCommentRowsById] = useState(() => readCommentReviewRowCache());
  const [editingCommentRowsById, setEditingCommentRowsById] = useState({});
  const [commentExperienceAddedById, setCommentExperienceAddedById] = useState({});
  const controlsDisabled = Boolean(model.isBusy);
  const isAnyModalOpen = Boolean(
    duplicateModal ||
      pointReviewModal ||
      experienceNoticeModal ||
      documentExperienceModal ||
      qaRatingDetailModal,
  );

  const focus = model.moderationFocus || {};
  const focusedCommentId = Number(focus.commentId || 0);
  const focusedDocumentId = Number(focus.documentId || 0);
  const focusedQaSessionId = Number(focus.qaSessionId || 0);
  const focusedPointEventId = Number(focus.pointEventId || 0);
  const activeQueue = model.moderationQueue || "documents";
  const isDocumentsQueue = activeQueue === "documents";
  const isCommentsQueue = activeQueue === "comments";
  const isQaRatingsQueue = activeQueue === "qa-ratings";

  const getModerationTime = (item) => {
    const candidates = [
      item?.createdAt,
      item?.updatedAt,
      item?.reviewedAt,
      item?.pointEventReviewedAt,
      item?.commentPointEventReviewedAt,
      item?.latestReviewedAt,
      item?.pointEvent?.createdAt,
      item?.pointEvent?.reviewedAt,
      item?.pointEvent?.commentPointEventReviewedAt,
    ];
    const timestamp = candidates
      .map((value) => new Date(value || 0).getTime())
      .find((value) => Number.isFinite(value) && value > 0);
    return timestamp || 0;
  };

  const getReviewPriority = (item, kind) => {
    const status = String(item?.status || "").toLowerCase();
    if (kind === "document") return status === "pending" ? 0 : 1;
    if (kind === "comment") {
      const pointStatus = String(
        item?.pointEventStatus ||
          item?.commentPointEventStatus ||
          item?.pointEvent?.status ||
          item?.pointEvent?.commentPointEventStatus ||
          "",
      ).toLowerCase();
      const hasReviewedAt = Boolean(
        item?.pointEventReviewedAt || item?.commentPointEventReviewedAt || item?.pointEvent?.commentPointEventReviewedAt,
      );
      return status === "pending" || pointStatus === "pending" || (!pointStatus && !hasReviewedAt) ? 0 : 1;
    }
    if (kind === "qa-rating") {
      const reviewState = String(item?.reviewState || "").toLowerCase();
      return reviewState === "reviewed" || status === "approved" ? 1 : 0;
    }
    return 1;
  };

  const sortModerationRows = (rows, kind) =>
    [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
      const priorityDiff = getReviewPriority(a, kind) - getReviewPriority(b, kind);
      if (priorityDiff !== 0) return priorityDiff;
      return getModerationTime(b) - getModerationTime(a);
    });

  const getListValue = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean).join(", ");
    return String(value ?? "").trim();
  };

  const getCourseLabel = (doc) =>
    getListValue(doc?.categoryNames) ||
    getListValue(doc?.categories?.map?.((category) => category?.name || category?.categoryName)) ||
    getListValue(doc?.categoryName) ||
    getListValue(doc?.courseName) ||
    getListValue(doc?.course) ||
    "N/A";

  const getCategoryId = (doc) =>
    getListValue(doc?.categoryIds) ||
    getListValue(doc?.categories?.map?.((category) => category?.categoryId || category?.id)) ||
    getListValue(doc?.categoryId) ||
    getListValue(doc?.courseId) ||
    getListValue(doc?.category_id) ||
    "N/A";

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
    const reviewedItems = Object.values(reviewedQaRatingEventsById).filter(
      (event) => !pendingIds.has(Number(event.eventId || 0)),
    );

    return sortModerationRows([...pendingItems, ...reviewedItems], "qa-rating");
  }, [prioritizedQaRatings, reviewedQaRatingEventsById]);

  const standaloneCommentPointEvents = useMemo(() => {
    const pendingCommentIds = new Set(
      prioritizedComments.map((comment) => Number(comment.commentId || 0)).filter((id) => id > 0),
    );
    return (Array.isArray(model.commentPointEvents) ? model.commentPointEvents : []).filter((event) => {
      const eventType = String(event?.eventType || "").toLowerCase();
      return eventType === "comment_given" && !pendingCommentIds.has(Number(event.commentId || 0));
    });
  }, [model.commentPointEvents, prioritizedComments]);

  const documentPointEventsByDocumentId = useMemo(() => {
    return (Array.isArray(model.pendingPointEvents) ? model.pendingPointEvents : []).reduce((acc, event) => {
      const documentId = Number(event?.documentId || 0);
      const hasComment = Number(event?.commentId || 0) > 0;
      const hasQa = Number(event?.qaSessionId || 0) > 0;
      if (!documentId || hasComment || hasQa) return acc;
      if (!acc[documentId]) acc[documentId] = [];
      acc[documentId].push(event);
      return acc;
    }, {});
  }, [model.pendingPointEvents]);

  const documentReviewRows = useMemo(() => {
    const byId = new Map();
    const addRows = (items, meta = {}) => {
      (Array.isArray(items) ? items : []).forEach((doc) => {
        const documentId = Number(doc?.documentId || 0);
        if (!documentId) return;
        byId.set(documentId, {
          ...(byId.get(documentId) || {}),
          ...doc,
          ...meta,
        });
      });
    };
    addRows(model.adminDocuments);
    addRows(model.pendingDocs, { moderationKind: "pending" });
    addRows(model.reportedDocs, { moderationKind: "reported", isReported: true });
    const rows = sortModerationRows(Array.from(byId.values()), "document");
    const keyword = documentSearch.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((doc) => {
      const haystack = [
        doc.documentId,
        doc.title,
        doc.ownerName,
        doc.ownerEmail,
        doc.categoryName,
        doc.courseName,
        doc.course,
        doc.categoryNames,
        doc.categoryIds,
        doc.status,
        doc.latestReportReason,
      ]
        .filter((value) => value !== undefined && value !== null)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [model.adminDocuments, model.pendingDocs, model.reportedDocs, documentSearch]);

  const commentReviewRows = useMemo(() => {
    const pendingIds = new Set(
      prioritizedComments.map((comment) => Number(comment.commentId || 0)).filter((commentId) => commentId > 0),
    );
    const pointOnlyRows = standaloneCommentPointEvents
      .filter((event) => !pendingIds.has(Number(event.commentId || 0)))
      .map((event) => ({
        commentId: event.commentId,
        documentId: event.documentId,
        documentTitle: event.documentTitle,
        authorUserId: event.userId,
        authorName: event.userName || event.username,
        authorEmail: event.userEmail,
        content:
          event.commentContent ||
          event.metadataJson?.commentContent ||
          event.metadataJson?.content ||
          "No comment content.",
        eventType: event.eventType,
        status: "approved",
        pointEventId: event.eventId,
        commentPointEventId: event.commentPointEventId,
        pointEventStatus: event.commentPointEventStatus,
        pointEventPoints: event.commentPointEventPoints,
        pointEventReviewedAt: event.commentPointEventReviewedAt,
        pointEvent: event,
      }));
    const liveIds = new Set([
      ...prioritizedComments.map((comment) => Number(comment.commentId || 0)),
      ...pointOnlyRows.map((comment) => Number(comment.commentId || 0)),
    ]);
    const cachedRows = Object.values(cachedCommentRowsById || {}).filter((comment) => {
      const commentId = Number(comment?.commentId || 0);
      const eventType = String(comment?.eventType || comment?.pointEvent?.eventType || "comment_given").toLowerCase();
      return commentId > 0 && eventType === "comment_given" && !liveIds.has(commentId);
    });
    const rows = sortModerationRows([...prioritizedComments, ...pointOnlyRows, ...cachedRows], "comment");
    const keyword = commentSearch.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((comment) => {
      const haystack = [
        comment.commentId,
        comment.documentId,
        comment.documentTitle,
        comment.authorUserId,
        comment.authorName,
        comment.authorEmail,
        comment.content,
        comment.status,
      ]
        .filter((value) => value !== undefined && value !== null)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [prioritizedComments, standaloneCommentPointEvents, cachedCommentRowsById, commentSearch]);

  const formatDate = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
  };

  const getInitials = (value) => {
    const words = String(value || "U").trim().split(/\s+/).filter(Boolean);
    return words
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("") || "U";
  };

  const getDocumentPointEvent = (documentId) => {
    const events = documentPointEventsByDocumentId[Number(documentId)] || [];
    return (
      events.find((event) => String(event?.eventType || "").toLowerCase() === "upload_approved") ||
      events.find((event) => String(event?.eventType || "").toLowerCase() === "upload_submitted") ||
      events[0] ||
      null
    );
  };

  const getDefaultDocumentExperienceText = (doc) => {
    const parts = [
      doc?.title ? `Document: ${doc.title}` : "",
      getCourseLabel(doc) && getCourseLabel(doc) !== "N/A" ? `Course: ${getCourseLabel(doc)}` : "",
      doc?.ownerName ? `Owner: ${doc.ownerName}` : "",
      doc?.description ? `Summary: ${doc.description}` : "",
      doc?.latestReportReason ? `Moderation note: ${doc.latestReportReason}` : "",
    ].filter(Boolean);
    return parts.join("\n");
  };

  const getCommentPointEvent = (commentId) => {
    const events = model.commentPointEventsByCommentId?.[Number(commentId)] || [];
    return (
      events.find((event) => String(event?.eventType || "").toLowerCase() === "comment_given") ||
      events[0] ||
      null
    );
  };

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

  const filteredQaRatingReviewItems = useMemo(() => {
    const keyword = qaRatingSearch.trim().toLowerCase();
    if (!keyword) return qaRatingReviewItems;
    return qaRatingReviewItems.filter((event) => {
      const details = getQaRatingDetails(event);
      const haystack = [
        event.eventId,
        event.qaSessionId,
        event.documentId,
        event.documentTitle,
        event.userName,
        event.username,
        event.userEmail,
        event.sourceUserName,
        event.sourceUsername,
        event.sourceUserEmail,
        details.stars,
        details.feedback,
        details.questionSummary,
        details.authorSolution,
        details.satisfactionNote,
      ]
        .filter((value) => value !== undefined && value !== null)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [qaRatingReviewItems, qaRatingSearch]);

  const getPageCount = (rowCount) => Math.max(1, Math.ceil(Number(rowCount || 0) / MODERATION_PAGE_SIZE));

  const paginateRows = (rows, page) => {
    const source = Array.isArray(rows) ? rows : [];
    const pageCount = getPageCount(source.length);
    const safePage = Math.min(Math.max(Number(page || 1), 1), pageCount);
    const startIndex = (safePage - 1) * MODERATION_PAGE_SIZE;
    return source.slice(startIndex, startIndex + MODERATION_PAGE_SIZE);
  };

  const getPaginationPages = (currentPage, pageCount) => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, index) => index + 1);
    }

    const pages = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(pageCount - 1, currentPage + 1);
    if (start > 2) pages.push("left-ellipsis");
    for (let page = start; page <= end; page += 1) pages.push(page);
    if (end < pageCount - 1) pages.push("right-ellipsis");
    pages.push(pageCount);
    return pages;
  };

  const documentPageCount = getPageCount(documentReviewRows.length);
  const commentPageCount = getPageCount(commentReviewRows.length);
  const qaRatingPageCount = getPageCount(filteredQaRatingReviewItems.length);
  const safeDocumentPage = Math.min(documentPage, documentPageCount);
  const safeCommentPage = Math.min(commentPage, commentPageCount);
  const safeQaRatingPage = Math.min(qaRatingPage, qaRatingPageCount);
  const pagedDocumentRows = useMemo(
    () => paginateRows(documentReviewRows, safeDocumentPage),
    [documentReviewRows, safeDocumentPage],
  );
  const pagedCommentRows = useMemo(
    () => paginateRows(commentReviewRows, safeCommentPage),
    [commentReviewRows, safeCommentPage],
  );
  const pagedQaRatingReviewItems = useMemo(
    () => paginateRows(filteredQaRatingReviewItems, safeQaRatingPage),
    [filteredQaRatingReviewItems, safeQaRatingPage],
  );

  useEffect(() => {
    setDocumentPage((prev) => Math.min(prev, getPageCount(documentReviewRows.length)));
  }, [documentReviewRows.length]);

  useEffect(() => {
    setCommentPage((prev) => Math.min(prev, getPageCount(commentReviewRows.length)));
  }, [commentReviewRows.length]);

  useEffect(() => {
    setQaRatingPage((prev) => Math.min(prev, getPageCount(filteredQaRatingReviewItems.length)));
  }, [filteredQaRatingReviewItems.length]);

  const renderPagination = ({ currentPage, pageCount, onPageChange, label }) => {
    if (pageCount <= 1) return null;
    const goToPage = (nextPage) => {
      const boundedPage = Math.min(Math.max(Number(nextPage || 1), 1), pageCount);
      onPageChange(boundedPage);
    };

    return (
      <nav className="moderation-pagination" aria-label={`${label} pagination`}>
        {getPaginationPages(currentPage, pageCount).map((page) =>
          typeof page === "number" ? (
            <button
              key={`${label}-page-${page}`}
              type="button"
              className={page === currentPage ? "active" : ""}
              aria-current={page === currentPage ? "page" : undefined}
              onClick={() => goToPage(page)}
            >
              {page}
            </button>
          ) : (
            <span key={`${label}-${page}`} className="moderation-pagination-ellipsis">
              ...
            </span>
          ),
        )}
        <button
          type="button"
          aria-label={`Next ${label} page`}
          disabled={currentPage >= pageCount}
          onClick={() => goToPage(currentPage + 1)}
        >
          ›
        </button>
        <button
          type="button"
          aria-label={`Last ${label} page`}
          disabled={currentPage >= pageCount}
          onClick={() => goToPage(pageCount)}
        >
          »
        </button>
      </nav>
    );
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

  const saveQaRatingPointsInline = async (event) => {
    const eventId = Number(event?.eventId || 0);
    if (!eventId || controlsDisabled) return;
    const draftValue = qaPointDraftById[eventId] ?? event?.points ?? 0;
    const parsedPoints = Number(draftValue);
    if (!Number.isInteger(parsedPoints)) {
      setExperienceNoticeModal({
        title: "Invalid points",
        message: "Points must be an integer.",
      });
      return;
    }

    setReviewedQaRatingEventsById((prev) => ({
      ...prev,
      [eventId]: {
        ...(prev[eventId] || {}),
        ...event,
        eventId,
        points: parsedPoints,
        reviewedPoints: parsedPoints,
        reviewState: "reviewed",
        reviewedAt: new Date().toISOString(),
      },
    }));
    await controller.onApprovePointEventInline(
      eventId,
      parsedPoints,
      `Moderator scored Q&A rating event #${eventId} with ${parsedPoints} points.`,
    );
  };

  const saveDocumentRow = async (doc) => {
    const documentId = Number(doc?.documentId || 0);
    if (!documentId || controlsDisabled) return;
    const nextStatus = String(docStatusDraftById[documentId] || doc?.status || "pending").toLowerCase();
    const pointDraft = docPointDraftById[documentId];
    const pointEvent = getDocumentPointEvent(documentId);

    if (!window.confirm(`Save changes for document #${documentId}?`)) return;

    if (nextStatus === "approved" && String(doc?.status || "").toLowerCase() !== "approved") {
      await controller.onApprove(documentId);
    } else if (nextStatus === "rejected" && String(doc?.status || "").toLowerCase() !== "rejected") {
      await controller.onReject(documentId);
    }

    const pointEventId = Number(pointEvent?.eventId || 0);
    if (pointEventId && pointDraft !== undefined && String(pointDraft).trim() !== "") {
      const parsedPoints = Number(pointDraft);
      if (!Number.isInteger(parsedPoints)) {
        setExperienceNoticeModal({
          title: "Invalid points",
          message: "Document points must be an integer.",
        });
        return;
      }
      await controller.onApprovePointEventInline(
        pointEvent.eventId,
        parsedPoints,
        `Moderator scored document #${documentId} with ${parsedPoints} points.`,
      );
    }

    setSavedDocRowsById((prev) => ({
      ...prev,
      [documentId]: true,
    }));
  };

  const openDocumentExperienceEditor = async (doc) => {
    const documentId = Number(doc?.documentId || 0);
    if (!documentId || controlsDisabled) return;
    const fallbackTitle = `Tong hop kinh nghiem: ${doc?.title || `Document #${documentId}`}`;
    const fallbackContent = getDefaultDocumentExperienceText(doc);
    setDocumentExperienceModal({
      doc,
      documentId,
      title: fallbackTitle,
      content: fallbackContent,
      status: "draft",
      isLoading: true,
      isSaving: false,
      error: "",
    });
    try {
      const data = await controller.onOpenDocumentExperience(documentId);
      setDocumentExperienceModal({
        doc,
        documentId,
        title: data?.title || fallbackTitle,
        content: data?.content || fallbackContent,
        status: data?.status || "draft",
        isLoading: false,
        isSaving: false,
        error: "",
      });
    } catch (error) {
      setDocumentExperienceModal((prev) => ({
        ...(prev || {}),
        doc,
        documentId,
        isLoading: false,
        isSaving: false,
        error: error?.message || "Unable to open document experience.",
      }));
    }
  };

  const updateDocumentExperienceModal = (patch) => {
    setDocumentExperienceModal((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const saveDocumentExperienceEditor = async () => {
    if (!documentExperienceModal || documentExperienceModal.isSaving || controlsDisabled) return;
    const documentId = Number(documentExperienceModal.documentId || 0);
    if (!documentId) return;
    if (!String(documentExperienceModal.title || "").trim()) {
      updateDocumentExperienceModal({ error: "Experience title is required." });
      return;
    }

    updateDocumentExperienceModal({ isSaving: true, error: "" });
    try {
      const data = await controller.onSaveDocumentExperience(documentId, {
        title: documentExperienceModal.title,
        content: documentExperienceModal.content,
        status: documentExperienceModal.status,
      });
      updateDocumentExperienceModal({
        title: data?.title || documentExperienceModal.title,
        content: data?.content ?? documentExperienceModal.content,
        status: data?.status || documentExperienceModal.status,
        isSaving: false,
        error: "",
      });
    } catch (error) {
      updateDocumentExperienceModal({
        isSaving: false,
        error: error?.message || "Unable to save document experience.",
      });
    }
  };

  const saveCommentRow = async (comment) => {
    const commentId = Number(comment?.commentId || 0);
    if (!commentId || controlsDisabled) return;
    const pointEvent = comment?.pointEvent || getCommentPointEvent(commentId);
    const eventType = String(comment?.eventType || pointEvent?.eventType || "comment_given").toLowerCase();
    if (eventType !== "comment_given") return;
    const reviewedPointEventId = Number(comment?.commentPointEventId || comment?.pointEventId || 0);
    const reviewedPointStatus = String(comment?.pointEventStatus || pointEvent?.commentPointEventStatus || "").toLowerCase();
    const reviewedPointValue = comment?.pointEventPoints ?? pointEvent?.commentPointEventPoints ?? pointEvent?.approvedPoints;
    const pointDraft = commentPointDraftById[commentId] ?? reviewedPointValue ?? pointEvent?.points ?? "";
    const isReviewed =
      Boolean(savedCommentRowsById[commentId]) ||
      reviewedPointStatus === "approved" ||
      Boolean(comment?.pointEventReviewedAt || pointEvent?.commentPointEventReviewedAt) ||
      String(pointEvent?.status || "").toLowerCase() === "approved";
    if (isReviewed && !editingCommentRowsById[commentId]) return;

    let pointEventId = isReviewed ? reviewedPointEventId || Number(pointEvent?.eventId || 0) : Number(pointEvent?.eventId || 0);
    let parsedPoints = null;
    if (pointDraft !== undefined && String(pointDraft).trim() !== "") {
      parsedPoints = Number(pointDraft);
      if (!Number.isInteger(parsedPoints)) {
        setExperienceNoticeModal({
          title: "Invalid points",
          message: "Comment points must be an integer.",
        });
        return;
      }
    }

    setSavedCommentRowsById((prev) => {
      const next = {
        ...prev,
        [commentId]: true,
      };
      writeCommentReviewCache(next);
      return next;
    });
    setEditingCommentRowsById((prev) => ({
      ...prev,
      [commentId]: false,
    }));
    setCachedCommentRowsById((prev) => {
      const reviewedRow = {
        ...comment,
        eventType: "comment_given",
        status: String(comment?.status || "approved").toLowerCase() === "pending" ? "approved" : comment?.status || "approved",
        pointEventId: pointEventId || comment?.pointEventId || pointEvent?.eventId || null,
        commentPointEventId: pointEventId || comment?.commentPointEventId || comment?.pointEventId || null,
        pointEventStatus: "approved",
        pointEventPoints: parsedPoints ?? pointDraft,
        pointEventReviewedAt: new Date().toISOString(),
        pointEvent: {
          ...(pointEvent || {}),
          eventId: pointEventId || pointEvent?.eventId,
          eventType: "comment_given",
          status: "approved",
          points: parsedPoints ?? pointDraft,
          commentPointEventStatus: "approved",
          commentPointEventPoints: parsedPoints ?? pointDraft,
          commentPointEventReviewedAt: new Date().toISOString(),
        },
      };
      const next = {
        ...prev,
        [commentId]: reviewedRow,
      };
      writeCommentReviewRowCache(next);
      return next;
    });

    if (String(comment?.status || "pending").toLowerCase() === "pending") {
      const reviewPayload = await controller.onApproveComment(
        commentId,
        commentNoteById[commentId] || "Approved from content management table.",
      );
      const generatedIds = Array.isArray(reviewPayload?.data?.pointReview?.pointEventIds)
        ? reviewPayload.data.pointReview.pointEventIds
        : [];
      pointEventId = pointEventId || Number(generatedIds[0] || 0);
    }

    if (pointEventId && parsedPoints !== null) {
      await controller.onApprovePointEventInline(
        pointEventId,
        parsedPoints,
        `Moderator scored comment #${commentId} with ${parsedPoints} points.`,
      );
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

  const renderDocumentTable = () => (
    <div className="moderation-table-block">
      <div className="moderation-table-toolbar">
        <input
          type="search"
          value={documentSearch}
          onChange={(event) => {
            setDocumentSearch(event.target.value);
            setDocumentPage(1);
          }}
          placeholder="Search documents by author, title, course, or status"
          aria-label="Search moderation documents"
        />
        <span>
          {pagedDocumentRows.length} / {documentReviewRows.length} rows
        </span>
      </div>
      {documentReviewRows.length === 0 ? (
        <p className="subtle-text">No documents match this search.</p>
      ) : (
        <div className="moderation-table-scroll">
          <table className="moderation-data-table moderation-documents-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Owner</th>
                <th>Course</th>
                <th>Course ID</th>
                <th>Status</th>
                <th>Points</th>
                <th>Experience</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pagedDocumentRows.map((doc) => {
                const documentId = Number(doc.documentId || 0);
                const isFocused = Number(focusedDocumentId) === documentId;
                const pointEvent = getDocumentPointEvent(documentId);
                const pointValue =
                  docPointDraftById[documentId] ??
                  pointEvent?.points ??
                  doc.approvedPoints ??
                  doc.pointsAwarded ??
                  "";
                const statusValue = docStatusDraftById[documentId] || doc.status || "pending";
                const wasSaved = Boolean(savedDocRowsById[documentId]) || String(pointEvent?.status || "").toLowerCase() === "approved";
                return (
                  <Fragment key={`document-row-${doc.moderationKind}-${documentId}`}>
                    <tr className={isFocused ? "is-focused" : ""}>
                      <td>
                        <button type="button" className="moderation-name-button" onClick={() => controller.onOpenPreview(doc)}>
                          {doc.title || "Untitled"}
                        </button>
                        <small>#{documentId} | {formatDate(doc.createdAt || doc.updatedAt)}</small>
                        {doc.latestReportReason ? <small>Latest report: {doc.latestReportReason}</small> : null}
                      </td>
                      <td>
                        <strong>{doc.ownerName || "N/A"}</strong>
                        {doc.ownerEmail ? <small>{doc.ownerEmail}</small> : null}
                      </td>
                      <td>{getCourseLabel(doc)}</td>
                      <td>
                        <span className="moderation-id-pill">{getCategoryId(doc)}</span>
                      </td>
                      <td>
                        <select
                          className={`moderation-status-select ${String(statusValue).toLowerCase()}`}
                          value={statusValue}
                          disabled={controlsDisabled || doc.isReported}
                          onChange={(event) =>
                            setDocStatusDraftById((prev) => ({
                              ...prev,
                              [documentId]: event.target.value,
                            }))
                          }
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                      <td>
                        <input
                          className="moderation-point-input"
                          type="number"
                          value={pointValue}
                          placeholder="-"
                          disabled={controlsDisabled}
                          onChange={(event) =>
                            setDocPointDraftById((prev) => ({
                              ...prev,
                              [documentId]: event.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="moderation-icon-action edit"
                          title="Edit experience"
                          aria-label="Edit experience"
                          disabled={controlsDisabled}
                          onClick={() => openDocumentExperienceEditor(doc)}
                        >
                          <ButtonIcon name="edit" />
                        </button>
                      </td>
                      <td>
                        <div className="table-action-row">
                          <button
                            type="button"
                            className={`moderation-icon-action ${wasSaved ? "edit" : "save"}`}
                            title={wasSaved ? "Edit" : "Save"}
                            aria-label={wasSaved ? "Edit" : "Save"}
                            disabled={controlsDisabled}
                            onClick={() => saveDocumentRow(doc)}
                          >
                            <ButtonIcon name={wasSaved ? "edit" : "save"} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {model.duplicateByDocId[documentId] ? (
                      <tr className="moderation-table-detail-row">
                        <td colSpan={8}>{renderDuplicateList(documentId)}</td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {renderPagination({
            currentPage: safeDocumentPage,
            pageCount: documentPageCount,
            onPageChange: setDocumentPage,
            label: "documents",
          })}
        </div>
      )}
    </div>
  );

  const handleAddCommentExperience = async (comment) => {
    const commentId = Number(comment?.commentId || 0);
    if (!commentId || controlsDisabled || addingExperienceKey) return;
    setAddingExperienceKey(`comment:${commentId}`);
    try {
      await controller.onAddCommentExperience(comment);
      setCommentExperienceAddedById((prev) => ({
        ...prev,
        [commentId]: true,
      }));
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

  const openQaRatingDetailModal = (event, details) => {
    setQaRatingDetailModal({
      event,
      details,
    });
  };

  const handleQaRatingRowClick = (clickEvent, event, details) => {
    if (clickEvent.target.closest("button, input, select, textarea, a")) return;
    openQaRatingDetailModal(event, details);
  };

  const renderCommentsTable = () => (
    <div className="moderation-table-block">
      <div className="moderation-table-toolbar">
        <input
          type="search"
          value={commentSearch}
          onChange={(event) => {
            setCommentSearch(event.target.value);
            setCommentPage(1);
          }}
          placeholder="Search comments by document, user, or content"
          aria-label="Search moderation comments"
        />
        <span>
          {pagedCommentRows.length} / {commentReviewRows.length} rows
        </span>
      </div>
      {commentReviewRows.length === 0 ? (
        <p className="subtle-text">No comments match this search.</p>
      ) : (
        <div className="moderation-table-scroll">
          <table className="moderation-data-table moderation-comments-table">
            <thead>
              <tr>
                <th>Comment ID</th>
                <th>Document</th>
                <th>User</th>
                <th>Content</th>
                <th>Points</th>
                <th>Status</th>
                <th>Add experience</th>
                <th>Save result</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pagedCommentRows.map((comment) => {
                const commentId = Number(comment.commentId || 0);
                const pointEvent = comment.pointEvent || getCommentPointEvent(commentId);
                const reviewedPointEventId = Number(comment.commentPointEventId || comment.pointEventId || 0);
                const reviewedPointStatus = String(
                  comment.pointEventStatus || pointEvent?.commentPointEventStatus || "",
                ).toLowerCase();
                const reviewedPointValue =
                  comment.pointEventPoints ?? pointEvent?.commentPointEventPoints ?? pointEvent?.approvedPoints;
                const pointValue = commentPointDraftById[commentId] ?? reviewedPointValue ?? pointEvent?.points ?? "";
                const isReviewed =
                  Boolean(savedCommentRowsById[commentId]) ||
                  reviewedPointStatus === "approved" ||
                  Boolean(comment.pointEventReviewedAt || pointEvent?.commentPointEventReviewedAt) ||
                  String(pointEvent?.status || "").toLowerCase() === "approved";
                const isEditing = Boolean(editingCommentRowsById[commentId]);
                const canEditPoints = !isReviewed || isEditing;
                const canSaveResult = canEditPoints && String(pointValue ?? "").trim() !== "";
                const addExperienceKey = `comment:${commentId}`;
                const isExperienceAdded = Boolean(commentExperienceAddedById[commentId] || comment.experienceAdded);
                const isFocused =
                  Number(comment.commentId) === focusedCommentId ||
                  (focusedCommentId <= 0 && focusedDocumentId > 0 && Number(comment.documentId) === focusedDocumentId);

                return (
                  <tr key={`comment-row-${commentId}`} className={isFocused ? "is-focused" : ""}>
                    <td>
                      <span className="moderation-id-pill">c{commentId}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="moderation-name-button"
                        onClick={() =>
                          controller.onOpenPreview({
                            documentId: comment.documentId,
                            title: comment.documentTitle,
                          })
                        }
                      >
                        {comment.documentTitle || "N/A"}
                      </button>
                      <small>Document #{comment.documentId || "N/A"}</small>
                    </td>
                    <td>
                      <div className="moderation-user-cell">
                        <span className="moderation-avatar">{getInitials(comment.authorName)}</span>
                        <div>
                          <strong>{comment.authorName || "N/A"}</strong>
                          <small>{comment.authorEmail || `User #${comment.authorUserId || "N/A"}`}</small>
                        </div>
                      </div>
                    </td>
                    <td className="moderation-table-long-text">
                      <span>{comment.content || "No content."}</span>
                      <small>Status: {comment.status || "pending"}</small>
                    </td>
                    <td>
                      <input
                        className="moderation-point-input"
                        type="number"
                        value={pointValue}
                        placeholder="-"
                        disabled={controlsDisabled || !canEditPoints}
                        onChange={(event) =>
                          setCommentPointDraftById((prev) => ({
                            ...prev,
                            [commentId]: event.target.value,
                          }))
                        }
                      />
                    </td>
                    <td>
                      <span className={isReviewed ? "moderation-reviewed-badge" : "moderation-pending-review-badge"}>
                        {isReviewed ? "Đã đánh giá" : "Chưa đánh giá"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="moderation-icon-action experience"
                        title={isExperienceAdded ? "Added experience" : "Add experience"}
                        aria-label={isExperienceAdded ? "Added experience" : "Add experience"}
                        disabled={controlsDisabled || !isReviewed || addingExperienceKey === addExperienceKey || isExperienceAdded}
                        onClick={() => handleAddCommentExperience(comment)}
                      >
                        <ButtonIcon name="experience" />
                      </button>
                    </td>
                    <td>
                      <div className="table-action-row">
                        <button
                          type="button"
                          className="moderation-icon-action save"
                          title="Save"
                          aria-label="Save"
                          disabled={controlsDisabled || !canSaveResult}
                          onClick={() => saveCommentRow(comment)}
                        >
                          <ButtonIcon name="save" />
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="table-action-row">
                        <button
                          type="button"
                          className="moderation-icon-action edit"
                          title="Edit"
                          aria-label="Edit"
                          disabled={controlsDisabled || !isReviewed || isEditing}
                          onClick={() =>
                            setEditingCommentRowsById((prev) => ({
                              ...prev,
                              [commentId]: true,
                            }))
                          }
                        >
                          <ButtonIcon name="edit" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {renderPagination({
            currentPage: safeCommentPage,
            pageCount: commentPageCount,
            onPageChange: setCommentPage,
            label: "comments",
          })}
        </div>
      )}
      <p className="moderation-table-footnote">Each row saves independently. Click Save to confirm, then it becomes Edit.</p>
    </div>
  );

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
                    className="moderation-icon-action experience"
                    title="Add experience"
                    aria-label="Add experience"
                    disabled={controlsDisabled || Boolean(addingExperienceKey)}
                    onClick={() => handleAddQaRatingExperience(event)}
                  >
                    <ButtonIcon name="experience" />
                  </button>
                  <button
                    type="button"
                    className="moderation-icon-action delete"
                    title="Delete"
                    aria-label="Delete"
                    disabled={controlsDisabled || Boolean(addingExperienceKey)}
                    onClick={() => handleDeleteQaRating(event)}
                  >
                    <ButtonIcon name="delete" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );

  const renderQaRatingReviewTable = () => (
    <>
      <div className="moderation-subhead">
        <h3>QA Rating Review</h3>
        <p>Review user rating feedback, approve owner reward points, and add useful answers to hidden knowledge.</p>
      </div>
      <div className="moderation-table-block">
        <div className="moderation-table-toolbar">
          <input
            type="search"
            value={qaRatingSearch}
            onChange={(event) => {
              setQaRatingSearch(event.target.value);
              setQaRatingPage(1);
            }}
            placeholder="Search Q&A ratings by document, owner, asker, or feedback"
            aria-label="Search Q&A rating reviews"
          />
          <span>
            {pagedQaRatingReviewItems.length} / {filteredQaRatingReviewItems.length} rows
          </span>
        </div>
        {filteredQaRatingReviewItems.length === 0 ? (
          <p className="subtle-text">No Q&A rating rows match this search.</p>
        ) : (
          <div className="moderation-table-scroll">
            <table className="moderation-data-table moderation-qa-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Owner</th>
                  <th>Asker</th>
                  <th>Rating</th>
                  <th>Rating details</th>
                  <th>Mod/Admin points</th>
                  <th>Experience</th>
                  <th>Save</th>
                  <th>Edit</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {pagedQaRatingReviewItems.map((event) => {
                  const details = getQaRatingDetails(event);
                  const isReviewed = String(event.reviewState || "").toLowerCase() === "reviewed";
                  const reviewedPoints = Number(event.reviewedPoints ?? event.points ?? 0);
                  const isFocused =
                    Number(event.eventId) === focusedPointEventId ||
                    (focusedPointEventId <= 0 && focusedQaSessionId > 0 && Number(event.qaSessionId) === focusedQaSessionId);
                  const addKey = `qa-rating:${Number(event.eventId || 0)}`;
                  const draftValue = qaPointDraftById[event.eventId] ?? event.points ?? "";

                  return (
                    <tr
                      key={`qa-rating-table-${event.eventId}`}
                      className={`moderation-clickable-row ${isFocused ? "is-focused" : ""}`}
                      tabIndex={0}
                      onClick={(clickEvent) => handleQaRatingRowClick(clickEvent, event, details)}
                      onKeyDown={(keyEvent) => {
                        if (keyEvent.key === "Enter" || keyEvent.key === " ") {
                          keyEvent.preventDefault();
                          openQaRatingDetailModal(event, details);
                        }
                      }}
                    >
                      <td>
                        <button
                          type="button"
                          className="moderation-name-button"
                          onClick={() => openQaRatingDetailModal(event, details)}
                        >
                          {event.documentTitle || "N/A"}
                        </button>
                        <small className="table-text-ellipsis">Document #{event.documentId || "N/A"} | Session #{event.qaSessionId || "N/A"}</small>
                      </td>
                      <td>
                        <strong className="table-text-ellipsis">{event.userName || event.username || `User #${event.userId}`}</strong>
                        {event.userEmail ? <small className="table-text-ellipsis">{event.userEmail}</small> : null}
                      </td>
                      <td>
                        <strong className="table-text-ellipsis">
                          {event.sourceUserName ||
                            event.sourceUsername ||
                            `User #${event.sourceUserId || event.metadataJson?.askedByUserId || "N/A"}`}
                        </strong>
                        {event.sourceUserEmail ? <small className="table-text-ellipsis">{event.sourceUserEmail}</small> : null}
                      </td>
                      <td>
                        <strong>{details.stars > 0 ? `${details.stars}/5` : "N/A"}</strong>
                        {typeof details.isSatisfied === "boolean" ? (
                          <small>{details.isSatisfied ? "Satisfied" : "Not satisfied"}</small>
                        ) : null}
                      </td>
                      <td className="moderation-table-long-text moderation-table-clamp">
                        {details.questionSummary ? <span>Question: {details.questionSummary}</span> : null}
                        {details.authorSolution ? <span>Answer: {details.authorSolution}</span> : null}
                        <span>Feedback: {details.feedback || "No feedback text."}</span>
                      </td>
                      <td>
                        {isReviewed ? (
                          <span className="moderation-reviewed-badge">{reviewedPoints} points</span>
                        ) : (
                          <input
                            className="moderation-point-input"
                            type="number"
                            value={draftValue}
                            disabled={controlsDisabled}
                            onChange={(changeEvent) =>
                              setQaPointDraftById((prev) => ({
                                ...prev,
                                [event.eventId]: changeEvent.target.value,
                              }))
                            }
                          />
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="moderation-icon-action experience"
                          title="Add experience"
                          aria-label="Add experience"
                          disabled={controlsDisabled || Boolean(addingExperienceKey)}
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            handleAddQaRatingExperience(event);
                          }}
                        >
                          <ButtonIcon name="experience" />
                        </button>
                        {event.experienceAdded ? <small className="moderation-table-note">Added</small> : null}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="moderation-icon-action save"
                          title="Save"
                          aria-label="Save"
                          disabled={controlsDisabled || isReviewed}
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            saveQaRatingPointsInline(event);
                          }}
                        >
                          <ButtonIcon name="save" />
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="moderation-icon-action edit"
                          title="Edit rating"
                          aria-label="Edit rating"
                          disabled={controlsDisabled}
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            openPointReviewModal({ event, context: { kind: "qa_rating" } });
                          }}
                        >
                          <ButtonIcon name="edit" />
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="moderation-icon-action delete"
                          title="Delete"
                          aria-label="Delete"
                          disabled={controlsDisabled || Boolean(addingExperienceKey)}
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            handleDeleteQaRating(event);
                          }}
                        >
                          <ButtonIcon name="delete" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {renderPagination({
              currentPage: safeQaRatingPage,
              pageCount: qaRatingPageCount,
              onPageChange: setQaRatingPage,
              label: "QA rating",
            })}
          </div>
        )}
      </div>
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
          <h2>Content Management</h2>
          <p>Duyệt, chấm điểm và quản lý nội dung nền tảng.</p>
        </div>
        <div className="moderation-header-actions">
          <span className="moderation-alert-pill warning">{Number(model.queueSummary?.pendingDocs || 0)} pending docs</span>
          <span className="moderation-alert-pill info">{Number(model.queueSummary?.pendingComments || 0)} pending comments</span>
          <button type="button" disabled={controlsDisabled} onClick={() => controller.onRefreshOverview()}>
            Refresh
          </button>
        </div>
      </div>

      <div className="moderation-queue-tabs" aria-label="Moderation queue sections">
        <button
          type="button"
          className={isDocumentsQueue ? "active" : ""}
          onClick={() => controller.onChangeQueue("documents")}
        >
          Documents <span>{documentReviewRows.length}</span>
        </button>
        <button
          type="button"
          className={isCommentsQueue ? "active" : ""}
          onClick={() => controller.onChangeQueue("comments")}
        >
          Comments <span>{commentReviewRows.length}</span>
        </button>
        <button
          type="button"
          className={isQaRatingsQueue ? "active" : ""}
          onClick={() => controller.onChangeQueue("qa-ratings")}
        >
          QA Rating <span>{qaRatingReviewItems.length}</span>
        </button>
      </div>

      {controlsDisabled && <p className="hint">Processing moderation action...</p>}

      {isDocumentsQueue ? (
        <>
          <div className="moderation-subhead">
            <h3>Documents</h3>
            <p>Search and review pending uploads or reported documents in one table.</p>
          </div>
          {renderDocumentTable()}
        </>
      ) : isCommentsQueue ? (
        <>
          <div className="moderation-subhead">
            <h3>Comments</h3>
            <p>Search, approve, and score comments in one table.</p>
          </div>
          {renderCommentsTable()}
        </>
      ) : (
        <>
          {renderQaRatingReviewTable()}
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

      {documentExperienceModal && (
        <ModalPortal>
          <div className="report-modal-backdrop" role="dialog" aria-modal="true">
            <div className="report-modal document-experience-modal">
              <div className="report-modal-head">
                <h3>Document experience</h3>
                <button type="button" className="report-close-btn" onClick={() => setDocumentExperienceModal(null)}>
                  x
                </button>
              </div>
              <p className="report-modal-sub">
                #{documentExperienceModal.documentId} - {documentExperienceModal.doc?.title || "Untitled"}
              </p>
              {documentExperienceModal.isLoading ? (
                <p className="report-modal-sub">Loading experience...</p>
              ) : (
                <div className="document-experience-editor">
                  <label>
                    <span>Title</span>
                    <input
                      type="text"
                      value={documentExperienceModal.title || ""}
                      disabled={documentExperienceModal.isSaving}
                      onChange={(event) => updateDocumentExperienceModal({ title: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>Status</span>
                    <select
                      value={documentExperienceModal.status || "draft"}
                      disabled={documentExperienceModal.isSaving}
                      onChange={(event) => updateDocumentExperienceModal({ status: event.target.value })}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                  <label className="document-experience-content-field">
                    <span>Experience content</span>
                    <textarea
                      value={documentExperienceModal.content || ""}
                      disabled={documentExperienceModal.isSaving}
                      onChange={(event) => updateDocumentExperienceModal({ content: event.target.value })}
                    />
                  </label>
                  {documentExperienceModal.error ? (
                    <p className="form-error">{documentExperienceModal.error}</p>
                  ) : null}
                </div>
              )}
              <div className="report-modal-actions">
                <button type="button" onClick={() => setDocumentExperienceModal(null)}>
                  Close
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  disabled={documentExperienceModal.isLoading || documentExperienceModal.isSaving}
                  onClick={saveDocumentExperienceEditor}
                >
                  {documentExperienceModal.isSaving ? "Saving..." : "Save experience"}
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

      {qaRatingDetailModal && (
        <ModalPortal>
          <div className="report-modal-backdrop" role="dialog" aria-modal="true">
            <div className="report-modal qa-rating-detail-modal">
              <div className="report-modal-head">
                <h3>Q&A rating feedback</h3>
                <button type="button" className="report-close-btn" onClick={() => setQaRatingDetailModal(null)}>
                  x
                </button>
              </div>
              <div className="qa-rating-detail-grid">
                <section>
                  <span>Document</span>
                  <strong>{qaRatingDetailModal.event?.documentTitle || "N/A"}</strong>
                  <small>Document #{qaRatingDetailModal.event?.documentId || "N/A"} | Session #{qaRatingDetailModal.event?.qaSessionId || "N/A"}</small>
                </section>
                <section>
                  <span>Owner</span>
                  <strong>{qaRatingDetailModal.event?.userName || qaRatingDetailModal.event?.username || `User #${qaRatingDetailModal.event?.userId || "N/A"}`}</strong>
                  {qaRatingDetailModal.event?.userEmail ? <small>{qaRatingDetailModal.event.userEmail}</small> : null}
                </section>
                <section>
                  <span>Asker</span>
                  <strong>
                    {qaRatingDetailModal.event?.sourceUserName ||
                      qaRatingDetailModal.event?.sourceUsername ||
                      `User #${qaRatingDetailModal.event?.sourceUserId || qaRatingDetailModal.event?.metadataJson?.askedByUserId || "N/A"}`}
                  </strong>
                  {qaRatingDetailModal.event?.sourceUserEmail ? <small>{qaRatingDetailModal.event.sourceUserEmail}</small> : null}
                </section>
                <section>
                  <span>Rating</span>
                  <strong>{qaRatingDetailModal.details?.stars > 0 ? `${qaRatingDetailModal.details.stars}/5` : "N/A"}</strong>
                  {typeof qaRatingDetailModal.details?.isSatisfied === "boolean" ? (
                    <small>{qaRatingDetailModal.details.isSatisfied ? "Satisfied" : "Not satisfied"}</small>
                  ) : null}
                </section>
              </div>
              <div className="qa-rating-detail-content">
                <section>
                  <h4>Question</h4>
                  <p>{qaRatingDetailModal.details?.questionSummary || "No question summary."}</p>
                </section>
                <section>
                  <h4>Owner answer</h4>
                  <p>{qaRatingDetailModal.details?.authorSolution || "No owner answer summary."}</p>
                </section>
                <section>
                  <h4>User feedback</h4>
                  <p>{qaRatingDetailModal.details?.feedback || "No feedback text."}</p>
                </section>
                {qaRatingDetailModal.details?.satisfactionNote ? (
                  <section>
                    <h4>Satisfaction note</h4>
                    <p>{qaRatingDetailModal.details.satisfactionNote}</p>
                  </section>
                ) : null}
              </div>
              <div className="report-modal-actions">
                <button type="button" className="primary-btn" onClick={() => setQaRatingDetailModal(null)}>
                  Close
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
