export const getUserLanguage = (user) => (user?.language === "en" ? "en" : "vi");

export const uiText = {
  vi: {
    appTitle: "Không gian chia sẻ tri thức",
    appSubtitle: "API đã sẵn sàng: backend cục bộ đã kết nối.",
    adminTitle: "Không gian quản trị",
    adminSubtitle: "Quản lý báo cáo, hàng chờ kiểm duyệt và các thao tác nền tảng.",
    moderatorTitle: "Không gian kiểm duyệt",
    moderatorSubtitle: "Xem báo cáo, khóa/mở tài liệu và xử lý quy trình kiểm duyệt.",
    searchPlaceholder: "Tìm khóa học, câu hỏi hoặc tài liệu",
    search: "Tìm kiếm",
    searching: "Đang tìm...",
    login: "Đăng nhập",
    register: "Đăng ký",
    notifications: "Thông báo",
    notificationsSubtitle: "Theo dõi duyệt tài liệu, bình luận, Q&A, kiểm duyệt và điểm.",
    viewAll: "Xem tất cả",
    all: "Tất cả",
    unread: "Chưa đọc",
    unreadCount: "chưa đọc",
    marking: "Đang đánh dấu...",
    noNotifications: "Không có thông báo.",
    noNotificationsInFilter: "Không có thông báo trong bộ lọc này",
    noNotificationsHint: "Hãy đổi bộ lọc hoặc quay lại khi có hoạt động mới.",
    markRead: "Đánh dấu đã đọc",
    markAllRead: "Đánh dấu tất cả đã đọc",
    profile: "Hồ sơ",
    points: "Điểm",
    uploads: "Tài liệu",
    qaSessions: "Phiên Q&A",
    moderation: "Kiểm duyệt",
    courses: "Khóa học",
    users: "Người dùng",
    settings: "Cài đặt",
    signOut: "Đăng xuất",
    userMenu: "Menu người dùng",
    openProfile: "Mở hồ sơ",
    goHome: "Về trang chủ",
    home: "Trang chủ",
    myDocuments: "Tài liệu của tôi",
    myLibrary: "Thư viện của tôi",
    newUpload: "Tải lên mới",
    upload: "Tải lên",
    pending: "Chờ duyệt",
    upvote: "Upvote",
    pointsPolicy: "Chính sách điểm",
    adminQueue: "Hàng chờ quản trị",
    moderationQueue: "Hàng chờ kiểm duyệt",
    sidebarNote: "Thông báo và hồ sơ nằm trong menu góc phải.",
    welcomeBack: "Chào mừng trở lại",
    heroTitle: "Hôm nay bạn muốn học gì?",
    heroSubtitle: "Truy cập tài liệu học tập đáng tin cậy, tiếp tục nội dung đang đọc và khám phá tài liệu hữu ích từ cộng đồng đại học.",
    homeSearchPlaceholder: "Tìm tài liệu, khóa học, chủ đề...",
    continueReading: "Tiếp tục đọc",
    continueReadingSubtitle: "Tiếp tục từ nơi bạn đã dừng lại",
    viewLibrary: "Xem thư viện",
    trendingDocuments: "Tài liệu thịnh hành",
    trendingSubtitle: "Những tài liệu đang được quan tâm nhiều nhất",
    viewAllTrending: "Xem tất cả thịnh hành",
    topCourses: "Khóa học nổi bật",
    topCoursesSubtitle: "Các lĩnh vực khóa học phổ biến có tài liệu và thảo luận sôi nổi",
    documents: "tài liệu",
    knowledgePack: "Gói kiến thức",
    openDocument: "Mở tài liệu",
    workspacePoints: "Điểm học tập",
    publishedUploads: "Tài liệu đã xuất bản",
    unreadSignals: "Hoạt động chưa đọc",
    communityUpvotes: "Upvote cộng đồng",
    startFirstUpload: "Bắt đầu bằng tài liệu đầu tiên.",
    profileLinkedDocs: "Tài liệu đã liên kết với hồ sơ của bạn.",
    noUnreadActivity: "Hiện không có hoạt động chưa đọc.",
    myDocumentsTitle: "Tài liệu của tôi",
    uploadedDocuments: "tài liệu đã tải lên",
    recentlyOpened: "mở gần đây",
    uploadNew: "Tải lên mới",
    totalUploads: "Tổng tài liệu",
    totalViews: "Tổng lượt xem",
    totalDownloads: "Tổng lượt tải",
    totalLikes: "Tổng lượt thích",
    uploaded: "Đã tải lên",
    recently: "Gần đây",
    uploadedDocsTitle: "Tài liệu đã tải lên",
    recentDocsTitle: "Tài liệu mở gần đây",
    uploadedDocsHint: "Tài liệu do bạn tải lên và đang thuộc quyền sở hữu của bạn.",
    recentDocsHint: "Tài liệu bạn đã mở gần đây.",
    general: "Chung",
    recentlyUpdated: "Cập nhật gần đây",
    unknown: "không rõ",
    untitledDocument: "Tài liệu chưa đặt tên",
    noDescription: "Chưa có mô tả.",
    owner: "Chủ sở hữu",
    views: "Lượt xem",
    downloads: "Lượt tải",
    likes: "Lượt thích",
    open: "Mở",
    file: "Tệp",
    noUploadedDocuments: "Chưa có tài liệu đã tải lên",
    noRecentlyOpenedDocuments: "Chưa có tài liệu mở gần đây",
    uploadFirstDocument: "Tải tài liệu đầu tiên để bắt đầu.",
    openAnyDocumentHint: "Mở tài liệu bất kỳ và tài liệu đó sẽ xuất hiện tại đây.",
    uploadDocument: "Tải tài liệu",
    commentsModerationPointsQa: "Bình luận, kiểm duyệt, điểm và hoạt động Q&A.",
    recognitionFromMaterials: "Sự ghi nhận từ tài liệu học tập bạn chia sẻ.",
    uploadMaterial: "Tải tài liệu học tập",
    uploadMaterialDesc: "Chia sẻ ghi chú bài giảng, bài tập đã giải hoặc bộ ôn tập để tăng điểm.",
    openMyLibrary: "Mở thư viện của tôi",
    openMyLibraryDesc: "Theo dõi tài liệu đã tải lên và trạng thái duyệt, từ chối hoặc bị ẩn.",
    openLibrary: "Mở thư viện",
    trackPoints: "Theo dõi điểm",
    trackPointsDesc: "Xem ngưỡng mở khóa, khả năng tải xuống và điểm được duyệt.",
    viewPoints: "Xem điểm",
    checkNotifications: "Kiểm tra thông báo",
    checkNotificationsDesc: "Theo dõi bình luận, kiểm duyệt, đạo văn, chat và phần thưởng.",
    openInbox: "Mở hộp thông báo",
    userWorkspace: "Không gian người dùng",
    userWorkspaceDesc: "Duyệt tài liệu học tập đáng tin cậy, lưu thư viện cá nhân, thảo luận và mở khóa quyền truy cập thông qua đóng góp.",
    activeLearningFlow: "Luồng học tập đang hoạt động",
    moderatorWorkspace: "Không gian kiểm duyệt",
    moderatorWorkspaceDesc: "Duyệt tài liệu chờ duyệt, hàng chờ kiểm duyệt, báo cáo, kiểm tra trùng lặp và cảnh báo đạo văn với thao tác rõ ràng.",
    operationalReviewFlow: "Luồng rà soát vận hành",
    adminWorkspace: "Không gian quản trị",
    adminWorkspaceDesc: "Quản lý người dùng, quyền vai trò, cấu trúc khóa học, khóa, xóa và kiểm soát tính toàn vẹn của nền tảng.",
    platformGovernanceFlow: "Luồng quản trị nền tảng",
    adminAccess: "Quyền truy cập quản trị",
    moderationAccess: "Quyền truy cập kiểm duyệt",
    staffAccessDesc: "Bạn có thể bỏ qua giới hạn tài liệu, xem báo cáo và truy cập các luồng vận hành.",
    adminBypassEnabled: "Đã bật quyền quản trị",
    moderatorBypassEnabled: "Đã bật quyền kiểm duyệt",
    contributionUnlockTier: "Mốc mở khóa đóng góp",
    contributionUnlockDesc: "Bạn có thể bình luận, trả lời, thảo luận và hỏi chủ tài liệu, nhưng trình xem vẫn bị khóa cho đến khi đạt 30 điểm.",
    pointsToUnlockViewer: "điểm để mở khóa trình xem",
    viewerUnlocked: "Đã mở khóa trình xem",
    viewerUnlockedDesc: "Bạn có thể đọc đầy đủ tài liệu trong giới hạn, tham gia thảo luận và đặt câu hỏi, nhưng tải xuống vẫn bị khóa dưới 40 điểm.",
    pointsToUnlockDownloads: "điểm để mở khóa tải xuống",
    fullAccessUnlocked: "Đã mở khóa toàn quyền",
    fullAccessDesc: "Bạn có thể xem đầy đủ và tải tài liệu. Việc tải xuống sẽ tiêu điểm, nên số dư đóng góp vẫn quan trọng.",
    downloadsFrom: "Tải xuống từ",
    downloadsCostPoints: "Tải xuống tiêu điểm",
  },
  en: {
    appTitle: "Knowledge Sharing Workspace",
    appSubtitle: "API endpoint ready: local backend is connected.",
    adminTitle: "Admin Workspace",
    adminSubtitle: "Manage reports, moderation queue, and platform-level actions.",
    moderatorTitle: "Moderator Workspace",
    moderatorSubtitle: "Review reports, lock/unlock documents, and handle moderation workflow.",
    searchPlaceholder: "Search for courses, quizzes, or documents",
    search: "Search",
    searching: "Searching...",
    login: "Login",
    register: "Register",
    notifications: "Notifications",
    notificationsSubtitle: "Follow approvals, comments, Q&A, moderation updates, and points.",
    viewAll: "View all",
    all: "All",
    unread: "Unread",
    unreadCount: "unread",
    marking: "Marking...",
    noNotifications: "No notifications.",
    noNotificationsInFilter: "No notifications in this filter",
    noNotificationsHint: "Try switching filter or come back after new activity.",
    markRead: "Mark read",
    markAllRead: "Mark all read",
    profile: "Profile",
    points: "Points",
    uploads: "Uploads",
    qaSessions: "Q&A sessions",
    moderation: "Moderation",
    courses: "Courses",
    users: "Users",
    settings: "Settings",
    signOut: "Sign out",
    userMenu: "User menu",
    openProfile: "Open profile",
    goHome: "Go to Home",
    home: "Home",
    myDocuments: "My documents",
    myLibrary: "My library",
    newUpload: "New upload",
    upload: "Upload",
    pending: "Pending",
    upvote: "Upvote",
    pointsPolicy: "Points Policy",
    adminQueue: "Admin queue",
    moderationQueue: "Moderation queue",
    sidebarNote: "Notifications and profile are available in the top-right menu.",
    welcomeBack: "Welcome back",
    heroTitle: "What will you learn today?",
    heroSubtitle: "Access trusted study materials, continue where you left off, and discover useful documents from your university community.",
    homeSearchPlaceholder: "Search documents, courses, topics...",
    continueReading: "Continue Reading",
    continueReadingSubtitle: "Pick up where you left off",
    viewLibrary: "View library",
    trendingDocuments: "Trending Documents",
    trendingSubtitle: "Materials receiving the most attention right now",
    viewAllTrending: "View all trending",
    topCourses: "Top Courses",
    topCoursesSubtitle: "Popular course areas with active materials and discussion",
    documents: "documents",
    knowledgePack: "Knowledge Pack",
    openDocument: "Open document",
    workspacePoints: "Workspace points",
    publishedUploads: "Published uploads",
    unreadSignals: "Unread signals",
    communityUpvotes: "Community upvotes",
    startFirstUpload: "Start with your first upload.",
    profileLinkedDocs: "Documents already linked to your profile.",
    noUnreadActivity: "No unread activity right now.",
    myDocumentsTitle: "My Documents",
    uploadedDocuments: "uploaded documents",
    recentlyOpened: "recently opened",
    uploadNew: "Upload New",
    totalUploads: "Total Uploads",
    totalViews: "Total Views",
    totalDownloads: "Total Downloads",
    totalLikes: "Total Likes",
    uploaded: "Uploaded",
    recently: "Recently",
    uploadedDocsTitle: "Uploaded documents",
    recentDocsTitle: "Recently opened documents",
    uploadedDocsHint: "Documents uploaded by you and owned by your account.",
    recentDocsHint: "Documents you opened recently.",
    general: "General",
    recentlyUpdated: "Recently updated",
    unknown: "unknown",
    untitledDocument: "Untitled document",
    noDescription: "No description provided.",
    owner: "Owner",
    views: "Views",
    downloads: "Downloads",
    likes: "Likes",
    open: "Open",
    file: "File",
    noUploadedDocuments: "No uploaded documents",
    noRecentlyOpenedDocuments: "No recently opened documents",
    uploadFirstDocument: "Upload your first document to get started.",
    openAnyDocumentHint: "Open any document and it will appear here.",
    uploadDocument: "Upload Document",
    commentsModerationPointsQa: "Comments, moderation, points, and Q&A activity.",
    recognitionFromMaterials: "Recognition earned from shared learning materials.",
    uploadMaterial: "Upload material",
    uploadMaterialDesc: "Share lecture notes, solved exercises, or revision packs to grow your points.",
    openMyLibrary: "Open my library",
    openMyLibraryDesc: "Track uploaded documents and watch approval, rejection, or hidden states.",
    openLibrary: "Open library",
    trackPoints: "Track points",
    trackPointsDesc: "Review unlock thresholds, download readiness, and point approvals.",
    viewPoints: "View points",
    checkNotifications: "Check notifications",
    checkNotificationsDesc: "Monitor comments, moderation, plagiarism, chat, and reward activity.",
    openInbox: "Open inbox",
    userWorkspace: "User workspace",
    userWorkspaceDesc: "Browse trusted study materials, keep a personal library, discuss documents, and unlock access through contribution.",
    activeLearningFlow: "Active learning flow",
    moderatorWorkspace: "Moderator workspace",
    moderatorWorkspaceDesc: "Review pending documents, moderation queues, reports, duplicate checks, and plagiarism alerts with clear actions.",
    operationalReviewFlow: "Operational review flow",
    adminWorkspace: "Admin workspace",
    adminWorkspaceDesc: "Manage users, role permissions, course structures, locks, deletions, and platform integrity controls.",
    platformGovernanceFlow: "Platform governance flow",
    adminAccess: "Administrative access",
    moderationAccess: "Moderation access",
    staffAccessDesc: "You can bypass document gating, review reports, and access operational flows.",
    adminBypassEnabled: "Admin bypass enabled",
    moderatorBypassEnabled: "Moderator bypass enabled",
    contributionUnlockTier: "Contribution unlock tier",
    contributionUnlockDesc: "You can comment, reply, discuss, and ask document owners questions, but the viewer remains blocked until you reach 30 points.",
    pointsToUnlockViewer: "points to unlock viewer",
    viewerUnlocked: "Viewer unlocked",
    viewerUnlockedDesc: "You can read full documents with limits, join discussions, and ask questions, but downloads remain locked below 40 points.",
    pointsToUnlockDownloads: "points to unlock downloads",
    fullAccessUnlocked: "Full access unlocked",
    fullAccessDesc: "You can fully view and download documents. Downloads spend points, so your contribution balance matters.",
    downloadsFrom: "Downloads from",
    downloadsCostPoints: "Downloads cost points",
  },
};

