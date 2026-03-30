import { useEffect, useRef, useState } from "react";
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
import { createDataFeature } from "./services/data.service";
import { createModerationFeature } from "./services/moderation.service";
import { createNotificationFeature } from "./services/notification.service";
import { createUploadFeature } from "./services/upload.service";
import { getPasswordStrength, isStrongPassword } from "./models/password.model";
import { createOpenPreview, resolveFileUrl } from "./models/preview.model";

function AppController() {
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
  const [myDocs, setMyDocs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [duplicateByDocId, setDuplicateByDocId] = useState({});
  const [previewDoc, setPreviewDoc] = useState(null);
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

  const setSession = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem("token", nextToken);
    localStorage.setItem("user", JSON.stringify(nextUser));
  };

  const clearSession = () => {
    setToken("");
    setUser(null);
    setActiveTab("home");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const clearFeedback = () => {
    setError("");
    setStatus("");
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

  const { markRead } = createNotificationFeature({
    token,
    call,
    loadNotifications,
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
        tasks.push(loadMyDocuments());
        tasks.push(loadNotifications());
        if (hasModeratorRole(user?.role)) tasks.push(loadPendingDocuments(token));
      }

      const results = await Promise.allSettled(tasks);
      const rejected = results.find((r) => r.status === "rejected");
      if (rejected?.status === "rejected") throw rejected.reason;
    });
  }, [token, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== "moderation" || !token || !isModerator) return;
    call(async () => {
      await loadPendingDocuments(token);
    });
  }, [activeTab, token, isModerator]); // eslint-disable-line react-hooks/exhaustive-deps

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
    upvotes: 0,
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
    openPreview,
    resolveFileUrl,
    myDocs,
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
    loadDuplicateCandidates,
    moderateDocument,
    lockUnlockDelete,
    duplicateByDocId,
    notifications,
    markRead,
    handleCreateCategory,
    newCategoryForm,
    setNewCategoryForm,
    categories,
    selectedCategory,
    handleCategoryClick,
    categoryDocs,
    previewDoc,
    setPreviewDoc,
  };

  return !token ? <AuthShell {...authShellProps} /> : <DashboardShell {...dashboardShellProps} />;
}

export default AppController;
