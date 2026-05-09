import { tFor } from "../../i18n";

const PREVIEW_THRESHOLD = 30;
const FULL_ACCESS_THRESHOLD = 40;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const formatShortDate = (value, text) => {
  if (!value) return text.recentlyUpdated;

  try {
    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return text.recentlyUpdated;
  }
};

const getCategoryLabel = (doc, text) =>
  doc?.categoryName ||
  doc?.categoryNames ||
  doc?.category ||
  doc?.topic ||
  doc?.subject ||
  text.knowledgePack;

const parseCategoryTokens = (doc) => {
  const rawValues = [
    doc?.categoryName,
    doc?.categoryNames,
    doc?.category,
    doc?.topic,
    doc?.subject,
  ].filter(Boolean);

  const tokens = rawValues
    .flatMap((value) => String(value).split(/[;,|]/))
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set(tokens)];
};

const getEngagementScore = (doc) => Number(doc?.likeCount || 0) * 3 - Number(doc?.dislikeCount || 0);
const toTime = (value) => {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
};
const getWeeklyViewScore = (doc) => {
  const weeklyViews = Number(doc?.weeklyViewCount ?? doc?.weekViewCount ?? doc?.viewsLast7Days ?? NaN);
  if (Number.isFinite(weeklyViews) && weeklyViews >= 0) return weeklyViews;

  const totalViews = Number(doc?.viewCount ?? doc?.views ?? NaN);
  if (Number.isFinite(totalViews) && totalViews >= 0) return totalViews;

  // Fallback when backend does not expose view counters yet.
  return Number(doc?.likeCount || 0) * 2 + Number(doc?.commentCount || 0);
};

const deriveAccessModel = ({ user, userPoints, pointPolicy, text }) => {
  const role = user?.role || "user";

  if (["moderator", "admin"].includes(role)) {
    return {
      tier: "staff",
      title: role === "admin" ? text.adminAccess : text.moderationAccess,
      description: text.staffAccessDesc,
      accentLabel: role === "admin" ? text.adminBypassEnabled : text.moderatorBypassEnabled,
      progressValue: 100,
      badgeTone: "staff",
    };
  }

  if (userPoints < PREVIEW_THRESHOLD) {
    return {
      tier: "locked",
      title: text.contributionUnlockTier,
      description: text.contributionUnlockDesc,
      accentLabel: `${Math.max(0, PREVIEW_THRESHOLD - userPoints)} ${text.pointsToUnlockViewer}`,
      progressValue: Math.max(8, Math.round((userPoints / PREVIEW_THRESHOLD) * 100)),
      badgeTone: "locked",
    };
  }

  if (userPoints < FULL_ACCESS_THRESHOLD) {
    return {
      tier: "limited",
      title: text.viewerUnlocked,
      description: text.viewerUnlockedDesc,
      accentLabel: `${Math.max(0, FULL_ACCESS_THRESHOLD - userPoints)} ${text.pointsToUnlockDownloads}`,
      progressValue: Math.max(55, Math.round((userPoints / FULL_ACCESS_THRESHOLD) * 100)),
      badgeTone: "limited",
    };
  }

  return {
    tier: "full",
    title: text.fullAccessUnlocked,
    description: text.fullAccessDesc,
    accentLabel: pointPolicy?.download?.standardCost
      ? `${text.downloadsFrom} ${pointPolicy.download.standardCost} ${text.points.toLowerCase()}`
      : text.downloadsCostPoints,
    progressValue: 100,
    badgeTone: "full",
  };
};