export const tFor = (user) => uiText[getUserLanguage(user)];

export const notificationKindLabel = (rawType, language = "vi") => {
  const type = String(rawType || "").toLowerCase();
  const labels = uiText[language] || uiText.vi;
  if (type.includes("qa") || type.includes("chat")) return "Q&A";
  if (type.includes("point")) return labels.points;
  if (type.includes("plagiarism")) return language === "en" ? "Plagiarism" : "Đạo văn";
  if (type.includes("report") || type.includes("moderation")) return labels.moderation;
  if (type.includes("comment") || type.includes("document")) return labels.myDocuments;
  return language === "en" ? "System" : "Hệ thống";
};

export const notificationKindKey = (rawType) => {
  const type = String(rawType || "").toLowerCase();
  if (type.includes("qa") || type.includes("chat")) return "qa";
  if (type.includes("point")) return "points";
  if (type.includes("plagiarism")) return "plagiarism";
  if (type.includes("report") || type.includes("moderation")) return "moderation";
  if (type.includes("comment") || type.includes("document")) return "document";
  return "system";
};

export const notificationText = (item, language = "vi") => {
  const type = String(item?.type || "").toLowerCase();
  const metadata = item?.metadata || {};
  const points = metadata.points ?? metadata.pointDelta ?? metadata.approvedPoints ?? metadata.adjustmentPoints;
  const documentTitle = metadata.documentTitle || metadata.title || metadata.document?.title;

  if (language === "en") {
    if (type.includes("qa") && type.includes("message")) {
      return { title: "New Q&A message", message: "You received a new message in a Q&A session." };
    }
    if (type.includes("qa") && type.includes("closed")) {
      return { title: "Q&A session closed", message: "A Q&A session has been closed." };
    }
    if (type.includes("qa")) {
      return { title: "New Q&A request", message: documentTitle ? `You have a new question for "${documentTitle}".` : "You have a new Q&A activity." };
    }
    if (type.includes("point")) {
      return {
        title: "Points approved",
        message: typeof points !== "undefined" ? `Your point event was approved with ${points} point(s).` : "Your point event was approved.",
      };
    }
    if (type.includes("document") && type.includes("approved")) {
      return { title: "Document approved", message: documentTitle ? `"${documentTitle}" was approved.` : "Your document was approved." };
    }
    if (type.includes("document") && type.includes("saved")) {
      return { title: "Your document was saved", message: documentTitle ? `You saved "${documentTitle}".` : "Your document was saved." };
    }
    if (type.includes("comment")) {
      return { title: "New comment", message: documentTitle ? `A new comment was added to "${documentTitle}".` : "A new comment was added to your document." };
    }
    if (type.includes("locked")) return { title: "Account locked", message: "Your account has been locked by admin." };
    if (type.includes("unlocked")) return { title: "Account unlocked", message: "Your account has been unlocked by admin." };
    return { title: item?.title || "Notification", message: item?.message || "" };
  }

  if (type.includes("qa") && type.includes("message")) {
    return { title: "Tin nhắn Q&A mới", message: "Bạn nhận được tin nhắn mới trong một phiên Q&A." };
  }
  if (type.includes("qa") && type.includes("closed")) {
    return { title: "Phiên Q&A đã đóng", message: "Một phiên Q&A đã được đóng." };
  }
  if (type.includes("qa")) {
    return { title: "Yêu cầu Q&A mới", message: documentTitle ? `Bạn có câu hỏi mới cho tài liệu "${documentTitle}".` : "Bạn có hoạt động Q&A mới." };
  }
  if (type.includes("point")) {
    return {
      title: "Điểm đã được duyệt",
      message: typeof points !== "undefined" ? `Sự kiện điểm của bạn đã được duyệt với ${points} điểm.` : "Sự kiện điểm của bạn đã được duyệt.",
    };
  }
  if (type.includes("document") && type.includes("approved")) {
    return { title: "Tài liệu đã được duyệt", message: documentTitle ? `Tài liệu "${documentTitle}" đã được duyệt.` : "Tài liệu của bạn đã được duyệt." };
  }
  if (type.includes("document") && type.includes("saved")) {
    return { title: "Tài liệu đã được lưu", message: documentTitle ? `Bạn đã lưu tài liệu "${documentTitle}".` : "Tài liệu của bạn đã được lưu." };
  }
  if (type.includes("comment")) {
    return { title: "Bình luận mới", message: documentTitle ? `Có bình luận mới trong tài liệu "${documentTitle}".` : "Có bình luận mới trong tài liệu của bạn." };
  }
  if (type.includes("locked")) return { title: "Tài khoản bị khóa", message: "Tài khoản của bạn đã bị quản trị viên khóa." };
  if (type.includes("unlocked")) return { title: "Tài khoản đã mở khóa", message: "Tài khoản của bạn đã được quản trị viên mở khóa." };
  return { title: item?.title || "Thông báo", message: item?.message || "" };
};
