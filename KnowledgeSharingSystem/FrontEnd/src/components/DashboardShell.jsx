import PreviewPanel from "./dashboard/PreviewPanel";
import Sidebar from "./dashboard/Sidebar";
import Topbar from "./dashboard/Topbar";
import CategoriesTab from "./dashboard/tabs/CategoriesTab";
import HomeTab from "./dashboard/tabs/HomeTab";
import ModerationTab from "./dashboard/tabs/ModerationTab";
import MyLibraryTab from "./dashboard/tabs/MyLibraryTab";
import NotificationsTab from "./dashboard/tabs/NotificationsTab";
import PointsTab from "./dashboard/tabs/PointsTab";
import ProfileTab from "./dashboard/tabs/ProfileTab";
import SettingsTab from "./dashboard/tabs/SettingsTab";
import UploadTab from "./dashboard/tabs/UploadTab";
import UsersTab from "./dashboard/tabs/UsersTab";

function DashboardShell(props) {
  const {
    user,
    activeTab,
    status,
    error,
    previewDoc,
    closePreview,
    getDocReactionCounts,
    toggleLike,
    toggleDislike,
    toggleSave,
    onReportFromPreview,
    previewComments,
    createCommentForPreview,
    createReplyForPreview,
  } = props;
  const roleClass = `role-${user?.role || "user"}`;

  return (
    <div className={`app-shell ${roleClass}`}>
      <Sidebar {...props} />

      <main className="content">
        <Topbar {...props} />

        {status && <p className="ok">{status}</p>}
        {error && <p className="err">{error}</p>}

        {activeTab === "home" && <HomeTab {...props} />}
        {activeTab === "profile" && <ProfileTab {...props} />}
        {activeTab === "library" && <MyLibraryTab {...props} />}
        {activeTab === "settings" && <SettingsTab {...props} />}
        {activeTab === "upload" && <UploadTab {...props} />}
        {activeTab === "moderation" && <ModerationTab {...props} />}
        {activeTab === "users" && <UsersTab {...props} />}
        {activeTab === "notifications" && <NotificationsTab {...props} />}
        {activeTab === "points" && <PointsTab {...props} />}
        {activeTab === "categories" && <CategoriesTab {...props} />}
        {(activeTab === "reader" || previewDoc) && (
          <PreviewPanel
            previewDoc={previewDoc}
            onClose={closePreview}
            getDocReactionCounts={getDocReactionCounts}
            onToggleLike={toggleLike}
            onToggleDislike={toggleDislike}
            onToggleSave={toggleSave}
            onReport={onReportFromPreview}
            comments={previewComments}
            onCreateComment={createCommentForPreview}
            onCreateReply={createReplyForPreview}
          />
        )}
      </main>
    </div>
  );
}

export default DashboardShell;
