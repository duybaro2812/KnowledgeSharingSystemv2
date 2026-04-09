const PREVIEW_THRESHOLD = 30;
const FULL_ACCESS_THRESHOLD = 40;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const formatShortDate = (value) => {
  if (!value) return "Recently updated";

  try {
    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Recently updated";
  }
};

const getCategoryLabel = (doc) =>
  doc?.categoryName ||
  doc?.categoryNames ||
  doc?.category ||
  doc?.topic ||
  doc?.subject ||
  "Knowledge Pack";

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

const deriveAccessModel = ({ user, userPoints, pointPolicy }) => {
  const role = user?.role || "user";

  if (["moderator", "admin"].includes(role)) {
    return {
      tier: "staff",
      title: role === "admin" ? "Administrative access" : "Moderation access",
      description: "You can bypass document gating, review reports, and access operational flows.",
      accentLabel: role === "admin" ? "Admin bypass enabled" : "Moderator bypass enabled",
      progressValue: 100,
      badgeTone: "staff",
    };
  }

  if (userPoints < PREVIEW_THRESHOLD) {
    return {
      tier: "locked",
      title: "Contribution unlock tier",
      description:
        "You can comment, reply, discuss, and ask document owners questions, but the viewer remains blocked until you reach 30 points.",
      accentLabel: `${Math.max(0, PREVIEW_THRESHOLD - userPoints)} points to unlock viewer`,
      progressValue: Math.max(8, Math.round((userPoints / PREVIEW_THRESHOLD) * 100)),
      badgeTone: "locked",
    };
  }

  if (userPoints < FULL_ACCESS_THRESHOLD) {
    return {
      tier: "limited",
      title: "Viewer unlocked",
      description:
        "You can read full documents with limits, join discussions, and ask questions, but downloads remain locked below 40 points.",
      accentLabel: `${Math.max(0, FULL_ACCESS_THRESHOLD - userPoints)} points to unlock downloads`,
      progressValue: Math.max(55, Math.round((userPoints / FULL_ACCESS_THRESHOLD) * 100)),
      badgeTone: "limited",
    };
  }

  return {
    tier: "full",
    title: "Full access unlocked",
    description:
      "You can fully view and download documents. Downloads spend points, so your contribution balance matters.",
    accentLabel: pointPolicy?.download?.standardCost
      ? `Downloads from ${pointPolicy.download.standardCost} points`
      : "Downloads cost points",
    progressValue: 100,
    badgeTone: "full",
  };
};

export function createHomeModel(input) {
  const user = input.user || null;
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
  const access = deriveAccessModel({ user, userPoints, pointPolicy });

  const docs = rawDocs.map((doc) => {
    const isOwner = Number(doc?.ownerUserId || 0) === currentUserId;
    const isLockedForPoints = !isPrivileged && !isOwner && userPoints < PREVIEW_THRESHOLD;

    return {
      ...doc,
      ownerName: doc.ownerName || doc.authorName || doc.uploadedByName || "NeuShare member",
      requiredPoints: PREVIEW_THRESHOLD,
      isLockedForPoints,
      isOwner,
      categoryLabel: getCategoryLabel(doc),
      updatedLabel: formatShortDate(doc?.updatedAt || doc?.createdAt),
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

  const courseCards = (Array.isArray(input.categories) ? input.categories : []).slice(0, 6).map((cat) => {
    const keyword = String(cat?.name || "").toLowerCase();
    const matchingDocs = docs.filter((doc) =>
      [doc.categoryLabel, doc.description, doc.title]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );

    return {
      categoryId: cat.categoryId,
      name: cat.name,
      description: cat.description || "Curated learning materials, revision packs, and peer-reviewed notes.",
      docCount: matchingDocs.length,
      tone: ["teal", "blue", "slate", "sea"][Number(cat.categoryId || 0) % 4],
    };
  });

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
        label: "Workspace points",
        value: String(userPoints),
        note: access.accentLabel,
      },
      {
        label: "Published uploads",
        value: String(myDocs.length),
        note: myDocs.length > 0 ? "Documents already linked to your profile." : "Start with your first upload.",
      },
      {
        label: "Unread signals",
        value: String(unreadNotifications.length),
        note:
          unreadNotifications.length > 0
            ? "Comments, moderation, points, and Q&A activity."
            : "No unread activity right now.",
      },
      {
        label: "Community upvotes",
        value: String(totalUpvotes),
        note: "Recognition earned from shared learning materials.",
      },
    ],
    quickActions: [
      {
        key: "upload",
        title: "Upload material",
        description: "Share lecture notes, solved exercises, or revision packs to grow your points.",
        actionLabel: "New upload",
        tab: "upload",
      },
      {
        key: "library",
        title: "Open my library",
        description: "Track uploaded documents and watch approval, rejection, or hidden states.",
        actionLabel: "Open library",
        tab: "library",
      },
      {
        key: "points",
        title: "Track points",
        description: "Review unlock thresholds, download readiness, and point approvals.",
        actionLabel: "View points",
        tab: "points",
      },
      {
        key: "notifications",
        title: "Check notifications",
        description: "Monitor comments, moderation, plagiarism, chat, and reward activity.",
        actionLabel: "Open inbox",
        tab: "notifications",
      },
    ],
    workspaceCards: [
      {
        key: "user",
        title: "User workspace",
        description:
          "Browse trusted study materials, keep a personal library, discuss documents, and unlock access through contribution.",
        status: "Active learning flow",
        isActive: role === "user",
      },
      {
        key: "moderator",
        title: "Moderator workspace",
        description:
          "Review pending documents, moderation queues, reports, duplicate checks, and plagiarism alerts with clear actions.",
        status: "Operational review flow",
        isActive: role === "moderator",
      },
      {
        key: "admin",
        title: "Admin workspace",
        description:
          "Manage users, role permissions, course structures, locks, deletions, and platform integrity controls.",
        status: "Platform governance flow",
        isActive: role === "admin",
      },
    ],
    previewThreshold: PREVIEW_THRESHOLD,
    fullThreshold: FULL_ACCESS_THRESHOLD,
  };
}
