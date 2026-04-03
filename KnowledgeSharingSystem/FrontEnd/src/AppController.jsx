import { useEffect, useRef, useState } from "react";
import { API_ORIGIN, apiRequest } from "./api";
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
  const queryDocId = (() => {
    try {
      return new URLSearchParams(window.location.search).get("docId");
    } catch {
      return null;
    }
  })();

  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  const [activeTab, setActiveTab] = useState("home");

  const [loginForm, setLoginForm] = useState(initialLogin);
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotOtpPreview, setForgotOtpPreview] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpPreview, setOtpPreview] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [categories, setCategories] = useState([]);
  const [docs, setDocs] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [reportedDocs, setReportedDocs] = useState([]);
  const [pendingPointEvents, setPendingPointEvents] = useState([]);
  const [myDocs, setMyDocs] = useState([]);
  const [pointSummary, setPointSummary] = useState(null);
  const [pointTransactions, setPointTransactions] = useState([]);
  const [myPointEvents, setMyPointEvents] = useState([]);
  const [pointPolicy, setPointPolicy] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [duplicateByDocId, setDuplicateByDocId] = useState({});
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewComments, setPreviewComments] = useState([]);
  const [docEngagementById, setDocEngagementById] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryDocs, setCategoryDocs] = useState([]);

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
  const [topicInput, setTopicInput] = useState("");
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const topicPickerRef = useRef(null);

  const isModerator = hasModeratorRole(user?.role);
  const visibleTabs = user?.role ? roleTabs[user.role] || roleTabs.user : [];

  const registerPasswordStrength = getPasswordStrength(registerForm.password);
  const forgotPasswordStrength = getPasswordStrength(forgotNewPassword);
  const hasRegisterPasswordInput = registerForm.password.length > 0;
  const hasForgotPasswordInput = forgotNewPassword.length > 0;
  const registerPasswordInvalid = hasRegisterPasswordInput && !isStrongPassword(registerForm.password);
  const forgotPasswordInvalid = hasForgotPasswordInput && !isStrongPassword(forgotNewPassword);

  const resetWorkspaceState = () => {
    setActiveTab("home");
    setPreviewDoc(null);
    setSelectedCategory(null);
    setCategoryDocs([]);
    setPendingDocs([]);
    setReportedDocs([]);
    setPendingPointEvents([]);
    setPointSummary(null);
    setPointTransactions([]);
    setMyPointEvents([]);
    setPointPolicy(null);
    setDuplicateByDocId({});
    setNotifications([]);
    setAdminUsers([]);
    setDocEngagementById({});
    setPreviewComments([]);
    setStatus("");
    setError("");
  };

  const setSession = (nextToken, nextUser) => {
    resetWorkspaceState();
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem("token", nextToken);
    localStorage.setItem("user", JSON.stringify(nextUser));
  };

  const clearSession = () => {
    resetWorkspaceState();
    setToken("");
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    try {
      const current = new URL(window.location.href);
      if (current.searchParams.has("docId")) {
        current.searchParams.delete("docId");
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

  const call = async (fn) => {
    clearFeedback();
    try {
      await fn();
    } catch (e) {
      const message = e?.message || "Unknown error";
      if (message.toLowerCase().includes("jwt expired")) {
        clearSession();
        setAuthMode("login");
        setError("Session expired. Please login again.");
        return;
      }
      setError(message);
    }
  };

  const { loadCategories, loadDocuments, loadMyDocuments, loadPendingDocuments, loadNotifications } =
    createDataFeature({
      token,
      isModerator,
      docFilter,
      setCategories,
      setDocs,
      setMyDocs,
      setPendingDocs,
      setNotifications,
    });

  const openPreview = createOpenPreview(setPreviewDoc);
  const openPreviewReload = (doc) => {
    if (!doc?.documentId) {
      openPreview(doc);
      return;
    }
    const current = new URL(window.location.href);
    current.searchParams.set("docId", String(doc.documentId));
    window.location.href = current.toString();
  };

  const { addTopic, removeTopic, onTopicInputKeyDown, handleUpload } = createUploadFeature({
    token,
    categories,
    uploadForm,
    topicInput,
    selectedTopics,
    setCategories,
    setUploadForm,
    setSelectedTopics,
    setTopicInput,
    setShowTopicDropdown,
    setStatus,
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

  const { loadCommentsByDocument, createComment, createReply } = createCommentFeature({
    token,
    call,
    setStatus,
    setPreviewComments,
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
    call(async () => {
      const tasks = [loadCategories(), loadDocuments()];
      if (token) {
        tasks.push(refreshCurrentUser());
        tasks.push(loadMyDocuments());
        tasks.push(loadNotifications());
        tasks.push(loadAllPointData());
        if (user?.role === "admin") {
          tasks.push(loadAdminUsers());
        }
        if (hasModeratorRole(user?.role)) {
          tasks.push(loadPendingDocuments(token));
          tasks.push(loadReportedDocuments(token));
          tasks.push(loadPendingPointEvents());
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
      ]);
    });
  }, [activeTab, token, isModerator]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== "users" || !token || user?.role !== "admin") return;
    call(async () => {
      await loadAdminUsers();
    });
  }, [activeTab, token, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== "points" || !token) return;
    loadAllPointData();
  }, [activeTab, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!queryDocId || !token) return;
    const targetId = Number(queryDocId);
    if (!Number.isFinite(targetId)) return;

    const pool = [...docs, ...myDocs, ...pendingDocs, ...reportedDocs, ...categoryDocs];
    const doc = pool.find((item) => Number(item?.documentId) === targetId);
    if (!doc) return;

    openPreview(doc);
    setActiveTab("reader");
  }, [queryDocId, token, docs, myDocs, pendingDocs, reportedDocs, categoryDocs]); // eslint-disable-line react-hooks/exhaustive-deps

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
        setShowTopicDropdown(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const stats = {
    followers: 0,
    uploads: myDocs.length,
    points: Number(user?.points || 0),
  };

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

      if (
        type.includes("point") ||
        type.includes("document_approved") ||
        type.includes("qa_session_rated") ||
        type.includes("qa_rating")
      ) {
        setActiveTab("points");
        await loadAllPointData();
        return;
      }

      const metadata = parseNotificationMetadata(notification.metadata);
      const documentId = Number(metadata?.documentId || metadata?.document?.documentId || 0);

      if (Number.isInteger(documentId) && documentId > 0) {
        try {
          const payload = await apiRequest(`/documents/${documentId}`, { token });
          const doc = payload?.data || null;
          if (doc) {
            openPreview(doc);
            setActiveTab("reader");
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
    });
  };

  const topicSuggestions = categories.filter((c) => {
    const name = c.name || "";
    if (!topicInput.trim()) return true;
    return name.toLowerCase().includes(topicInput.toLowerCase().trim());
  });

  const visibleTopicSuggestions = topicInput.trim()
    ? topicSuggestions.slice(0, 12)
    : topicSuggestions.slice(0, 5);

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
    user,
    stats,
    visibleTabs,
    activeTab,
    setActiveTab,
    tabLabel,
    clearSession,
    docFilter,
    setDocFilter,
    call,
    loadDocuments,
    status,
    error,
    docs,
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
    topicInput,
    setTopicInput,
    showTopicDropdown,
    setShowTopicDropdown,
    onTopicInputKeyDown,
    addTopic,
    selectedTopics,
    removeTopic,
    visibleTopicSuggestions,
    handleUpload,
    isModerator,
    pendingDocs,
    reportedDocs,
    pendingPointEvents,
    resolveReportedDocument,
    reviewPointEvent,
    loadDuplicateCandidates,
    moderateDocument,
    lockUnlockDelete,
    duplicateByDocId,
    notifications,
    adminUsers,
    changeUserRole,
    setUserActiveStatus,
    deleteUserAccount,
    markRead,
    openFromNotification,
    handleCreateCategory,
    newCategoryForm,
    setNewCategoryForm,
    categories,
    selectedCategory,
    handleCategoryClick,
    categoryDocs,
    previewDoc,
    setPreviewDoc,
    closePreview: () => {
      if (activeTab === "reader") {
        const current = new URL(window.location.href);
        current.searchParams.delete("docId");
        window.location.href = current.toString();
        return;
      }
      setPreviewDoc(null);
      setPreviewComments([]);
    },
    previewComments,
    createCommentForPreview: async (documentId, content) => {
      await createComment(documentId, content);
    },
    createReplyForPreview: async (parentCommentId, content, documentId) => {
      await createReply(parentCommentId, content, documentId);
    },
    getDocReactionCounts,
    toggleLike,
    toggleDislike,
    toggleSave,
    onReportFromPreview: async (documentId, reason) => {
      if (!Number.isInteger(Number(documentId)) || Number(documentId) <= 0) return;
      await submitDocumentReport(Number(documentId), reason);
    },
  };

  return !token ? <AuthShell {...authShellProps} /> : <DashboardShell {...dashboardShellProps} />;
}

export default AppController;
