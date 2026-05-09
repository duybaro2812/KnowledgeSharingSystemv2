import { useEffect, useRef, useState } from "react";
import { isStrongPassword } from "../../models/password.model";

const splitName = (value) => {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] || "", lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
};

const getInitials = (value) => {
  const words = String(value || "U").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "U";
};

const copy = {
  vi: {
    saved: "Đã lưu thành công.",
    save: "Lưu thay đổi",
    settings: "Cài đặt",
    subtitle: "Quản lý hồ sơ và tùy chỉnh tài khoản của bạn",
    user: "Người dùng",
    points: "điểm",
    stats: "Thống kê",
    documents: "Tài liệu",
    upvotes: "Upvotes",
    profile: "Hồ sơ cá nhân",
    account: "Tài khoản",
    study: "Học vấn",
    security: "Bảo mật",
    notifications: "Thông báo",
    profileTitle: "Thông tin cá nhân",
    profileDesc: "Tên hiển thị và thông tin công khai của bạn",
    firstName: "Họ",
    lastName: "Tên",
    bioHelp: "Mô tả ngắn về bản thân, xuất hiện trên trang hồ sơ công khai",
    bioPlaceholder: "Mô tả ngắn về bản thân, chuyên môn hoặc mục tiêu học tập.",
    emailTitle: "Địa chỉ email",
    emailDesc: "Quản lý email đăng nhập và email phụ",
    primaryEmail: "Email chính",
    primaryEmailHelp: "Email dùng để đăng nhập, không thể thay đổi tùy tiện",
    additionalEmail: "Email bổ sung (tùy chọn)",
    additionalEmailHelp: "Dùng để khôi phục tài khoản",
    sendRecoveryOtp: "Gửi OTP xác nhận",
    verifyRecoveryOtp: "Xác nhận OTP",
    recoveryOtp: "Mã OTP email khôi phục",
    recoveryOtpHelp: "Nhập mã OTP đã gửi tới email bổ sung để lưu email này.",
    recoveryOtpSent: "Đã gửi OTP xác nhận email khôi phục.",
    recoveryEmailVerified: "Email khôi phục đã được xác nhận.",
    languageTitle: "Ngôn ngữ & Khu vực",
    languageDesc: "Cài đặt ngôn ngữ hiển thị",
    language: "Ngôn ngữ",
    region: "Khu vực",
    vietnamese: "Tiếng Việt",
    english: "English",
    studyTitle: "Thông tin học vấn",
    studyDesc: "Trường đại học, khoa và chuyên ngành của bạn",
    school: "Trường đại học",
    schoolHelp: "Tên trường đang theo học",
    faculty: "Khoa / Chuyên ngành",
    startYear: "Năm bắt đầu",
    accessTitle: "Cấp độ điểm truy cập",
    accessDesc: "Điểm hiện tại của bạn quyết định quyền truy cập tài liệu",
    limited: "Xem bị giới hạn",
    limitedDesc: "Không xem được toàn bộ nội dung",
    readerDesc: "Mở khóa nhiều tài liệu học tập hơn",
    contributorDesc: "Có quyền truy cập và đóng góp nâng cao",
    securityTitle: "Đổi mật khẩu",
    securityDesc: "Sau khi đổi, dùng mật khẩu mới để đăng nhập lần sau",
    currentPassword: "Mật khẩu hiện tại",
    newPassword: "Mật khẩu mới",
    confirmPassword: "Xác nhận mật khẩu mới",
    passwordMismatch: "Xác nhận mật khẩu không khớp.",
    notificationTitle: "Tùy chỉnh thông báo",
    notificationDesc: "Chọn loại thông báo bạn muốn nhận",
    commentNew: "Bình luận mới",
    commentNewDesc: "Khi có người bình luận trên tài liệu của bạn",
    documentApproved: "Tài liệu được duyệt",
    documentApprovedDesc: "Khi tài liệu của bạn được moderator phê duyệt",
    qaMessages: "Tin nhắn Q&A",
    qaMessagesDesc: "Khi có tin nhắn mới trong phiên Q&A",
    pointReward: "Điểm thưởng",
    pointRewardDesc: "Khi bạn nhận được điểm từ hoạt động trong hệ thống",
  },
  en: {
    saved: "Saved successfully.",
    save: "Save changes",
    settings: "Settings",
    subtitle: "Manage your profile and account preferences",
    user: "User",
    points: "points",
    stats: "Statistics",
    documents: "Documents",
    upvotes: "Upvotes",
    profile: "Personal profile",
    account: "Account",
    study: "Study",
    security: "Security",
    notifications: "Notifications",
    profileTitle: "Personal information",
    profileDesc: "Display name and public information",
    firstName: "First name",
    lastName: "Last name",
    bioHelp: "Short description shown on your public profile",
    bioPlaceholder: "Briefly describe yourself, expertise, or study goals.",
    emailTitle: "Email address",
    emailDesc: "Manage login email and backup email",
    primaryEmail: "Primary email",
    primaryEmailHelp: "Used for sign-in and cannot be changed freely",
    additionalEmail: "Additional email (optional)",
    additionalEmailHelp: "Used for account recovery",
    sendRecoveryOtp: "Send verification OTP",
    verifyRecoveryOtp: "Verify OTP",
    recoveryOtp: "Recovery email OTP",
    recoveryOtpHelp: "Enter the OTP sent to this additional email to save it.",
    recoveryOtpSent: "Recovery email OTP sent.",
    recoveryEmailVerified: "Recovery email verified.",
    languageTitle: "Language & Region",
    languageDesc: "Choose the display language",
    language: "Language",
    region: "Region",
    vietnamese: "Tiếng Việt",
    english: "English",
    studyTitle: "Education information",
    studyDesc: "Your university, faculty, and major",
    school: "University",
    schoolHelp: "Current university name",
    faculty: "Faculty / Major",
    startYear: "Start year",
    accessTitle: "Access point level",
    accessDesc: "Your current points decide document access",
    limited: "Limited access",
    limitedDesc: "Cannot view all content",
    readerDesc: "Unlock more learning documents",
    contributorDesc: "Advanced access and contribution rights",
    securityTitle: "Change password",
    securityDesc: "Use the new password the next time you sign in",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    passwordMismatch: "Password confirmation does not match.",
    notificationTitle: "Notification preferences",
    notificationDesc: "Choose which notifications you want to receive",
    commentNew: "New comments",
    commentNewDesc: "When someone comments on your document",
    documentApproved: "Document approved",
    documentApprovedDesc: "When your document is approved by a moderator",
    qaMessages: "Q&A messages",
    qaMessagesDesc: "When there is a new message in a Q&A session",
    pointReward: "Point rewards",
    pointRewardDesc: "When you receive points from system activity",
  },
};

