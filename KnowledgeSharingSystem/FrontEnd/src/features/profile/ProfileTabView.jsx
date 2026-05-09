const getInitials = (value) => {
  const words = String(value || "U").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "U";
};

const formatNumber = (value) => Number(value || 0).toLocaleString();

const getRatingPercent = (doc) => {
  const rating = Number(doc?.averageRating || doc?.ratingAverage || doc?.rating || 0);
  if (rating > 0) return Math.round((Math.min(rating, 5) / 5) * 100);
  const likes = Number(doc?.likeCount || doc?.likes || 0);
  const dislikes = Number(doc?.dislikeCount || doc?.dislikes || 0);
  const total = likes + dislikes;
  return total > 0 ? Math.round((likes / total) * 100) : 0;
};

function ProfileIcon({ type }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const paths = {
    university: <path d="m4 10 8-5 8 5M6 10v7M10 10v7M14 10v7M18 10v7M4.5 18.5h15" {...common} />,
    points: (
      <>
        <path d="M8 5h8v3.5c0 3-1.5 5-4 5s-4-2-4-5z" {...common} />
        <path d="M8 7H5.5c0 2.5 1.2 4 3.2 4.3M16 7h2.5c0 2.5-1.2 4-3.2 4.3M12 13.5V18M9 18h6" {...common} />
      </>
    ),
    document: (
      <>
        <path d="M7 4.5h6l4 4v11H7z" {...common} />
        <path d="M13 4.5V9h4M9.5 12.5h5M9.5 15.5h4" {...common} />
      </>
    ),
    upload: <path d="M12 16V5m0 0L8 9m4-4 4 4M5 16.5v2h14v-2" {...common} />,
    heart: (
      <path
        d="M12 19s-7-4.3-7-9.2A3.7 3.7 0 0 1 11.6 7 3.7 3.7 0 0 1 18.2 9.8C18.2 14.7 12 19 12 19Z"
        fill="currentColor"
      />
    ),
    like: <path d="M8.5 19h-3V10h3zm0-9L12 4.5c.8.3 1.2.9 1.2 1.8v2.2H17a2 2 0 0 1 2 2.4l-1.1 5.8A2 2 0 0 1 16 18.5H8.5" {...common} />,
    edit: <path d="M4.5 18.5h4L18 9l-4-4-9.5 9.5zM12.8 6.2l4 4" {...common} />,
    check: <path d="m7 12 3.2 3.2L17 8.5" {...common} />,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[type] || paths.document}
    </svg>
  );
}

