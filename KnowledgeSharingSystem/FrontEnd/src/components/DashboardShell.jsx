import PreviewPanel from "./dashboard/PreviewPanel";
import Sidebar from "./dashboard/Sidebar";
import Topbar from "./dashboard/Topbar";
import CategoriesTab from "./dashboard/tabs/CategoriesTab";
import HomeTab from "./dashboard/tabs/HomeTab";
import ModerationTab from "./dashboard/tabs/ModerationTab";
import MyLibraryTab from "./dashboard/tabs/MyLibraryTab";
import NotificationsTab from "./dashboard/tabs/NotificationsTab";
import ProfileTab from "./dashboard/tabs/ProfileTab";
import SettingsTab from "./dashboard/tabs/SettingsTab";
import UploadTab from "./dashboard/tabs/UploadTab";

function DashboardShell(props) {
  const {
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
  } = props;

  return (
    <div className="app-shell">
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
        {activeTab === "notifications" && <NotificationsTab {...props} />}
        {activeTab === "categories" && <CategoriesTab {...props} />}
        {activeTab === "reader" && (
          <PreviewPanel
            previewDoc={previewDoc}
            onClose={closePreview}
            getDocReactionCounts={getDocReactionCounts}
            onToggleLike={toggleLike}
            onToggleDislike={toggleDislike}
            onToggleSave={toggleSave}
            onReport={onReportFromPreview}
          />
        )}

        {activeTab !== "reader" && (
          <PreviewPanel
            previewDoc={previewDoc}
            onClose={closePreview}
            getDocReactionCounts={getDocReactionCounts}
            onToggleLike={toggleLike}
            onToggleDislike={toggleDislike}
            onToggleSave={toggleSave}
            onReport={onReportFromPreview}
          />
        )}
      </main>
    </div>
  );
}

export default DashboardShell;