function SettingsIcon({ type }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    profile: <><circle cx="12" cy="8" r="3.2" {...common} /><path d="M5 20c.8-3.7 3.1-5.6 7-5.6s6.2 1.9 7 5.6" {...common} /></>,
    account: <><path d="M4.5 7.5 12 13l7.5-5.5" {...common} /><rect x="4" y="6" width="16" height="12" rx="2.5" {...common} /></>,
    study: <><path d="m3.5 8.8 8.5-4 8.5 4-8.5 4z" {...common} /><path d="M7 11v4.1c1.3 1.4 3 2.1 5 2.1s3.7-.7 5-2.1V11" {...common} /></>,
    security: <><rect x="5.5" y="10" width="13" height="9" rx="2" {...common} /><path d="M8.5 10V7.6a3.5 3.5 0 0 1 7 0V10" {...common} /></>,
    notifications: <><path d="M7.2 10.5a4.8 4.8 0 0 1 9.6 0c0 4 1.7 4.7 1.7 4.7h-13s1.7-.7 1.7-4.7Z" {...common} /><path d="M10.3 18a1.9 1.9 0 0 0 3.4 0" {...common} /></>,
    save: <><path d="M6 4.8h10l2 2v12.4H6z" {...common} /><path d="M8.5 4.8v5h6v-5M8.8 19.2v-5h6.4v5" {...common} /></>,
    trophy: <><path d="M8 5h8v3.5c0 3-1.5 5-4 5s-4-2-4-5z" {...common} /><path d="M8 7H5.5c0 2.5 1.2 4 3.2 4.3M16 7h2.5c0 2.5-1.2 4-3.2 4.3M12 13.5V18M9 18h6" {...common} /></>,
    document: <><path d="M7 4.5h6l4 4V19.5H7z" {...common} /><path d="M13 4.5V9h4M9.5 12h5M9.5 15h5" {...common} /></>,
    upvote: <><path d="M8.5 19h-3V10h3z" {...common} /><path d="M8.5 10 12 4.5c.8.3 1.2.9 1.2 1.8v2.2H17a2 2 0 0 1 2 2.4l-1.1 5.8A2 2 0 0 1 16 18.5H8.5" {...common} /></>,
    globe: <><circle cx="12" cy="12" r="7.5" {...common} /><path d="M4.8 12h14.4M12 4.5c2 2.1 3 4.6 3 7.5s-1 5.4-3 7.5c-2-2.1-3-4.6-3-7.5s1-5.4 3-7.5Z" {...common} /></>,
    comment: <path d="M6.5 6.5h11v8h-6L8 17.5v-3H6.5z" {...common} />,
    check: <><circle cx="12" cy="12" r="7" {...common} /><path d="m8.8 12 2.1 2.1 4.3-4.5" {...common} /></>,
    camera: <><path d="M8.8 7.2 10 5h4l1.2 2.2H18a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9.2a2 2 0 0 1 2-2z" {...common} /><circle cx="12" cy="13" r="3.1" {...common} /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[type] || paths.profile}</svg>;
}