function ProfileTabView(props) {
  const { model, controller } = props;
  const user = model.user || {};
  const isEnglish = user?.language === "en";
  const text = {
    editProfile: isEnglish ? "Edit Profile" : "Chỉnh sửa hồ sơ",
    schoolFallback: isEnglish ? "No university added" : "Chưa thêm trường đại học",
    majorFallback: isEnglish ? "No faculty or major added" : "Chưa thêm khoa hoặc chuyên ngành",
    shortBio: "Short Bio",
    noBio: isEnglish
      ? "No Short Bio yet. Add a short description so classmates understand your expertise and study goals."
      : "Chưa có Short Bio. Thêm mô tả ngắn để bạn bè hiểu hơn về chuyên môn và mục tiêu học tập của bạn.",
    totalPoints: isEnglish ? "Total Points" : "Tổng điểm",
    pointsToLevel: isEnglish ? "points to level" : "điểm để lên cấp",
    learnMore: isEnglish ? "Learn more" : "Tìm hiểu thêm",
    stats: isEnglish ? "Statistics" : "Thống kê",
    myUploads: isEnglish ? "My Uploads" : "Tài liệu đã tải lên",
    uploads: isEnglish ? "Uploads" : "Tài liệu",
    upvotes: "Upvotes",
    comments: isEnglish ? "Comments" : "Bình luận",
    impact: isEnglish ? "Impact" : "Tác động",
    helped: isEnglish ? "Students Helped" : "Lượt hỗ trợ",
    callout: isEnglish
      ? "Help your classmates and earn more points by uploading your notes"
      : "Giúp bạn học và nhận thêm điểm bằng cách tải tài liệu của bạn lên",
    uploadDocuments: isEnglish ? "Upload documents" : "Tải tài liệu lên",
    documentTitle: isEnglish ? "Document Title" : "Tên tài liệu",
    views: isEnglish ? "Views" : "Lượt xem",
    ratings: isEnglish ? "Ratings" : "Đánh giá",
    anonymous: isEnglish ? "Anonymous" : "Ẩn danh",
    emptyTitle: isEnglish ? "No uploaded documents" : "Chưa có tài liệu tải lên",
    emptyDesc: isEnglish ? "Upload your first document and it will appear here." : "Tải tài liệu đầu tiên lên và tài liệu sẽ xuất hiện tại đây.",
  };
  const docs = model.uploadedDocs || [];
  const visibleDocs = docs.slice(0, 5);
  const avatarSrc = user?.avatarUrl ? controller.resolveFileUrl?.(user.avatarUrl) : "";
  const points = Number(user?.points || 0);
  const level = points >= 100 ? 4 : points >= 45 ? 3 : points >= 30 ? 2 : 1;
  const nextLevelPoints = level >= 4 ? 0 : level === 3 ? Math.max(0, 100 - points) : Math.max(0, 45 - points);
  const levelProgress = level >= 4 ? 100 : Math.min(100, Math.max(8, (points / (points + nextLevelPoints || 1)) * 100));
  const totalViews = docs.reduce((sum, doc) => sum + Number(doc?.viewCount || doc?.views || 0), 0);
  const totalComments = docs.reduce((sum, doc) => sum + Number(doc?.commentCount || doc?.comments || 0), 0);
  const impact = Math.max(0, totalViews + totalComments);
  const roleLabel = level >= 3 ? "Contributor" : level === 2 ? "Reader" : "Beginner";
  const shortBio = String(user?.bio || "").trim() || text.noBio;

  return (
    <section className="profile-public-page">
      <header className="profile-public-hero">
        <div className="profile-public-user">
          <div className="profile-public-avatar">
            {avatarSrc ? <img src={avatarSrc} alt={`${user?.name || "User"} avatar`} /> : <span>{getInitials(user?.name)}</span>}
          </div>
          <div className="profile-public-copy">
            <div className="profile-public-title-row">
              <h2>{user?.name || "Unnamed user"}</h2>
              <button type="button" className="profile-edit-btn" onClick={controller.onEditProfile}>
                <ProfileIcon type="edit" />
                <span>{text.editProfile}</span>
              </button>
            </div>
            <p className="profile-public-school">
              <ProfileIcon type="university" />
              <span>{user?.school || text.schoolFallback}</span>
            </p>
            <p className="profile-public-major">{user?.major || text.majorFallback}</p>
            <div className="profile-short-bio">
              <b>{text.shortBio}</b>
              <p>{shortBio}</p>
            </div>
          </div>
        </div>

        <aside className="profile-points-card">
          <div className="profile-points-top">
            <h3>{text.totalPoints}</h3>
            <strong>{formatNumber(points)}</strong>
          </div>
          <div className="profile-level-row">
            <span>Level <b>{level}</b> {roleLabel}</span>
            <small>{formatNumber(nextLevelPoints)} {text.pointsToLevel} {Math.min(level + 1, 4)}</small>
          </div>
          <div className="profile-level-track">
            <i style={{ width: `${levelProgress}%` }} />
          </div>
          <button type="button">{text.learnMore}</button>
        </aside>
      </header>

      <div className="profile-public-content">
        <section className="profile-public-section">
          <h3>{text.stats}</h3>
          <div className="profile-stat-layout">
            <article className="profile-stat-card profile-upload-stat">
              <h4>
                <ProfileIcon type="document" />
                {text.myUploads}
              </h4>
              <div className="profile-upload-metrics">
                <div>
                  <b>{formatNumber(model.stats.uploads || docs.length)}</b>
                  <span>{text.uploads}</span>
                </div>
                <div>
                  <b>{formatNumber(model.stats.upvotes || 0)}</b>
                  <span>{text.upvotes}</span>
                </div>
                <div>
                  <b>{formatNumber(totalComments)}</b>
                  <span>{text.comments}</span>
                </div>
              </div>
            </article>

            <article className="profile-stat-card profile-impact-card">
              <h4>
                <ProfileIcon type="heart" />
                {text.impact}
              </h4>
              <b>{formatNumber(impact)}</b>
              <span>{text.helped}</span>
            </article>
          </div>
        </section>

        <div className="profile-upload-callout">
          <span>
            <ProfileIcon type="document" />
            {text.callout}
          </span>
          <button type="button" onClick={controller.onUploadDocument}>
            <ProfileIcon type="upload" />
            {text.uploadDocuments}
          </button>
        </div>

        <section className="profile-public-section">
          <h3>{text.myUploads}</h3>
          <div className="profile-upload-table">
            <div className="profile-upload-table-head">
              <span>{text.documentTitle}</span>
              <span>{text.views}</span>
              <span>{text.ratings}</span>
              <span>{text.anonymous}</span>
            </div>
            {visibleDocs.map((doc) => {
              const ratingPercent = getRatingPercent(doc);
              return (
                <button
                  key={doc?.documentId || doc?.id || doc?.title}
                  type="button"
                  className="profile-upload-row"
                  onClick={() => controller.onOpenDocument?.(doc)}
                >
                  <span className="profile-doc-title">
                    <ProfileIcon type="document" />
                    <b>{doc?.title || "Untitled document"}</b>
                  </span>
                  <span>{formatNumber(doc?.viewCount || doc?.views || 0)}</span>
                  <span className="profile-rating">
                    <ProfileIcon type="like" />
                    {ratingPercent}% ({formatNumber(doc?.ratingCount || doc?.ratings || doc?.likeCount || 0)})
                  </span>
                  <span className={`profile-anon-box ${doc?.isAnonymous || doc?.anonymous ? "checked" : ""}`}>
                    {doc?.isAnonymous || doc?.anonymous ? <ProfileIcon type="check" /> : null}
                  </span>
                </button>
              );
            })}
            {visibleDocs.length === 0 ? (
              <div className="profile-upload-empty">
                <h4>{text.emptyTitle}</h4>
                <p>{text.emptyDesc}</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}

export default ProfileTabView;
