import { useEffect, useRef, useState } from "react";
import { API_BASE_URL, API_ORIGIN, apiRequest } from "./api";
import AuthShell from "./views/auth.view";
import DashboardShell from "./views/dashboard.view";
import {
  hasModeratorRole,
  initialLogin,
  initialRegister,
  roleTabs,
  tabLabel,
} from "./models/app.constants";
import { createAuthFeature } from "./services/auth.service";
import { createCategoryFeature } from "./services/category.service";
import { createCommentFeature } from "./services/comment.service";
import { createDataFeature } from "./services/data.service";
import { createEngagementFeature } from "./services/engagement.service";
import { createModerationFeature } from "./services/moderation.service";
import { createNotificationFeature } from "./services/notification.service";
import { createPointEventFeature } from "./services/point-event.service";
import { createPointsFeature } from "./services/points.service";
import { createReportFeature } from "./services/report.service";
import { createUploadFeature } from "./services/upload.service";
import { createAdminUserFeature } from "./services/admin-user.service";
import { getPasswordStrength, isStrongPassword } from "./models/password.model";
import { createOpenPreview, resolveFileUrl } from "./models/preview.model";

function AppController() {
  const getUrlSearchParams = () => {
    try {
      return new URLSearchParams(window.location.search);
    } catch {
      return new URLSearchParams();
    }
  };

  const queryParams = getUrlSearchParams();
  const queryDocId = queryParams.get("docId");
  const queryTab = queryParams.get("tab");
  const queryAuth = queryParams.get("auth");
  const querySessionId = queryParams.get("sessionId");

  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  });
  const [activeTab, setActiveTabState] = useState(() => {
    const preferredTab = queryTab || (queryDocId ? "reader" : "home");
    if (preferredTab === "reader" && !queryDocId) {
      return "home";
    }
    return preferredTab;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [loginForm, setLoginForm] = useState(initialLogin);
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotOtpPreview, setForgotOtpPreview] = useState("");
  const [authMode, setAuthModeState] = useState(queryAuth || "guest");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpPreview, setOtpPreview] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isRegisterOtpSending, setIsRegisterOtpSending] = useState(false);

  const [categories, setCategories] = useState([]);
  const [docs, setDocs] = useState([]);
  const [homeDocs, setHomeDocs] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [reportedDocs, setReportedDocs] = useState([]);
  const [pendingPointEvents, setPendingPointEvents] = useState([]);
  const [pendingComments, setPendingComments] = useState([]);
  const [moderationStats, setModerationStats] = useState(null);
  const [moderationTimeline, setModerationTimeline] = useState([]);
  const [myDocs, setMyDocs] = useState([]);
  const [pointSummary, setPointSummary] = useState(null);
  const [pointTransactions, setPointTransactions] = useState([]);
  const [myPointEvents, setMyPointEvents] = useState([]);
  const [pointPolicy, setPointPolicy] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminDocuments, setAdminDocuments] = useState([]);
  const [duplicateByDocId, setDuplicateByDocId] = useState({});
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewComments, setPreviewComments] = useState([]);
  const [docEngagementById, setDocEngagementById] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryDocs, setCategoryDocs] = useState([]);
  const [qaSessions, setQaSessions] = useState([]);
  const [activeQaSession, setActiveQaSession] = useState(null);
  const [qaMessages, setQaMessages] = useState([]);
  const [qaFilter, setQaFilter] = useState("all");
  const [qaRatedSessionMap, setQaRatedSessionMap] = useState({});
  const [recentlyOpenedDocIds, setRecentlyOpenedDocIds] = useState([]);
  const [totalMyDocUpvotes, setTotalMyDocUpvotes] = useState(0);
  const [moderationFocus, setModerationFocus] = useState({
    documentId: null,
    commentId: null,
    qaSessionId: null,
    pointEventId: null,
  });

  const [docFilter, setDocFilter] = useState({
    keyword: "",
    categoryId: "",
    categoryKeyword: "",
  });
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    categoryNames: "",
    file: null,
  });
  const [newCategoryForm, setNewCategoryForm] = useState({ name: "", description: "" });
  const [courseInput, setCourseInput] = useState("");
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isUploadSubmitting, setIsUploadSubmitting] = useState(false);
  const [pendingActionCount, setPendingActionCount] = useState(0);
  const topicPickerRef = useRef(null);
  const upvoteSyncSignatureRef = useRef("");
  const actionLocksRef = useRef(new Set());

  const isModerator = hasModeratorRole(user?.role);

  const registerPasswordStrength = getPasswordStrength(registerForm.password);
  const forgotPasswordStrength = getPasswordStrength(forgotNewPassword);
  const hasRegisterPasswordInput = registerForm.password.length > 0;
  const hasForgotPasswordInput = forgotNewPassword.length > 0;
  const registerPasswordInvalid = hasRegisterPasswordInput && !isStrongPassword(registerForm.password);
  const forgotPasswordInvalid = hasForgotPasswordInput && !isStrongPassword(forgotNewPassword);

  const resetWorkspaceState = () => {
    setActiveTabState("home");
    setPreviewDoc(null);
    setSelectedCategory(null);
    setCategoryDocs([]);
    setPendingDocs([]);
    setReportedDocs([]);
    setPendingPointEvents([]);
    setPendingComments([]);
    setModerationStats(null);
    setModerationTimeline([]);
    setPointSummary(null);
    setPointTransactions([]);
    setMyPointEvents([]);
    setPointPolicy(null);
    setDuplicateByDocId({});
    setNotifications([]);
    setAdminUsers([]);
    setAdminDocuments([]);
    setDocEngagementById({});
    setPreviewComments([]);
    setQaSessions([]);
    setActiveQaSession(null);
    setQaMessages([]);
    setQaFilter("all");
    setQaRatedSessionMap({});
    setModerationFocus({
      documentId: null,
      commentId: null,
      qaSessionId: null,
      pointEventId: null,
    });
    setCourseInput("");
    setShowCourseDropdown(false);
    setTagInput("");
    setSelectedTags([]);
    setStatus("");
    setError("");
    setIsUploadSubmitting(false);
    setIsRegisterOtpSending(false);
  };

  const setSession = (nextToken, nextUser) => {
    resetWorkspaceState();
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem("token", nextToken);
    localStorage.setItem("user", JSON.stringify(nextUser));
  };

  const updateUrlState = ({
    nextTab = null,
    docId = null,
    preserveDocId = false,
    sessionId = null,
    preserveSessionId = false,
    nextAuth = null,
    replace = false,
  } = {}) => {
    try {
      const current = new URL(window.location.href);

      if (nextTab) {
        current.searchParams.set("tab", String(nextTab));
      } else {
        current.searchParams.delete("tab");
      }

      if (docId) {
        current.searchParams.set("docId", String(docId));
      } else if (!preserveDocId) {
        current.searchParams.delete("docId");
      }

      if (sessionId) {
        current.searchParams.set("sessionId", String(sessionId));
      } else if (!preserveSessionId) {
        current.searchParams.delete("sessionId");
      }

      if (nextAuth) {
        current.searchParams.set("auth", String(nextAuth));
      } else {
        current.searchParams.delete("auth");
      }

      if (replace) {
        window.history.replaceState({}, "", current.toString());
      } else {
        window.history.pushState({}, "", current.toString());
      }
    } catch {
      // no-op
    }
  };

  const setAuthMode = (nextMode, options = {}) => {
    const { replace = false } = options;
    setAuthModeState(nextMode);
    updateUrlState({ nextAuth: nextMode, replace });
  };

  const clearSession = () => {
    resetWorkspaceState();
    setToken("");
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    try {
      const current = new URL(window.location.href);
      let changed = false;
      if (current.searchParams.has("tab")) {
        current.searchParams.delete("tab");
        changed = true;
      }
      if (current.searchParams.has("docId")) {
        current.searchParams.delete("docId");
        changed = true;
      }
      if (current.searchParams.has("sessionId")) {
        current.searchParams.delete("sessionId");
        changed = true;
      }
      if (current.searchParams.get("auth") !== "guest") {
        current.searchParams.set("auth", "guest");
        changed = true;
      }
      if (changed) {
        window.history.replaceState({}, "", current.toString());
      }
    } catch {
      // no-op
    }
  };

  const clearFeedback = () => {
    setError("");
    setStatus("");
  };

  const requireAuthMessage = "Bạn chưa đăng nhập, vui lòng đăng nhập hoặc đăng ký tài khoản.";

  const getRecentReadStorageKey = (userId) => `neushare_recent_docs_${Number(userId || 0)}`;

  const saveRecentReads = (userId, ids) => {
    if (!Number.isInteger(Number(userId)) || Number(userId) <= 0) return;
    try {
      localStorage.setItem(getRecentReadStorageKey(userId), JSON.stringify(ids));
    } catch {
      // no-op
    }
  };

  const pushRecentlyOpenedDoc = (documentId) => {
    const numericDocId = Number(documentId || 0);
    const numericUserId = Number(user?.userId || 0);
    if (!Number.isInteger(numericDocId) || numericDocId <= 0) return;
    if (!Number.isInteger(numericUserId) || numericUserId <= 0) return;

    setRecentlyOpenedDocIds((prev) => {
      const next = [numericDocId, ...prev.filter((id) => Number(id) !== numericDocId)].slice(0, 20);
      saveRecentReads(numericUserId, next);
      return next;
    });
  };

  const setActiveTab = (nextTab, options = {}) => {
    if (!token && nextTab === "upload") {
      setStatus("");
      setError(requireAuthMessage);
      return;
    }
    if (nextTab === "categories" && !hasModeratorRole(user?.role)) {
      setStatus("");
      setError("Only moderator/admin can access course manager.");
      return;
    }
    if (nextTab === "users" && String(user?.role || "").toLowerCase() !== "admin") {
      setStatus("");
      setError("Only admin can access user management.");
      return;
    }
    if (nextTab === "documents" && !hasModeratorRole(user?.role)) {
      setStatus("");
      setError("Only moderator/admin can access documents management.");
      return;
    }

    const {
      docId = null,
      replace = false,
      preserveDocId = false,
      sessionId = null,
      preserveSessionId = false,
    } = options;
    setActiveTabState(nextTab);
    updateUrlState({
      nextTab,
      docId,
      preserveDocId,
      sessionId,
      preserveSessionId,
      replace,
    });

    if (nextTab !== "reader") {
      setPreviewDoc(null);
      setPreviewComments([]);
    }

    if (nextTab !== "qa") {
      setActiveQaSession(null);
      setQaMessages([]);
    }
  };

  const normalizeDocumentForViewer = (doc) => {
    if (!doc) return doc;

    const isGuest = !token;
    const role = user?.role || "user";
    const currentPoints = Number(user?.points || 0);
    const currentUserId = Number(user?.userId || 0);
    const isPrivileged = role === "admin" || role === "moderator";
    const ownerCandidateIds = [
      doc?.ownerUserId,
      doc?.ownerId,
      doc?.uploadedByUserId,
      doc?.uploadedById,
      doc?.createdByUserId,
      doc?.createdById,
      doc?.userId,
    ]
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);
    const isOwner = ownerCandidateIds.includes(currentUserId);
    const canBypass = isPrivileged || isOwner;
    const requiredPoints = Number.isFinite(Number(doc?.requiredPoints))
      ? Number(doc.requiredPoints)
      : 30;
    if (isGuest) {
      return {
        ...doc,
        ownerName: doc.ownerName || doc.authorName || doc.uploadedByName || "NeuShare member",
        currentUserId: 0,
        currentUserName: "Guest",
        isOwner: false,
        requiredPoints,
        isLockedForPoints: true,
        previewPageLimit: 5,
        canFullView: false,
        canDownload: false,
        points: 0,
        tier: "guest_locked",
        accessState: "locked",
        accessReason: requireAuthMessage,
        dailyViewLimit: null,
        todayFullViewCount: 0,
        viewsRemainingToday: null,
        lockedOverlay: {
          title: "Bạn chưa đăng nhập",
          message: requireAuthMessage,
          helperText: "Đăng nhập hoặc tạo tài khoản để mở toàn bộ nội dung tài liệu.",
          requiredPoints,
        },
      };
    }

    const canFullView = canBypass || currentPoints >= requiredPoints;
    const canDownload = canBypass || currentPoints >= 40;

    return {
      ...doc,
      ownerName: doc.ownerName || doc.authorName || doc.uploadedByName || "NeuShare member",
      currentUserId,
      currentUserName: user?.name || "",
      currentUserRole: user?.role || "user",
      isOwner,
      requiredPoints,
      isLockedForPoints: !canFullView,
      canFullView,
      canDownload,
      points: currentPoints,
      tier: canBypass ? "privileged" : currentPoints >= 40 ? "full_access" : currentPoints >= 30 ? "view_limited" : "locked",
      accessReason: "",
      dailyViewLimit: null,
      todayFullViewCount: 0,
      viewsRemainingToday: null,
      previewPageLimit: null,
      lockedOverlay: null,
    };
  };

  const refreshCurrentUser = async () => {
    if (!token) return;
    const payload = await apiRequest("/auth/me", { token });
    if (payload?.data) {
      setUser((prev) => {
        const merged = { ...(prev || {}), ...payload.data };
        localStorage.setItem("user", JSON.stringify(merged));
        return merged;
      });
    }
  };

  const call = async (fn, options = {}) => {
    const { clear = true, actionKey = "" } = options;
    const normalizedActionKey = String(actionKey || "").trim();

    if (normalizedActionKey && actionLocksRef.current.has(normalizedActionKey)) {
      return false;
    }

    if (normalizedActionKey) {
      actionLocksRef.current.add(normalizedActionKey);
    }

    if (clear) clearFeedback();
    setPendingActionCount((prev) => prev + 1);
    try {
      await fn();
      return true;
    } catch (e) {
      const message = e?.message || "Unknown error";
      if (message.toLowerCase().includes("jwt expired")) {
        clearSession();
        setAuthMode("login");
        setError("Session expired. Please login again.");
        return false;
      }
      setError(message);
      return false;
    } finally {
      if (normalizedActionKey) {
        actionLocksRef.current.delete(normalizedActionKey);
      }
      setPendingActionCount((prev) => Math.max(0, prev - 1));
    }
  };

  const loadModerationOverview = async () => {
    if (!token || !hasModeratorRole(user?.role)) {
      setModerationStats(null);
      setModerationTimeline([]);
      return;
    }

    const [statsPayload, timelinePayload] = await Promise.all([
      apiRequest("/moderation/stats", { token }),
      apiRequest("/moderation/timeline", { token, query: { limit: 10, offset: 0 } }),
    ]);

    setModerationStats(statsPayload?.data || null);
    setModerationTimeline(
      Array.isArray(timelinePayload?.data?.rows)
        ? timelinePayload.data.rows
        : Array.isArray(timelinePayload?.data)
          ? timelinePayload.data
          : [],
    );
  };

  const {
    loadCategories,
    loadDocuments,
    loadHomeDocuments,
    loadMyDocuments,
    loadPendingDocuments,
    loadAllUploadedDocuments,
    loadNotifications,
  } =
    createDataFeature({
      token,
      isModerator,
      docFilter,
      setCategories,
      setDocs,
      setHomeDocs,
      setMyDocs,
      setPendingDocs,
      setAdminDocuments,
      setNotifications,
    });

  const openDocumentReader = async (doc) => {
    const normalizedDoc = normalizeDocumentForViewer(doc);
    const documentId = Number(normalizedDoc?.documentId || 0);
    pushRecentlyOpenedDoc(documentId);

    if (!Number.isInteger(documentId) || documentId <= 0) {
      createOpenPreview(setPreviewDoc)({
        ...normalizedDoc,
        isLoading: false,
      });
      setActiveTab("reader", { docId: documentId || null });
      return;
    }

    if (!token) {
      setActiveTab("reader", { docId: documentId });
      createOpenPreview(setPreviewDoc)({
        ...normalizedDoc,
        previewUrl: "",
        previewReason: "Preparing your document preview...",
        isLoading: true,
      });

      clearFeedback();

      try {
        const previewPayload = await apiRequest(`/documents/${documentId}/preview`);
        const previewData = previewPayload?.data || {};
        createOpenPreview(setPreviewDoc)({
          ...normalizedDoc,
          accessState: previewData.accessState || "guest_locked",
          requiredPoints:
            Number(previewData.lockedOverlay?.requiredPoints || previewData.requiredPoints) ||
            normalizedDoc.requiredPoints,
          isLockedForPoints: true,
          canFullView: false,
          canDownload: false,
          canPreview: true,
          points: 0,
          tier: previewData.tier || "guest_locked",
          accessReason: previewData.reason || normalizedDoc.accessReason || "",
          lockedOverlay: previewData.lockedOverlay || normalizedDoc.lockedOverlay || null,
          previewPageLimit: Number(previewData.previewPageLimit || 5),
          viewer: previewData.viewer || null,
          viewerStatus: previewData.viewer?.status || "",
          viewerKind: previewData.viewer?.viewerKind || null,
          securePreviewUrl: previewData.viewer?.previewViewerUrl
            ? `${API_ORIGIN}${previewData.viewer.previewViewerUrl}`
            : "",
          previewReason: previewData.viewer?.reason || normalizedDoc.previewReason || "",
          isLoading: false,
        });
      } catch (e) {
        const message = e?.message || "Unknown error";
        setError(message);
        createOpenPreview(setPreviewDoc)({
          ...normalizedDoc,
          previewUrl: "",
          previewReason: message,
          isLockedForPoints: true,
          previewPageLimit: 5,
          isLoading: false,
        });
      }
      return;
    }

    setActiveTab("reader", { docId: documentId });
    createOpenPreview(setPreviewDoc)({
      ...normalizedDoc,
      previewUrl: "",
      previewReason: "Preparing your document viewer...",
      isLoading: true,
    });

    clearFeedback();

    try {
      const accessPayload = await apiRequest(`/documents/${documentId}/access`, { token });
      const accessData = accessPayload?.data || {};
      const policyDoc = {
        ...normalizedDoc,
        accessState: accessData.accessState || normalizedDoc.accessState,
        requiredPoints:
          Number(accessData.lockedOverlay?.requiredPoints || accessData.requiredPoints) ||
          normalizedDoc.requiredPoints,
        isLockedForPoints: Boolean(accessData.isLocked),
        canFullView: Boolean(accessData.canFullView),
        canDownload: Boolean(accessData.canDownload),
        downloadCost: Number(accessData.downloadCost || 0),
        points: Number(accessData.points ?? normalizedDoc.points ?? 0),
        tier: accessData.tier || normalizedDoc.tier || "",
        accessReason: accessData.reason || "",
        dailyViewLimit: Number.isFinite(Number(accessData.dailyViewLimit))
          ? Number(accessData.dailyViewLimit)
          : null,
        todayFullViewCount: Number(accessData.todayFullViewCount || 0),
        viewsRemainingToday: Number.isFinite(Number(accessData.viewsRemainingToday))
          ? Number(accessData.viewsRemainingToday)
          : null,
        lockedOverlay: accessData.lockedOverlay || null,
        previewPageLimit: Number.isFinite(Number(accessData.previewPageLimit))
          ? Number(accessData.previewPageLimit)
          : null,
        viewer: accessData.viewer || null,
        securePreviewUrl: accessData.viewer?.previewViewerUrl
          ? `${API_ORIGIN}${accessData.viewer.previewViewerUrl}`
          : accessData.canFullView && accessData.viewer?.viewerUrl
            ? `${API_ORIGIN}${accessData.viewer.viewerUrl}?token=${encodeURIComponent(token)}`
            : "",
        viewerStatus: accessData.viewer?.status || "",
        viewerKind: accessData.viewer?.viewerKind || null,
        previewReason: accessData.viewer?.reason || normalizedDoc.previewReason || "",
        isLoading: false,
      };

      if (accessData.canFullView) {
        const fullViewPayload = await apiRequest(`/documents/${documentId}/view`, {
          method: "POST",
          token,
        });
        const fullViewData = fullViewPayload?.data || {};

        createOpenPreview(setPreviewDoc)({
          ...policyDoc,
          fileUrl: fullViewData.fileUrl || normalizedDoc.fileUrl,
          viewer: fullViewData.viewer || policyDoc.viewer,
          securePreviewUrl:
            fullViewData.viewer?.viewerUrl
              ? `${API_ORIGIN}${fullViewData.viewer.viewerUrl}?token=${encodeURIComponent(token)}`
              : policyDoc.securePreviewUrl,
          viewerStatus: fullViewData.viewer?.status || policyDoc.viewerStatus,
          viewerKind: fullViewData.viewer?.viewerKind || policyDoc.viewerKind || null,
          previewReason: fullViewData.viewer?.reason || policyDoc.previewReason || "",
          isLockedForPoints: false,
          previewPageLimit: null,
          isLoading: false,
        });
        return;
      }

      createOpenPreview(setPreviewDoc)(policyDoc);
    } catch (e) {
      const message = e?.message || "Unknown error";
      if (message.toLowerCase().includes("jwt expired")) {
        clearSession();
        setAuthMode("login");
        setError("Session expired. Please login again.");
        return;
      }

      setError(message);
      createOpenPreview(setPreviewDoc)({
        ...normalizedDoc,
        previewUrl: "",
        previewReason: message,
        isLockedForPoints: Boolean(normalizedDoc.isLockedForPoints),
        isLoading: false,
      });
    }
  };

  const openPreview = (doc) => {
    void openDocumentReader(doc);
  };

  const openPreviewReload = (doc) => {
    if (!doc?.documentId) {
      openPreview(doc);
      return;
    }
    setActiveTab("reader", { docId: doc.documentId });
    openPreview(doc);
  };

  const parseNotificationMetadataSafe = (rawMetadata) => {
    if (!rawMetadata) return null;
    if (typeof rawMetadata === "object") return rawMetadata;
    if (typeof rawMetadata !== "string") return null;
    try {
      return JSON.parse(rawMetadata);
    } catch {
      return null;
    }
  };

  const extractQaSessionIdFromNotification = (notification) => {
    const metadata = parseNotificationMetadataSafe(notification?.metadata);
    const fromMeta = Number(metadata?.sessionId || metadata?.qaSessionId || 0);
    if (Number.isInteger(fromMeta) && fromMeta > 0) return fromMeta;
    const fromNotification = Number(notification?.sessionId || notification?.qaSessionId || 0);
    if (Number.isInteger(fromNotification) && fromNotification > 0) return fromNotification;
    return 0;
  };

  const isQaNotification = (notification) => {
    const type = String(notification?.type || "").toLowerCase();
    if (type.includes("qa") || type.includes("chat")) return true;
    return extractQaSessionIdFromNotification(notification) > 0;
  };

  const getUnreadQaNotifications = () =>
    (Array.isArray(notifications) ? notifications : []).filter(
      (item) => !item?.isRead && isQaNotification(item),
    );

  const getUnreadQaSessionMap = () => {
    const unreadMap = {};
    getUnreadQaNotifications().forEach((item) => {
      const sessionId = extractQaSessionIdFromNotification(item);
      if (!Number.isInteger(sessionId) || sessionId <= 0) return;
      unreadMap[sessionId] = Number(unreadMap[sessionId] || 0) + 1;
    });
    return unreadMap;
  };

  const loadQaSessions = async (statusFilter = qaFilter) => {
    if (!token) return [];
    const normalizedFilter = statusFilter === "all" ? "" : statusFilter;
    const payload = await apiRequest("/qa-sessions/my", {
      token,
      query: normalizedFilter ? { status: normalizedFilter } : undefined,
    });
    const list = Array.isArray(payload?.data) ? payload.data : [];
    setQaSessions(list);
    const ratedFromList = {};
    list.forEach((session) => {
      if (session?.hasRatedByCurrentUser) {
        ratedFromList[Number(session.sessionId)] = true;
      }
    });
    setQaRatedSessionMap((prev) => ({ ...prev, ...ratedFromList }));
    return list;
  };

  const openQaSession = async (sessionOrId, options = {}) => {
    const sessionId = Number(
      typeof sessionOrId === "object" ? sessionOrId?.sessionId : sessionOrId,
    );
    if (!token || !Number.isInteger(sessionId) || sessionId <= 0) return;

    await call(async () => {
      const payload = await apiRequest(`/qa-sessions/${sessionId}/messages`, { token });
      const data = payload?.data || {};
      setActiveQaSession(data.session || null);
      setQaMessages(Array.isArray(data.messages) ? data.messages : []);
      if (data?.session?.hasRatedByCurrentUser) {
        setQaRatedSessionMap((prev) => ({ ...prev, [sessionId]: true }));
      }
      setActiveTab("qa", {
        sessionId,
        replace: Boolean(options.replace),
      });

      const unreadForSession = getUnreadQaNotifications().filter(
        (item) => extractQaSessionIdFromNotification(item) === sessionId,
      );
      if (unreadForSession.length > 0) {
        await Promise.allSettled(
          unreadForSession.map((item) =>
            apiRequest(`/notifications/${item.notificationId}/read`, {
              method: "PATCH",
              token,
            }),
          ),
        );
        setNotifications((prev) =>
          (Array.isArray(prev) ? prev : []).map((item) =>
            unreadForSession.some(
              (unreadItem) => Number(unreadItem.notificationId) === Number(item.notificationId),
            )
              ? { ...item, isRead: true }
              : item,
          ),
        );
      }
    }, { actionKey: `qa:open:${sessionId}` });
  };

  const createQaSession = async (documentId, initialMessage = "") => {
    const numericId = Number(documentId || 0);
    if (!token || !Number.isInteger(numericId) || numericId <= 0) return;

    await call(async () => {
      const payload = await apiRequest("/qa-sessions", {
        method: "POST",
        token,
        body: {
          documentId: numericId,
          initialMessage: initialMessage.trim(),
        },
      });
      const session = payload?.data || null;
      await loadQaSessions();
      setStatus("Q&A session started successfully.");
      if (session?.sessionId) {
        await openQaSession(session.sessionId);
      } else {
        setActiveTab("qa");
      }
    }, { actionKey: `qa:create:${numericId}` });
  };

  const sendQaMessage = async (sessionId, message) => {
    const numericId = Number(sessionId || 0);
    if (!token || !Number.isInteger(numericId) || numericId <= 0) return;

    await call(async () => {
      await apiRequest(`/qa-sessions/${numericId}/messages`, {
        method: "POST",
        token,
        body: { message },
      });
      const latest = await apiRequest(`/qa-sessions/${numericId}/messages`, { token });
      setActiveQaSession(latest?.data?.session || activeQaSession);
      setQaMessages(Array.isArray(latest?.data?.messages) ? latest.data.messages : []);
      await loadQaSessions();
    }, { actionKey: `qa:send:${numericId}` });
  };

  const closeQaSession = async (sessionId) => {
    const numericId = Number(sessionId || 0);
    if (!token || !Number.isInteger(numericId) || numericId <= 0) return;

    await call(async () => {
      const payload = await apiRequest(`/qa-sessions/${numericId}/close`, {
        method: "PATCH",
        token,
      });
      setActiveQaSession(payload?.data || null);
      await loadQaSessions();
      setStatus("Q&A session closed.");
    }, { actionKey: `qa:close:${numericId}` });
  };

  const rateQaSession = async (sessionId, stars, feedback = "") => {
    const numericId = Number(sessionId || 0);
    if (!token || !Number.isInteger(numericId) || numericId <= 0) return;

    clearFeedback();
    try {
      await apiRequest(`/qa-sessions/${numericId}/rate`, {
        method: "POST",
        token,
        body: { stars, feedback: feedback.trim() || null },
      });

      setQaRatedSessionMap((prev) => ({ ...prev, [numericId]: true }));
      await loadQaSessions();
      const latest = await apiRequest(`/qa-sessions/${numericId}/messages`, { token });
      setActiveQaSession(latest?.data?.session || activeQaSession);
      setQaMessages(Array.isArray(latest?.data?.messages) ? latest.data.messages : []);
      setStatus("Rating submitted successfully. This Q&A session is now read-only.");
      setError("");
    } catch (e) {
      const message = e?.message || "Unknown error";
      const normalizedMessage = String(message).toLowerCase();

      if (normalizedMessage.includes("jwt expired")) {
        clearSession();
        setAuthMode("login");
        setError("Session expired. Please login again.");
        return;
      }

      if (normalizedMessage.includes("already rated")) {
        setQaRatedSessionMap((prev) => ({ ...prev, [numericId]: true }));
        await loadQaSessions();
        const latest = await apiRequest(`/qa-sessions/${numericId}/messages`, { token });
        setActiveQaSession(latest?.data?.session || activeQaSession);
        setQaMessages(Array.isArray(latest?.data?.messages) ? latest.data.messages : []);
        setStatus("You already rated this Q&A session. Chat is closed and read-only.");
        setError("");
        return;
      }

      setError(message);
    }
  };

  const {
    selectCourse,
    addTag,
    removeTag,
    onCourseInputKeyDown,
    onTagInputKeyDown,
    handleUpload,
  } = createUploadFeature({
    token,
    categories,
    uploadForm,
    courseInput,
    tagInput,
    selectedTags,
    setCategories,
    setUploadForm,
    setCourseInput,
    setShowCourseDropdown,
    setTagInput,
    setSelectedTags,
    setStatus,
    setError,
    isUploadSubmitting,
    setIsUploadSubmitting,
    isModerator,
    call,
    loadMyDocuments,
    loadPendingDocuments,
    loadCategories,
  });

  const { loadAdminUsers, changeUserRole, setUserActiveStatus, deleteUserAccount } =
    createAdminUserFeature({
    token,
    call,
    setStatus,
    setAdminUsers,
    });

  const { handleCreateCategory, handleCategoryClick } = createCategoryFeature({
    token,
    newCategoryForm,
    setUploadForm,
    setNewCategoryForm,
    setStatus,
    setSelectedCategory,
    setCategoryDocs,
    call,
    loadCategories,
  });

  const { moderateDocument, lockUnlockDelete, loadDuplicateCandidates } = createModerationFeature({
    token,
    setStatus,
    setDuplicateByDocId,
    call,
    loadDocuments,
    loadPendingDocuments,
    loadMyDocuments,
  });

  const { loadPendingPointEvents, reviewPointEvent } = createPointEventFeature({
    token,
    call,
    setStatus,
    setPendingPointEvents,
  });

  const { loadAllPointData } = createPointsFeature({
    token,
    call,
    user,
    setPointSummary,
    setPointTransactions,
    setMyPointEvents,
    setPointPolicy,
    setUser,
  });

  const { submitDocumentReport, loadReportedDocuments, resolveReportedDocument } =
    createReportFeature({
      token,
      user,
      call,
      setStatus,
      setReportedDocs,
      loadDocuments,
      loadMyDocuments,
      loadPendingDocuments,
    });

  const { markRead } = createNotificationFeature({
    token,
    call,
    loadNotifications,
  });

  const {
    fetchDocumentEngagement,
    updateDocumentReaction,
    updateDocumentSavedState,
  } = createEngagementFeature({
    token,
    call,
    setStatus,
    setDocEngagementById,
  });

  const {
    loadCommentsByDocument,
    createComment,
    createReply,
    loadPendingCommentsForModeration,
    reviewPendingComment,
    hideCommentForModeration,
  } = createCommentFeature({
    token,
    call,
    setStatus,
    setPreviewComments,
    setPendingComments,
  });

  const {
    handleLogin,
    handleRequestOtp,
    handleResendOtp,
    handleVerifyOtp,
    handleForgotPassword,
    handleResendForgotOtp,
    handleResetPasswordWithOtp,
  } = createAuthFeature({
    call,
    loginForm,
    registerForm,
    resendCooldown,
    isRegisterOtpSending,
    forgotEmail,
    otpEmail,
    otpCode,
    forgotOtp,
    forgotNewPassword,
    forgotConfirmPassword,
    isStrongPassword,
    setSession,
    setActiveTab,
    setStatus,
    setAuthMode,
    setOtpEmail,
    setOtpPreview,
    setResendCooldown,
    setIsRegisterOtpSending,
    setRegisterForm,
    setOtpCode,
    setForgotEmail,
    setForgotOtpPreview,
    setForgotOtp,
    setForgotNewPassword,
    setForgotConfirmPassword,
    loadMyDocuments,
    loadNotifications,
    loadPendingDocuments,
  });

  useEffect(() => {
    const onPopState = () => {
      const params = getUrlSearchParams();
      const nextDocId = params.get("docId");
      const nextSessionId = params.get("sessionId");
      let nextTab = params.get("tab") || (nextDocId ? "reader" : "home");
      if (nextTab === "reader" && !nextDocId) {
        nextTab = "home";
      }
      const nextAuthMode = params.get("auth") || "guest";

      setActiveTabState(nextTab);
      setAuthModeState(nextAuthMode);

      if (nextTab !== "reader") {
        setPreviewDoc(null);
        setPreviewComments([]);
      }

      if (nextTab !== "qa" || !nextSessionId) {
        setActiveQaSession(null);
        setQaMessages([]);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (activeTab !== "reader" || previewDoc) return;
    const params = getUrlSearchParams();
    const readerDocId = Number(params.get("docId"));
    if (!Number.isInteger(readerDocId) || readerDocId <= 0) {
      setActiveTab("home", { replace: true });
    }
  }, [activeTab, previewDoc]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== "categories") return;
    if (hasModeratorRole(user?.role)) return;
    setActiveTab("home", { replace: true });
  }, [activeTab, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== "users") return;
    if (String(user?.role || "").toLowerCase() === "admin") return;
    setActiveTab("home", { replace: true });
  }, [activeTab, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== "documents") return;
    if (hasModeratorRole(user?.role)) return;
    setActiveTab("home", { replace: true });
  }, [activeTab, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!window.history || !("scrollRestoration" in window.history)) return undefined;

    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    const numericUserId = Number(user?.userId || 0);
    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
      setRecentlyOpenedDocIds([]);
      return;
    }

    try {
      const raw = localStorage.getItem(getRecentReadStorageKey(numericUserId));
      const parsed = raw ? JSON.parse(raw) : [];
      const ids = Array.isArray(parsed)
        ? parsed.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
        : [];
      setRecentlyOpenedDocIds(ids.slice(0, 20));
    } catch {
      setRecentlyOpenedDocIds([]);
    }
  }, [user?.userId]);

  useEffect(() => {
    call(async () => {
      const tasks = [loadCategories(), loadHomeDocuments()];
      if (token) {
        tasks.push(refreshCurrentUser());
        tasks.push(loadMyDocuments());
        tasks.push(loadNotifications());
        tasks.push(loadAllPointData());
        tasks.push(loadQaSessions());
        if (user?.role === "admin") {
          tasks.push(loadAdminUsers());
        }
        if (hasModeratorRole(user?.role)) {
          tasks.push(loadAllUploadedDocuments(token));
          tasks.push(loadPendingDocuments(token));
          tasks.push(loadReportedDocuments(token));
          tasks.push(loadPendingPointEvents());
          tasks.push(loadPendingCommentsForModeration());
          tasks.push(loadModerationOverview());
        }
      }

      const results = await Promise.allSettled(tasks);
      const rejected = results.find((r) => r.status === "rejected");
      if (rejected?.status === "rejected") throw rejected.reason;
    });
  }, [token, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== "moderation" || !token || !isModerator) return;
    call(async () => {
      await Promise.all([
        loadPendingDocuments(token),
        loadReportedDocuments(token),
        loadPendingPointEvents(),
        loadPendingCommentsForModeration(),
        loadModerationOverview(),
      ]);
    });
  }, [activeTab, token, isModerator]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== "users" || !token || user?.role !== "admin") return;
    call(async () => {
      await Promise.all([loadAdminUsers(), loadAllUploadedDocuments(token), loadModerationOverview()]);
    });
  }, [activeTab, token, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== "documents" || !token || !hasModeratorRole(user?.role)) return;
    call(async () => {
      await Promise.all([loadAllUploadedDocuments(token), loadModerationOverview(), loadPendingDocuments(token)]);
    });
  }, [activeTab, token, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== "points" || !token) return;
    loadAllPointData();
  }, [activeTab, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== "qa" || !token) return;
    void loadQaSessions();
  }, [activeTab, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!queryDocId || !token) return;
    const targetId = Number(queryDocId);
    if (!Number.isFinite(targetId)) return;
    if (Number(previewDoc?.documentId) === targetId) return;

    const pool = [...docs, ...myDocs, ...pendingDocs, ...reportedDocs, ...categoryDocs];
    const doc = pool.find((item) => Number(item?.documentId) === targetId);
    if (!doc) return;

    openPreview(normalizeDocumentForViewer(doc));
  }, [queryDocId, token, docs, myDocs, pendingDocs, reportedDocs, categoryDocs, previewDoc?.documentId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== "qa" || !querySessionId || !token) return;
    const targetId = Number(querySessionId);
    if (!Number.isFinite(targetId)) return;
    if (Number(activeQaSession?.sessionId) === targetId) return;
    void openQaSession(targetId, { replace: true });
  }, [activeTab, querySessionId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return undefined;

    const streamUrl = `${API_ORIGIN}/api/notifications/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.event !== "notification_created" || !payload?.data) return;

        setNotifications((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some((item) => Number(item.notificationId) === Number(payload.data.notificationId))) {
            return list;
          }
          return [payload.data, ...list];
        });
      } catch {
        // ignore malformed stream payload
      }
    };

    eventSource.onerror = () => {
      // Browser will auto-reconnect for EventSource.
    };

    return () => {
      eventSource.close();
    };
  }, [token]);

  useEffect(() => {
    const targetDocId = Number(previewDoc?.documentId);
    if (!token || !Number.isInteger(targetDocId) || targetDocId <= 0) return;

    call(async () => {
      await fetchDocumentEngagement(targetDocId);
    });
  }, [previewDoc?.documentId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const targetDocId = Number(previewDoc?.documentId);
    if (!Number.isInteger(targetDocId) || targetDocId <= 0) {
      setPreviewComments([]);
      return;
    }

    call(async () => {
      await loadCommentsByDocument(targetDocId);
    });
  }, [previewDoc?.documentId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!["verify-otp", "forgot-verify"].includes(authMode) || resendCooldown <= 0) return;
    const timerId = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timerId);
  }, [authMode, resendCooldown]);

  useEffect(() => {
    const onMouseDown = (e) => {
      if (!topicPickerRef.current) return;
      if (!topicPickerRef.current.contains(e.target)) {
        setShowCourseDropdown(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [setShowCourseDropdown]);

  useEffect(() => {
    // Keep navigation clean: stale errors from a previous tab should not bleed into new tab.
    setError("");
  }, [activeTab]);

  useEffect(() => {
    if (!status) return;
    const normalizedStatus = String(status).trim().toLowerCase();
    const isLoginSuccess = normalizedStatus === "login successful.";
    const isGenericSuccess =
      normalizedStatus.includes("successful") ||
      normalizedStatus.includes("submitted") ||
      normalizedStatus.includes("closed") ||
      normalizedStatus.includes("started");
    if (!isLoginSuccess && !isGenericSuccess) return;

    const timerId = setTimeout(() => {
      setStatus("");
    }, isLoginSuccess ? 2000 : 3000);

    return () => clearTimeout(timerId);
  }, [status]);

  useEffect(() => {
    let isCancelled = false;

    const syncMyDocumentUpvotes = async () => {
      if (!token) {
        upvoteSyncSignatureRef.current = "";
        setTotalMyDocUpvotes(0);
        return;
      }

      const docIds = [...new Set(myDocs.map((doc) => Number(doc?.documentId || 0)).values())].filter(
        (id) => Number.isInteger(id) && id > 0,
      );
      const likeNotificationSignature = (Array.isArray(notifications) ? notifications : [])
        .filter((item) => String(item?.type || "").toLowerCase().includes("like"))
        .slice(0, 20)
        .map((item) => Number(item?.notificationId || 0))
        .filter((id) => Number.isInteger(id) && id > 0)
        .join(",");
      const signature = `${docIds.join(",")}|${likeNotificationSignature}`;
      if (signature === upvoteSyncSignatureRef.current) {
        return;
      }
      upvoteSyncSignatureRef.current = signature;

      if (docIds.length === 0) {
        if (!isCancelled) {
          setTotalMyDocUpvotes(0);
        }
        return;
      }

      const results = await Promise.allSettled(
        docIds.map(async (documentId) => {
          const payload = await apiRequest(`/documents/${documentId}/engagement`, { token });
          return {
            documentId,
            likeCount: Number(payload?.data?.likeCount || 0),
            dislikeCount: Number(payload?.data?.dislikeCount || 0),
            currentReaction: payload?.data?.currentReaction ?? null,
            isSaved: Boolean(payload?.data?.isSaved),
          };
        }),
      );

      if (isCancelled) return;

      let sum = 0;
      const engagementPatch = {};
      results.forEach((result) => {
        if (result.status !== "fulfilled") return;
        const item = result.value;
        sum += Number(item.likeCount || 0);
        engagementPatch[item.documentId] = {
          likeCount: item.likeCount,
          dislikeCount: item.dislikeCount,
          currentReaction: item.currentReaction,
          isSaved: item.isSaved,
        };
      });

      setDocEngagementById((prev) => ({
        ...prev,
        ...engagementPatch,
      }));
      setTotalMyDocUpvotes(sum);
    };

    void syncMyDocumentUpvotes();

    return () => {
      isCancelled = true;
    };
  }, [token, myDocs, notifications]);

  const pendingStatuses = new Set([
    "pending",
    "pending_review",
    "under_review",
    "in_review",
    "awaiting_moderation",
  ]);
  const pendingUploadsCount = token
    ? myDocs.filter((doc) => {
        const statusValue = String(
          doc?.status || doc?.approvalStatus || doc?.moderationStatus || "",
        )
          .trim()
          .toLowerCase();
        return pendingStatuses.has(statusValue);
      }).length
    : 0;

  const stats = {
    uploads: token ? myDocs.length : 0,
    pending: pendingUploadsCount,
    upvotes: token ? totalMyDocUpvotes : 0,
    points: Number(user?.points || 0),
  };

  const isGuestDashboard = !token && authMode === "guest";
  const dashboardUser = isGuestDashboard
    ? { userId: 0, name: "Guest", role: "user", points: 0 }
    : user;
  const visibleTabsForDashboard =
    dashboardUser?.role ? roleTabs[dashboardUser.role] || roleTabs.user : roleTabs.user;

  const findDocById = (documentId) => {
    const pool = [...docs, ...myDocs, ...pendingDocs, ...reportedDocs, ...categoryDocs];
    return pool.find((item) => Number(item?.documentId) === Number(documentId));
  };

  const getDocReactionCounts = (documentId) => {
    const doc = findDocById(documentId) || {};
    const engagement = docEngagementById[documentId];
    const likeCount = Number(engagement?.likeCount ?? doc.likeCount ?? 0);
    const dislikeCount = Number(engagement?.dislikeCount ?? doc.dislikeCount ?? 0);
    const currentReaction = engagement?.currentReaction ?? null;

    return {
      likeCount,
      dislikeCount,
      liked: currentReaction === "like",
      disliked: currentReaction === "dislike",
      saved: Boolean(engagement?.isSaved),
    };
  };

  const toggleLike = async (documentId) => {
    const currentReaction = docEngagementById[documentId]?.currentReaction ?? null;
    const nextReaction = currentReaction === "like" ? null : "like";
    await updateDocumentReaction(documentId, nextReaction);
  };

  const toggleDislike = async (documentId) => {
    const currentReaction = docEngagementById[documentId]?.currentReaction ?? null;
    const nextReaction = currentReaction === "dislike" ? null : "dislike";
    await updateDocumentReaction(documentId, nextReaction);
  };

  const toggleSave = async (documentId) => {
    const isSaved = Boolean(docEngagementById[documentId]?.isSaved);
    await updateDocumentSavedState(documentId, !isSaved);
  };

  const reviewCommentPointFromPreview = async (comment, points, note = "") => {
    const role = String(user?.role || "").toLowerCase();
    if (!["admin", "moderator"].includes(role)) {
      setStatus("");
      setError("Only moderator/admin can review comment points.");
      return;
    }

    const commentId = Number(comment?.commentId || 0);
    if (!Number.isInteger(commentId) || commentId <= 0) return;

    const parsedPoints = Number(points);
    if (!Number.isInteger(parsedPoints) || parsedPoints < 10 || parsedPoints > 15) {
      setStatus("");
      setError("Điểm đánh giá comment phải là số nguyên trong khoảng 10-15.");
      return;
    }

    const relatedEvents = (Array.isArray(pendingPointEvents) ? pendingPointEvents : []).filter(
      (event) =>
        Number(event?.commentId || 0) === commentId &&
        String(event?.status || "").toLowerCase() === "pending",
    );

    if (!relatedEvents.length) {
      setStatus("");
      setError("Bình luận này chưa có point event pending để duyệt.");
      return;
    }

    const preferredEvent =
      relatedEvents.find((event) => String(event?.eventType || "").toLowerCase() === "comment_given") ||
      relatedEvents[0];

    const normalizedNote = String(note || "").trim();
    await reviewPointEvent(preferredEvent.eventId, {
      decision: "approved",
      pointDelta: parsedPoints,
      note: normalizedNote || `Moderator scored comment #${commentId} with ${parsedPoints} points.`,
    });
  };

  const reviewCommentPointFromPreviewV2 = async (comment, points, note = "") => {
    const role = String(user?.role || "").toLowerCase();
    if (!["admin", "moderator"].includes(role)) {
      setStatus("");
      setError("Only moderator/admin can review comment points.");
      return;
    }

    const commentId = Number(comment?.commentId || 0);
    if (!Number.isInteger(commentId) || commentId <= 0) return;

    const parsedPoints = Number(points);
    if (!Number.isInteger(parsedPoints) || parsedPoints < 10 || parsedPoints > 15) {
      setStatus("");
      setError("Điểm đánh giá comment phải là số nguyên trong khoảng 10-15.");
      return;
    }

    const relatedPendingEvents = (Array.isArray(pendingPointEvents) ? pendingPointEvents : []).filter(
      (event) =>
        Number(event?.commentId || 0) === commentId &&
        String(event?.status || "").toLowerCase() === "pending",
    );

    const preferredPendingEvent =
      relatedPendingEvents.find(
        (event) => String(event?.eventType || "").toLowerCase() === "comment_given",
      ) || relatedPendingEvents[0];

    const fallbackExistingEventId = Number(comment?.pointEventId || 0);
    const targetEventId =
      Number(preferredPendingEvent?.eventId || 0) > 0
        ? Number(preferredPendingEvent.eventId)
        : fallbackExistingEventId > 0
          ? fallbackExistingEventId
          : 0;

    if (!targetEventId) {
      setStatus("");
      setError(
        "Bình luận này chưa có point event để duyệt/chỉnh. Hãy duyệt comment trước để tạo point event.",
      );
      return;
    }

    const normalizedNote = String(note || "").trim();
    await reviewPointEvent(targetEventId, {
      decision: "approved",
      pointDelta: parsedPoints,
      note: normalizedNote || `Moderator scored comment #${commentId} with ${parsedPoints} points.`,
    });

    const previewDocumentId = Number(previewDoc?.documentId || comment?.documentId || 0);
    if (previewDocumentId > 0) {
      await loadCommentsByDocument(previewDocumentId);
    }
  };

  const reviewCommentPointFromPreviewV3 = async (comment, points, note = "") => {
    const role = String(user?.role || "").toLowerCase();
    if (!["admin", "moderator"].includes(role)) {
      setStatus("");
      setError("Only moderator/admin can review comment points.");
      return;
    }

    const commentId = Number(comment?.commentId || 0);
    if (!Number.isInteger(commentId) || commentId <= 0) return;

    const parsedPoints = Number(points);
    if (!Number.isInteger(parsedPoints) || parsedPoints < 10 || parsedPoints > 15) {
      setStatus("");
      setError("Điểm đánh giá comment phải là số nguyên trong khoảng 10-15.");
      return;
    }

    const relatedPendingEvents = (Array.isArray(pendingPointEvents) ? pendingPointEvents : []).filter(
      (event) =>
        Number(event?.commentId || 0) === commentId &&
        String(event?.status || "").toLowerCase() === "pending",
    );

    const preferredPendingEvent =
      relatedPendingEvents.find(
        (event) => String(event?.eventType || "").toLowerCase() === "comment_given",
      ) || relatedPendingEvents[0];

    let targetEventId = Number(preferredPendingEvent?.eventId || 0);
    if (!targetEventId) {
      const existingEventId = Number(comment?.pointEventId || 0);
      if (existingEventId > 0) {
        targetEventId = existingEventId;
      }
    }

    if (!targetEventId) {
      const ensuredPayload = await apiRequest(`/comments/${commentId}/point-events/ensure`, {
        method: "POST",
        token,
      });
      await loadPendingPointEvents();

      const ensuredPrimaryId = Number(ensuredPayload?.data?.commenterPointEvent?.eventId || 0);
      const ensuredIds = Array.isArray(ensuredPayload?.data?.pointEventIds)
        ? ensuredPayload.data.pointEventIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
        : [];

      targetEventId =
        ensuredPrimaryId > 0
          ? ensuredPrimaryId
          : ensuredIds.find((id) => Number.isInteger(id) && id > 0) || 0;
    }

    if (!targetEventId) {
      setStatus("");
      setError("Không thể tạo point event cho bình luận này. Vui lòng thử lại.");
      return;
    }

    const normalizedNote = String(note || "").trim();
    await reviewPointEvent(targetEventId, {
      decision: "approved",
      pointDelta: parsedPoints,
      note: normalizedNote || `Moderator scored comment #${commentId} with ${parsedPoints} points.`,
    });

    const previewDocumentId = Number(previewDoc?.documentId || comment?.documentId || 0);
    if (previewDocumentId > 0) {
      await loadCommentsByDocument(previewDocumentId);
    }
  };

  const hideCommentFromPreview = async (comment) => {
    const role = String(user?.role || "").toLowerCase();
    if (!["admin", "moderator"].includes(role)) {
      setStatus("");
      setError("Only moderator/admin can hide comments.");
      return;
    }

    const commentId = Number(comment?.commentId || 0);
    const documentId = Number(comment?.documentId || previewDoc?.documentId || 0);
    if (!Number.isInteger(commentId) || commentId <= 0) return;

    await hideCommentForModeration(commentId, Number.isInteger(documentId) && documentId > 0 ? documentId : null);
  };

  const downloadPreviewDocument = async (documentId, previewDocState) => {
    const numericId = Number(documentId || 0);
    if (!token || !Number.isInteger(numericId) || numericId <= 0) return;

    await call(async () => {
      const downloadCost = Number(previewDocState?.downloadCost || 0);
      if (downloadCost > 0) {
        const accepted = window.confirm(
          `Tải tài liệu này sẽ tốn ${downloadCost} điểm. Bạn có muốn tiếp tục không?`,
        );
        if (!accepted) return;
      }

      const payload = await apiRequest(`/documents/${numericId}/download`, {
        method: "POST",
        token,
      });
      const nextFileUrl = resolveFileUrl(payload?.data?.fileUrl || "");
      if (nextFileUrl) {
        window.open(nextFileUrl, "_blank", "noopener,noreferrer");
      }
      await refreshCurrentUser();
    }, { actionKey: `doc:download:${numericId}` });
  };

  const downloadPreviewDocumentWithPolicyCheck = async (documentId, previewDocState) => {
    const numericId = Number(documentId || 0);
    if (!token || !Number.isInteger(numericId) || numericId <= 0) return;

    await call(async () => {
      const accessPayload = await apiRequest(`/documents/${numericId}/access`, { token });
      const accessInfo = accessPayload?.data || {};
      const downloadCost = Number(
        accessInfo?.downloadCost ?? accessInfo?.policy?.downloadCost ?? previewDocState?.downloadCost ?? 0,
      );

      if (downloadCost > 0) {
        const accepted = window.confirm(
          `Tai tai lieu nay se ton ${downloadCost} diem. Ban co muon tiep tuc khong?`,
        );
        if (!accepted) return;
      }

      const payload = await apiRequest(`/documents/${numericId}/download`, {
        method: "POST",
        token,
      });

      const suggestedFileName = String(payload?.data?.suggestedFileName || "").trim();
      const downloadFileName =
        suggestedFileName || `${String(previewDocState?.title || "document").trim() || "document"}.pdf`;

      // Download through protected backend viewer endpoint to avoid Cloudinary 401/public-link issues.
      const viewerContentUrl = `${API_BASE_URL}/documents/${numericId}/viewer/content`;
      const viewerResponse = await fetch(viewerContentUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!viewerResponse.ok) {
        const errorText = await viewerResponse.text().catch(() => "");
        throw new Error(errorText || `Download failed with status ${viewerResponse.status}.`);
      }

      const fileBlob = await viewerResponse.blob();
      const objectUrl = URL.createObjectURL(fileBlob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = downloadFileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);

      const returnedFileFormat = String(payload?.data?.fileFormat || "").toLowerCase();
      if (returnedFileFormat && returnedFileFormat !== "pdf") {
        setStatus("Tai lieu dang duoc tra ve dinh dang goc. Vui long kiem tra pipeline convert PDF tren backend.");
      }

      await refreshCurrentUser();
    }, { actionKey: `doc:download-protected:${numericId}` });
  };

  const parseNotificationMetadata = (rawMetadata) => {
    if (!rawMetadata) return null;
    if (typeof rawMetadata === "object") return rawMetadata;
    if (typeof rawMetadata !== "string") return null;
    try {
      return JSON.parse(rawMetadata);
    } catch {
      return null;
    }
  };

  const openFromNotification = async (notification) => {
    if (!notification) return;

    await call(async () => {
      if (!notification.isRead) {
        await markRead(notification.notificationId);
      }

      const type = String(notification.type || "").toLowerCase();

      const metadata = parseNotificationMetadata(notification.metadata);
      const documentId = Number(metadata?.documentId || metadata?.document?.documentId || 0);
      const sessionId = Number(metadata?.sessionId || metadata?.qaSessionId || 0);
      const commentId = Number(
        metadata?.commentId || metadata?.replyCommentId || metadata?.target?.id || 0,
      );
      const pointEventId = Number(metadata?.pointEventId || metadata?.eventId || 0);
      const isModerationUser = hasModeratorRole(user?.role);
      const isCommentFlow =
        type.includes("comment") ||
        String(metadata?.action || "").toLowerCase().includes("comment");
      const isQaRatingFlow =
        type.includes("qa_rating") ||
        type.includes("qa_session_rated") ||
        type.includes("qa_rating_pending_review") ||
        String(metadata?.action || "").toLowerCase().includes("qa.rating");
      const isModerationFlow =
        type.includes("moderation") ||
        type.includes("report") ||
        type.includes("plagiarism") ||
        type.includes("point") ||
        isCommentFlow ||
        isQaRatingFlow;

      if (isModerationUser && isModerationFlow) {
        setModerationFocus({
          documentId: Number.isInteger(documentId) && documentId > 0 ? documentId : null,
          commentId: Number.isInteger(commentId) && commentId > 0 ? commentId : null,
          qaSessionId: Number.isInteger(sessionId) && sessionId > 0 ? sessionId : null,
          pointEventId: Number.isInteger(pointEventId) && pointEventId > 0 ? pointEventId : null,
        });
        setActiveTab("moderation");
        await Promise.allSettled([
          loadPendingDocuments(token),
          loadReportedDocuments(token),
          loadPendingPointEvents(),
          loadPendingCommentsForModeration(),
        ]);
        return;
      }

      if (type.includes("point") || type.includes("document_approved")) {
        setActiveTab("points");
        await loadAllPointData();
        return;
      }

      if (Number.isInteger(sessionId) && sessionId > 0) {
        await loadQaSessions();
        await openQaSession(sessionId);
        return;
      }

      if (Number.isInteger(documentId) && documentId > 0) {
        try {
          const payload = await apiRequest(`/documents/${documentId}`, { token });
          const doc = payload?.data || null;
          if (doc) {
            openPreview(doc);
            return;
          }
        } catch {
          // Fallback to tab-based navigation below if detail fetch fails.
        }
      }

      if (type.includes("point") || type.includes("approved") || type.includes("qa_rating")) {
        setActiveTab("points");
      } else if (type.includes("report") || type.includes("moderation")) {
        setActiveTab("moderation");
      } else if (type.includes("comment") || type.includes("document")) {
        setActiveTab("library");
      } else {
        setActiveTab("notifications");
      }
    }, { actionKey: `notification:open:${notification.notificationId}` });
  };

  const topicSuggestions = categories.filter((c) => {
    const name = c.name || "";
    if (!courseInput.trim()) return true;
    return name.toLowerCase().includes(courseInput.toLowerCase().trim());
  });

  const visibleTopicSuggestions = courseInput.trim()
    ? topicSuggestions.slice(0, 12)
    : topicSuggestions.slice(0, 5);

  const qaUnreadSessionMap = getUnreadQaSessionMap();
  const qaUnreadCount = getUnreadQaNotifications().length;

  const authShellProps = {
    authMode,
    setAuthMode,
    loginForm,
    setLoginForm,
    registerForm,
    setRegisterForm,
    forgotEmail,
    setForgotEmail,
    forgotOtp,
    setForgotOtp,
    forgotNewPassword,
    setForgotNewPassword,
    forgotConfirmPassword,
    setForgotConfirmPassword,
    otpEmail,
    otpCode,
    setOtpCode,
    otpPreview,
    forgotOtpPreview,
    resendCooldown,
    isRegisterOtpSending,
    showLoginPassword,
    setShowLoginPassword,
    showRegisterPassword,
    setShowRegisterPassword,
    showRegisterConfirmPassword,
    setShowRegisterConfirmPassword,
    showForgotNewPassword,
    setShowForgotNewPassword,
    showForgotConfirmPassword,
    setShowForgotConfirmPassword,
    hasForgotPasswordInput,
    forgotPasswordInvalid,
    forgotPasswordStrength,
    hasRegisterPasswordInput,
    registerPasswordInvalid,
    registerPasswordStrength,
    handleLogin,
    handleForgotPassword,
    handleResetPasswordWithOtp,
    handleResendForgotOtp,
    handleRequestOtp,
    handleVerifyOtp,
    handleResendOtp,
    error,
    status,
    clearFeedback,
  };

  const dashboardShellProps = {
    user: dashboardUser,
    stats,
    visibleTabs: visibleTabsForDashboard,
    activeTab,
    setActiveTab,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    tabLabel,
    clearSession,
    docFilter,
    setDocFilter,
    call,
    loadDocuments,
    status,
    error,
    isBusy: pendingActionCount > 0,
    docs,
    homeDocs,
    recentlyOpenedDocIds,
    submitDocumentReport,
    openPreview,
    openPreviewReload,
    resolveFileUrl,
    myDocs,
    pointSummary,
    pointTransactions,
    myPointEvents,
    pointPolicy,
    loadAllPointData,
    uploadForm,
    setUploadForm,
    topicPickerRef,
    courseInput,
    setCourseInput,
    showCourseDropdown,
    setShowCourseDropdown,
    tagInput,
    setTagInput,
    onCourseInputKeyDown,
    onTagInputKeyDown,
    selectCourse,
    addTag,
    selectedTags,
    removeTag,
    visibleTopicSuggestions,
    qaUnreadCount,
    qaUnreadSessionMap,
    qaRatedSessionMap,
    handleUpload,
    isUploadSubmitting,
    isModerator,
    pendingDocs,
    reportedDocs,
    pendingPointEvents,
    pendingComments,
    moderationStats,
    moderationTimeline,
    moderationFocus,
    loadModerationOverview,
    resolveReportedDocument,
    reviewPointEvent,
    reviewPendingComment,
    hideCommentForModeration,
    loadDuplicateCandidates,
    moderateDocument,
    lockUnlockDelete,
    duplicateByDocId,
    notifications,
    adminUsers,
    adminDocuments,
    loadAdminUsers,
    changeUserRole,
    setUserActiveStatus,
    deleteUserAccount,
    loadAllUploadedDocuments,
    markRead,
    openFromNotification,
    handleCreateCategory,
    newCategoryForm,
    setNewCategoryForm,
    categories,
    selectedCategory,
    handleCategoryClick,
    categoryDocs,
    qaSessions,
    activeQaSession,
    qaMessages,
    qaFilter,
    setQaFilter,
    loadQaSessions,
    openQaSession,
    sendQaMessage,
    closeQaSession,
    rateQaSession,
    previewDoc,
    setPreviewDoc,
    closePreview: () => {
      if (activeTab === "reader") {
        setActiveTab("home");
        return;
      }
      setPreviewDoc(null);
      setPreviewComments([]);
    },
    previewComments,
    createCommentForPreview: async (documentId, content) => {
      if (!token) {
        setStatus("");
        setError(requireAuthMessage);
        return;
      }
      await createComment(documentId, content);
    },
    createReplyForPreview: async (parentCommentId, content, documentId) => {
      if (!token) {
        setStatus("");
        setError(requireAuthMessage);
        return;
      }
      await createReply(parentCommentId, content, documentId);
    },
    onReviewCommentPointFromPreview: reviewCommentPointFromPreviewV3,
    onHideCommentFromPreview: hideCommentFromPreview,
    getDocReactionCounts,
    toggleLike,
    toggleDislike,
    toggleSave,
    onDownloadFromPreview: downloadPreviewDocumentWithPolicyCheck,
    onReportFromPreview: async (documentId, reason) => {
      if (!token) {
        setStatus("");
        setError(requireAuthMessage);
        return;
      }
      if (!Number.isInteger(Number(documentId)) || Number(documentId) <= 0) return;
      await submitDocumentReport(Number(documentId), reason);
    },
    onStartQaFromPreview: async (documentId, initialMessage) => {
      if (!token) {
        setStatus("");
        setError(requireAuthMessage);
        return;
      }
      await createQaSession(documentId, initialMessage);
    },
    isGuestMode: isGuestDashboard,
    onNavigateToLogin: () => setAuthMode("login"),
    onNavigateToRegister: () => setAuthMode("register"),
    onGuestBlockedAction: () => {
      setStatus("");
      setError(requireAuthMessage);
    },
  };

  if (!token && !isGuestDashboard) {
    return <AuthShell {...authShellProps} />;
  }

  return <DashboardShell {...dashboardShellProps} />;
}

export default AppController;