function SettingsInput({ icon, children, className = "", ...inputProps }) {
  return (
    <div className={`settings-input-wrap ${className}`}>
      {icon ? <span className="settings-input-icon"><SettingsIcon type={icon} /></span> : null}
      {children || <input {...inputProps} />}
    </div>
  );
}

function SettingsSaveButton({ disabled, label }) {
  return (
    <button type="submit" className="settings-save-btn" disabled={disabled}>
      <SettingsIcon type="save" />
      <span>{label}</span>
    </button>
  );
}

function SettingsTabView({ model, controller }) {
  const user = model.user || {};
  const stats = model.stats || {};
  const initialName = splitName(user?.name);
  const language = user?.language === "en" ? "en" : "vi";
  const t = copy[language];
  const currentYear = new Date().getFullYear();
  const studyYears = Array.from({ length: 12 }, (_, index) => String(currentYear - index));
  const [activeSection, setActiveSection] = useState("profile");
  const [savedMessage, setSavedMessage] = useState("");
  const avatarInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [accountDraft, setAccountDraft] = useState({
    firstName: initialName.firstName,
    lastName: initialName.lastName,
    bio: user?.bio || "",
    language,
    region: user?.region || "Vietnam",
    additionalEmail: user?.additionalEmail || "",
  });
  const [studyDraft, setStudyDraft] = useState({
    school: user?.school || "",
    major: user?.major || "",
    startedYear: user?.startedYear || "2023",
  });
  const [passwordDraft, setPasswordDraft] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [additionalEmailOtp, setAdditionalEmailOtp] = useState("");
  const [pendingAdditionalEmail, setPendingAdditionalEmail] = useState("");
  const [additionalEmailOtpPreview, setAdditionalEmailOtpPreview] = useState("");
  const [notificationDraft, setNotificationDraft] = useState({
    comments: user?.notifyComments !== false,
    documentApproved: user?.notifyDocumentApproved !== false,
    qaMessages: user?.notifyQaMessages !== false,
    points: user?.notifyPoints !== false,
  });

  useEffect(() => {
    const nextName = splitName(user?.name);
    setAccountDraft({
      firstName: nextName.firstName,
      lastName: nextName.lastName,
      bio: user?.bio || "",
      language: user?.language === "en" ? "en" : "vi",
      region: user?.region || "Vietnam",
      additionalEmail: user?.additionalEmail || "",
    });
    setStudyDraft({
      school: user?.school || "",
      major: user?.major || "",
      startedYear: user?.startedYear || "2023",
    });
    setNotificationDraft({
      comments: user?.notifyComments !== false,
      documentApproved: user?.notifyDocumentApproved !== false,
      qaMessages: user?.notifyQaMessages !== false,
      points: user?.notifyPoints !== false,
    });
  }, [user?.name, user?.bio, user?.school, user?.major, user?.language, user?.region, user?.additionalEmail, user?.notifyComments, user?.notifyDocumentApproved, user?.notifyQaMessages, user?.notifyPoints, user?.startedYear]);

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  const flashSaved = () => {
    setSavedMessage(t.saved);
    window.setTimeout(() => setSavedMessage(""), 2200);
  };

  const flashAvatarSaved = () => {
    setSavedMessage(t.avatarSaved || "Avatar updated successfully.");
    window.setTimeout(() => setSavedMessage(""), 2200);
  };

  const openAvatarPicker = () => {
    if (!model.isBusy) avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || model.isBusy) return;

    const nextPreview = URL.createObjectURL(file);
    setAvatarPreview((currentPreview) => {
      if (currentPreview) URL.revokeObjectURL(currentPreview);
      return nextPreview;
    });

    const result = await controller.onUpdateAvatar?.(file);
    if (result) {
      flashAvatarSaved();
      setAvatarPreview((currentPreview) => {
        if (currentPreview) URL.revokeObjectURL(currentPreview);
        return "";
      });
    } else {
      setAvatarPreview((currentPreview) => {
        if (currentPreview) URL.revokeObjectURL(currentPreview);
        return "";
      });
    }
  };

  const fullName = `${accountDraft.firstName} ${accountDraft.lastName}`.trim();
  const hasAdditionalEmailChange = accountDraft.additionalEmail.trim().toLowerCase() !== String(user?.additionalEmail || "").toLowerCase();
  const commonPayload = ({ includeAdditionalEmail = false } = {}) => ({
    name: fullName || user?.name || "User",
    bio: accountDraft.bio.trim(),
    school: studyDraft.school.trim(),
    major: studyDraft.major.trim(),
    startedYear: studyDraft.startedYear,
    language: accountDraft.language,
    region: accountDraft.region,
    additionalEmail: includeAdditionalEmail ? accountDraft.additionalEmail.trim() : user?.additionalEmail || "",
    notificationPreferences: notificationDraft,
  });
  const saveProfile = async (event) => {
    event.preventDefault();
    if (model.isBusy || !fullName) return;
    const result = await controller.onUpdateProfile?.(commonPayload());
    if (result !== false) flashSaved();
  };
  const saveAccount = async (event) => {
    event.preventDefault();
    if (hasAdditionalEmailChange) {
      const email = accountDraft.additionalEmail.trim();
      if (!email || model.isBusy) return;
      const result = await controller.onRequestAdditionalEmailOtp?.(email);
      if (result !== false && result) {
        setPendingAdditionalEmail(result.email || email);
        setAdditionalEmailOtpPreview(result.otpPreview || "");
        setAdditionalEmailOtp("");
        setSavedMessage(t.recoveryOtpSent);
        window.setTimeout(() => setSavedMessage(""), 2200);
      }
      return;
    }
    const result = await controller.onUpdateProfile?.(commonPayload());
    if (result !== false) flashSaved();
  };
  const saveStudy = async (event) => {
    event.preventDefault();
    const result = await controller.onUpdateProfile?.(commonPayload());
    if (result !== false) flashSaved();
  };
  const saveNotifications = async (event) => {
    event.preventDefault();
    const result = await controller.onUpdateProfile?.(commonPayload());
    if (result !== false) flashSaved();
  };
  const canChangePassword = passwordDraft.currentPassword && passwordDraft.newPassword && passwordDraft.confirmPassword && passwordDraft.newPassword === passwordDraft.confirmPassword && isStrongPassword(passwordDraft.newPassword);
  const changePassword = async (event) => {
    event.preventDefault();
    if (!canChangePassword || model.isBusy) return;
    const result = await controller.onChangePassword?.({ currentPassword: passwordDraft.currentPassword, newPassword: passwordDraft.newPassword });
    if (result !== false) {
      setPasswordDraft({ currentPassword: "", newPassword: "", confirmPassword: "" });
      flashSaved();
    }
  };
  const verifyAdditionalEmail = async () => {
    const email = pendingAdditionalEmail || accountDraft.additionalEmail.trim();
    if (!email || additionalEmailOtp.trim().length !== 6 || model.isBusy) return;
    const result = await controller.onVerifyAdditionalEmailOtp?.({
      email,
      otp: additionalEmailOtp.trim(),
    });
    if (result !== false && result) {
      setPendingAdditionalEmail("");
      setAdditionalEmailOtp("");
      setAdditionalEmailOtpPreview("");
      setSavedMessage(t.recoveryEmailVerified);
      window.setTimeout(() => setSavedMessage(""), 2200);
    }
  };

  const menuItems = [
    { key: "profile", label: t.profile, icon: "profile" },
    { key: "account", label: t.account, icon: "account" },
    { key: "study", label: t.study, icon: "study" },
    { key: "security", label: t.security, icon: "security" },
    { key: "notifications", label: t.notifications, icon: "notifications" },
  ];
  const notifications = [
    { key: "comments", title: t.commentNew, description: t.commentNewDesc, icon: "comment", tone: "blue" },
    { key: "documentApproved", title: t.documentApproved, description: t.documentApprovedDesc, icon: "check", tone: "green" },
    { key: "qaMessages", title: t.qaMessages, description: t.qaMessagesDesc, icon: "notifications", tone: "purple" },
    { key: "points", title: t.pointReward, description: t.pointRewardDesc, icon: "trophy", tone: "amber" },
  ];
  const accessLevels = [
    { label: t.limited, description: t.limitedDesc, points: `< 30 ${t.points}` },
    { label: "Reader", description: t.readerDesc, points: `30-39 ${t.points}`, active: Number(user?.points || 0) >= 30 && Number(user?.points || 0) < 40 },
    { label: "Contributor", description: t.contributorDesc, points: `40+ ${t.points}`, active: Number(user?.points || 0) >= 40 },
  ];
  const resolvedAvatarUrl = user?.avatarUrl && typeof controller.resolveFileUrl === "function" ? controller.resolveFileUrl(user.avatarUrl) : "";
  const avatarSrc = avatarPreview || resolvedAvatarUrl;
  const avatarLabel = t.avatarUpdate || "Update avatar";
  const renderAvatar = (className) => (
    <div className={className}>
      {avatarSrc ? <img src={avatarSrc} alt={`${user?.name || t.user} avatar`} /> : <span>{getInitials(user?.name)}</span>}
      <button type="button" aria-label={avatarLabel} title={avatarLabel} onClick={openAvatarPicker} disabled={model.isBusy}>
        <SettingsIcon type="camera" />
      </button>
    </div>
  );

  const renderContent = () => {
    if (activeSection === "account") {
      return (
        <div className="settings-content-stack">
          <form className="settings-card settings-detail-card" onSubmit={saveAccount}>
            <div className="settings-card-head"><div><h3>{t.emailTitle}</h3><p>{t.emailDesc}</p></div></div>
            <div className="settings-card-body">
              <label className="settings-field"><span>{t.primaryEmail}</span><SettingsInput icon="account" type="email" value={user?.email || ""} disabled readOnly /><small>{t.primaryEmailHelp}</small></label>
              <label className="settings-field"><span>{t.additionalEmail}</span><SettingsInput icon="account" type="email" placeholder="email@example.edu" value={accountDraft.additionalEmail} onChange={(event) => { setAccountDraft((prev) => ({ ...prev, additionalEmail: event.target.value })); setPendingAdditionalEmail(""); setAdditionalEmailOtp(""); setAdditionalEmailOtpPreview(""); }} disabled={model.isBusy} /><small>{t.additionalEmailHelp}</small></label>
              {(pendingAdditionalEmail || additionalEmailOtpPreview) ? (
                <label className="settings-field">
                  <span>{t.recoveryOtp}</span>
                  <SettingsInput icon="security" type="text" inputMode="numeric" maxLength={6} value={additionalEmailOtp} onChange={(event) => setAdditionalEmailOtp(event.target.value)} disabled={model.isBusy} />
                  <small>{t.recoveryOtpHelp}</small>
                  {additionalEmailOtpPreview ? <small>Dev OTP: {additionalEmailOtpPreview}</small> : null}
                </label>
              ) : null}
              <div className="settings-form-actions"><SettingsSaveButton disabled={model.isBusy} label={t.save} /></div>
              {(pendingAdditionalEmail || additionalEmailOtpPreview) ? (
                <div className="settings-form-actions">
                  <button type="button" className="settings-save-btn" disabled={model.isBusy || additionalEmailOtp.trim().length !== 6} onClick={verifyAdditionalEmail}>
                    <SettingsIcon type="check" />
                    <span>{t.verifyRecoveryOtp}</span>
                  </button>
                </div>
              ) : hasAdditionalEmailChange ? <small>{t.sendRecoveryOtp}</small> : null}
            </div>
          </form>
          <form className="settings-card settings-detail-card" onSubmit={saveAccount}>
            <div className="settings-card-head"><div><h3>{t.languageTitle}</h3><p>{t.languageDesc}</p></div></div>
            <div className="settings-card-body">
              <div className="settings-two-col">
                <label className="settings-field"><span>{t.language}</span><SettingsInput icon="globe"><select value={accountDraft.language} onChange={(event) => setAccountDraft((prev) => ({ ...prev, language: event.target.value }))} disabled={model.isBusy}><option value="vi">{t.vietnamese}</option><option value="en">{t.english}</option></select></SettingsInput></label>
                <label className="settings-field"><span>{t.region}</span><SettingsInput icon="globe"><select value={accountDraft.region} onChange={(event) => setAccountDraft((prev) => ({ ...prev, region: event.target.value }))} disabled={model.isBusy}><option>Vietnam</option><option>United States</option><option>Singapore</option><option>Thailand</option></select></SettingsInput></label>
              </div>
              <div className="settings-form-actions"><SettingsSaveButton disabled={model.isBusy} label={t.save} /></div>
            </div>
          </form>
        </div>
      );
    }
    if (activeSection === "study") {
      return (
        <div className="settings-content-stack">
          <form className="settings-card settings-detail-card" onSubmit={saveStudy}>
            <div className="settings-card-head"><div><h3>{t.studyTitle}</h3><p>{t.studyDesc}</p></div></div>
            <div className="settings-card-body">
              <label className="settings-field"><span>{t.school}</span><SettingsInput icon="study" type="text" value={studyDraft.school} onChange={(event) => setStudyDraft((prev) => ({ ...prev, school: event.target.value }))} disabled={model.isBusy} /><small>{t.schoolHelp}</small></label>
              <label className="settings-field"><span>{t.faculty}</span><SettingsInput icon="document" type="text" value={studyDraft.major} onChange={(event) => setStudyDraft((prev) => ({ ...prev, major: event.target.value }))} disabled={model.isBusy} /></label>
              <label className="settings-field"><span>{t.startYear}</span><SettingsInput icon="document"><select value={studyDraft.startedYear} onChange={(event) => setStudyDraft((prev) => ({ ...prev, startedYear: event.target.value }))} disabled={model.isBusy}>{studyYears.map((year) => <option key={year}>{year}</option>)}</select></SettingsInput></label>
              <div className="settings-form-actions"><SettingsSaveButton disabled={model.isBusy} label={t.save} /></div>
            </div>
          </form>
          <section className="settings-card settings-detail-card"><div className="settings-card-head"><div><h3>{t.accessTitle}</h3><p>{t.accessDesc}</p></div></div><div className="settings-card-body settings-access-list">{accessLevels.map((level) => <div key={level.label} className={`settings-access-item ${level.active ? "active" : ""}`}><div><b>{level.label}</b><span>{level.description}</span></div><strong>{level.points}</strong></div>)}</div></section>
        </div>
      );
    }
    if (activeSection === "security") {
      return (
        <form className="settings-card settings-detail-card" onSubmit={changePassword}>
          <div className="settings-card-head"><div><h3>{t.securityTitle}</h3><p>{t.securityDesc}</p></div></div>
          <div className="settings-card-body">
            <label className="settings-field"><span>{t.currentPassword}</span><SettingsInput icon="security" type="password" value={passwordDraft.currentPassword} onChange={(event) => setPasswordDraft((prev) => ({ ...prev, currentPassword: event.target.value }))} disabled={model.isBusy} autoComplete="current-password" /></label>
            <label className="settings-field"><span>{t.newPassword}</span><SettingsInput icon="security" type="password" value={passwordDraft.newPassword} onChange={(event) => setPasswordDraft((prev) => ({ ...prev, newPassword: event.target.value }))} disabled={model.isBusy} autoComplete="new-password" /></label>
            <label className="settings-field"><span>{t.confirmPassword}</span><SettingsInput icon="security" type="password" value={passwordDraft.confirmPassword} onChange={(event) => setPasswordDraft((prev) => ({ ...prev, confirmPassword: event.target.value }))} disabled={model.isBusy} autoComplete="new-password" /></label>
            {passwordDraft.confirmPassword && passwordDraft.newPassword !== passwordDraft.confirmPassword ? <p className="profile-inline-error">{t.passwordMismatch}</p> : null}
            <div className="settings-form-actions"><SettingsSaveButton disabled={model.isBusy || !canChangePassword} label={t.save} /></div>
          </div>
        </form>
      );
    }
    if (activeSection === "notifications") {
      return (
        <form className="settings-card settings-detail-card" onSubmit={saveNotifications}>
          <div className="settings-card-head"><div><h3>{t.notificationTitle}</h3><p>{t.notificationDesc}</p></div></div>
          <div className="settings-card-body settings-notification-list">
            {notifications.map((item) => <label key={item.key} className="settings-notification-item"><span className={`settings-notification-icon tone-${item.tone}`}><SettingsIcon type={item.icon} /></span><span className="settings-notification-copy"><b>{item.title}</b><small>{item.description}</small></span><input type="checkbox" checked={Boolean(notificationDraft[item.key])} onChange={(event) => setNotificationDraft((prev) => ({ ...prev, [item.key]: event.target.checked }))} /><span className="settings-switch" aria-hidden="true" /></label>)}
            <div className="settings-form-actions"><SettingsSaveButton disabled={model.isBusy} label={t.save} /></div>
          </div>
        </form>
      );
    }
    return (
      <div className="settings-content-stack">
        <section className="settings-profile-cover"><div className="settings-cover-pattern" /><div className="settings-cover-user">{renderAvatar("settings-cover-avatar")}<div><h3>{user?.name || t.user}</h3><p>{user?.email || "-"}</p><span className="settings-role-badge">{user?.role || "user"}</span></div></div></section>
        <form className="settings-card settings-detail-card" onSubmit={saveProfile}>
          <div className="settings-card-head"><div><h3>{t.profileTitle}</h3><p>{t.profileDesc}</p></div></div>
          <div className="settings-card-body">
            <div className="settings-two-col"><label className="settings-field"><span>{t.firstName}</span><SettingsInput icon="profile" type="text" value={accountDraft.firstName} onChange={(event) => setAccountDraft((prev) => ({ ...prev, firstName: event.target.value }))} disabled={model.isBusy} /></label><label className="settings-field"><span>{t.lastName}</span><SettingsInput type="text" value={accountDraft.lastName} onChange={(event) => setAccountDraft((prev) => ({ ...prev, lastName: event.target.value }))} disabled={model.isBusy} /></label></div>
            <label className="settings-field"><span>Bio ({accountDraft.bio.length}/200)</span><textarea value={accountDraft.bio} maxLength={200} rows={4} onChange={(event) => setAccountDraft((prev) => ({ ...prev, bio: event.target.value }))} disabled={model.isBusy} placeholder={t.bioPlaceholder} /><small>{t.bioHelp}</small></label>
            <div className="settings-form-actions"><SettingsSaveButton disabled={model.isBusy || !fullName} label={t.save} /></div>
          </div>
        </form>
      </div>
    );
  };

  return (
    <section className="settings-page">
      <input ref={avatarInputRef} className="settings-avatar-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatarChange} />
      <header className="settings-hero-head">
        <div className="settings-head-icon"><SettingsIcon type="profile" /></div>
        <div><h2>{t.settings}</h2><p>{t.subtitle}</p></div>
      </header>
      {savedMessage ? <div className="settings-saved-toast">{savedMessage}</div> : null}
      <div className="settings-shell">
        <aside className="settings-side">
          <section className="settings-mini-profile">
            {renderAvatar("settings-mini-avatar")}
            <h3>{user?.name || t.user}</h3><p>{user?.email || "-"}</p><span className="settings-points"><SettingsIcon type="trophy" />{Number(user?.points || 0)} {t.points}</span>
          </section>
          <section className="settings-stat-card">
            <h4>{t.stats}</h4>
            <div className="settings-stat-row"><span><SettingsIcon type="document" /></span><p>{t.documents}</p><b>{Number(stats.uploads || 0)}</b></div>
            <div className="settings-stat-row"><span><SettingsIcon type="upvote" /></span><p>{t.upvotes}</p><b>{Number(stats.upvotes || 0)}</b></div>
          </section>
          <nav className="settings-nav" aria-label="Settings sections">
            {menuItems.map((item) => <button key={item.key} type="button" className={activeSection === item.key ? "active" : ""} onClick={() => setActiveSection(item.key)}><SettingsIcon type={item.icon} /><span>{item.label}</span><i aria-hidden="true">›</i></button>)}
          </nav>
        </aside>
        <main className="settings-main"><div key={activeSection} className="settings-tab-animate">{renderContent()}</div></main>
      </div>
    </section>
  );
}

export default SettingsTabView;