export function createHomeModel(input) {
  const user = input.user || null;
  const text = tFor(user);
  const role = user?.role || "user";
  const currentUserId = Number(user?.userId || 0);
  const userPoints = Number(user?.points ?? 0);
  const isPrivileged = ["moderator", "admin"].includes(role);
  const notifications = Array.isArray(input.notifications) ? input.notifications : [];
  const myDocs = Array.isArray(input.myDocs) ? input.myDocs : [];
  const rawDocs = Array.isArray(input.homeDocs)
    ? input.homeDocs
    : Array.isArray(input.docs)
      ? input.docs
      : [];
  const pointPolicy = input.pointPolicy || null;
  const access = deriveAccessModel({ user, userPoints, pointPolicy, text });

  const docs = rawDocs.map((doc) => {
    const isOwner = Number(doc?.ownerUserId || 0) === currentUserId;
    const isLockedForPoints = !isPrivileged && !isOwner && userPoints < PREVIEW_THRESHOLD;

    return {
      ...doc,
      ownerName: doc.ownerName || doc.authorName || doc.uploadedByName || "NeuShare member",
      requiredPoints: PREVIEW_THRESHOLD,
      isLockedForPoints,
      isOwner,
      categoryLabel: getCategoryLabel(doc, text),
      updatedLabel: formatShortDate(doc?.updatedAt || doc?.createdAt, text),
      engagementScore: getEngagementScore(doc),
      canDownload: isPrivileged || isOwner || userPoints >= FULL_ACCESS_THRESHOLD,
      canFullView: isPrivileged || isOwner || userPoints >= PREVIEW_THRESHOLD,
    };
  });

  const recentReadIds = Array.isArray(input.recentlyOpenedDocIds)
    ? input.recentlyOpenedDocIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
    : [];
  const continueReadingPool = recentReadIds
    .map((docId) => docs.find((doc) => Number(doc.documentId) === docId))
    .filter(Boolean);
  const continueReading = continueReadingPool.length > 0 ? continueReadingPool.slice(0, 6) : docs.slice(0, 6);

  const weekFloor = Date.now() - WEEK_MS;
  const weeklyDocs = docs.filter((doc) => {
    const activityAt = Math.max(toTime(doc.updatedAt), toTime(doc.createdAt));
    return activityAt >= weekFloor;
  });
  const trendingSource = weeklyDocs.length > 0 ? weeklyDocs : docs;
  const trendingDocs = [...trendingSource]
    .sort((left, right) => {
      const scoreGap = getWeeklyViewScore(right) - getWeeklyViewScore(left);
      if (scoreGap !== 0) return scoreGap;
      return Math.max(toTime(right.updatedAt), toTime(right.createdAt)) -
        Math.max(toTime(left.updatedAt), toTime(left.createdAt));
    })
    .slice(0, 5);
  const recentDocs = [...docs]
    .sort(
      (left, right) =>
        new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime(),
    )
    .slice(0, 6);

  const categories = Array.isArray(input.categories) ? input.categories : [];
  const apiCourseCards = categories
    .map((cat) => ({
      categoryId: Number(cat?.categoryId || 0),
      name: String(cat?.name || "").trim(),
      description:
        cat?.description || (user?.language === "en" ? "Curated learning materials, revision packs, and peer-reviewed notes." : "Tài liệu học tập, bộ ôn tập và ghi chú được tuyển chọn."),
      docCount: Number(cat?.documentCount || 0),
    }))
    .filter((cat) => cat.categoryId > 0 && cat.name && cat.docCount > 0)
    .sort((left, right) => {
      const countGap = right.docCount - left.docCount;
      if (countGap !== 0) return countGap;
      return left.name.localeCompare(right.name);
    })
    .slice(0, 6)
    .map((cat) => ({
      ...cat,
      tone: ["teal", "blue", "slate", "sea"][cat.categoryId % 4],
    }));

  // Fallback while backend/category cache is warming up.
  const fallbackCountByCategory = new Map();
  docs.forEach((doc) => {
    parseCategoryTokens(doc).forEach((name) => {
      const key = name.toLowerCase();
      fallbackCountByCategory.set(key, Number(fallbackCountByCategory.get(key) || 0) + 1);
    });
  });

  const fallbackCourseCards = [...fallbackCountByCategory.entries()]
    .filter(([, docCount]) => Number(docCount) > 0)
    .map(([nameKey, docCount], index) => ({
      categoryId: 100000 + index,
      name: nameKey.replace(/\b\w/g, (ch) => ch.toUpperCase()),
      description: user?.language === "en" ? "Curated learning materials, revision packs, and peer-reviewed notes." : "Tài liệu học tập, bộ ôn tập và ghi chú được tuyển chọn.",
      docCount: Number(docCount),
      tone: ["teal", "blue", "slate", "sea"][index % 4],
    }))
    .sort((left, right) => right.docCount - left.docCount)
    .slice(0, 6);

  const courseCards = apiCourseCards.length > 0 ? apiCourseCards : fallbackCourseCards;

  const unreadNotifications = notifications.filter((item) => !item.isRead);
  const totalUpvotes = myDocs.reduce((sum, doc) => sum + Number(doc?.likeCount || 0), 0);
  const searchKeyword = String(input.docFilter?.keyword || "").trim().toLowerCase();

  const searchSuggestions = searchKeyword
    ? [
        ...docs
          .filter((doc) =>
            [doc.title, doc.description, doc.categoryLabel, doc.ownerName]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(searchKeyword)),
          )
          .slice(0, 5)
          .map((doc) => ({
            key: `doc-${doc.documentId}`,
            type: "document",
            documentId: doc.documentId,
            label: doc.title,
            meta: doc.categoryLabel || doc.ownerName || "Document",
            doc,
          })),
        ...(Array.isArray(input.categories) ? input.categories : [])
          .filter((course) =>
            [course?.name, course?.description]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(searchKeyword)),
          )
          .slice(0, 4)
          .map((course) => ({
            key: `course-${course.categoryId}`,
            type: "course",
            categoryId: course.categoryId,
            name: course.name,
            description: course.description || "Course suggestion",
            label: course.name,
            meta: "Course",
          })),
      ].slice(0, 8)
    : [];

  return {
    isBusy: Boolean(input.isBusy),
    user,
    role,
    currentUserId,
    activeTab: input.activeTab || "home",
    userPoints,
    access,
    docs,
    myDocs,
    continueReading,
    trendingDocs,
    recentDocs,
    courseCards,
    searchSuggestions,
    notificationPreview: unreadNotifications.slice(0, 4),
    heroStats: [
      {
        label: text.workspacePoints,
        value: String(userPoints),
        note: access.accentLabel,
      },
      {
        label: text.publishedUploads,
        value: String(myDocs.length),
        note: myDocs.length > 0 ? text.profileLinkedDocs : text.startFirstUpload,
      },
      {
        label: text.unreadSignals,
        value: String(unreadNotifications.length),
        note:
          unreadNotifications.length > 0
            ? text.commentsModerationPointsQa
            : text.noUnreadActivity,
      },
      {
        label: text.communityUpvotes,
        value: String(totalUpvotes),
        note: text.recognitionFromMaterials,
      },
    ],
    quickActions: [
      {
        key: "upload",
        title: text.uploadMaterial,
        description: text.uploadMaterialDesc,
        actionLabel: text.newUpload,
        tab: "upload",
      },
      {
        key: "library",
        title: text.openMyLibrary,
        description: text.openMyLibraryDesc,
        actionLabel: text.openLibrary,
        tab: "library",
      },
      {
        key: "points",
        title: text.trackPoints,
        description: text.trackPointsDesc,
        actionLabel: text.viewPoints,
        tab: "points",
      },
      {
        key: "notifications",
        title: text.checkNotifications,
        description: text.checkNotificationsDesc,
        actionLabel: text.openInbox,
        tab: "notifications",
      },
    ],
    workspaceCards: [
      {
        key: "user",
        title: text.userWorkspace,
        description:
          text.userWorkspaceDesc,
        status: text.activeLearningFlow,
        isActive: role === "user",
      },
      {
        key: "moderator",
        title: text.moderatorWorkspace,
        description: text.moderatorWorkspaceDesc,
        status: text.operationalReviewFlow,
        isActive: role === "moderator",
      },
      {
        key: "admin",
        title: text.adminWorkspace,
        description: text.adminWorkspaceDesc,
        status: text.platformGovernanceFlow,
        isActive: role === "admin",
      },
    ],
    previewThreshold: PREVIEW_THRESHOLD,
    fullThreshold: FULL_ACCESS_THRESHOLD,
  };
}
