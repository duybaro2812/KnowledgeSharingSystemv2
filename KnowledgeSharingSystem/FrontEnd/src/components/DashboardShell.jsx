import { useEffect, useRef, useState } from "react";
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
import QaTab from "./dashboard/tabs/QaTab";
import SearchTab from "./dashboard/tabs/SearchTab";
import SettingsTab from "./dashboard/tabs/SettingsTab";
import UploadTab from "./dashboard/tabs/UploadTab";
import UsersTab from "./dashboard/tabs/UsersTab";

function DashboardShell(props) {
  const {
    user,
    activeTab,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    status,
    error,
    isBusy,
    previewDoc,
    closePreview,
    getDocReactionCounts,
    toggleLike,
    toggleDislike,
    toggleSave,
    onDownloadFromPreview,
    onReportFromPreview,
    onStartQaFromPreview,
    previewComments,
    createCommentForPreview,
    createReplyForPreview,
  } = props;
  const mainRef = useRef(null);
  const roleClass = `role-${user?.role || "user"}`;
  const [statusToast, setStatusToast] = useState("");
  const [errorToast, setErrorToast] = useState("");

  useEffect(() => {
    const scrollTarget = mainRef.current;
    if (scrollTarget && typeof scrollTarget.scrollTo === "function") {
      scrollTarget.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    if (typeof document !== "undefined") {
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
    }
  }, [activeTab, previewDoc?.documentId]);

  useEffect(() => {
    if (!status) {
      setStatusToast("");
      return;
    }

    setStatusToast(status);
    const normalized = String(status).trim().toLowerCase();
    const timeoutMs = normalized === "login successful." ? 2000 : 3200;
    const timer = setTimeout(() => setStatusToast(""), timeoutMs);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (!error) return;
    setErrorToast(error);
    const timer = setTimeout(() => setErrorToast(""), 4200);
    return () => clearTimeout(timer);
  }, [error]);

  return (
    <div className={`app-shell ${roleClass} ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar {...props} />

      <button
        type="button"
        className="sidebar-collapse-toggle"
        aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        onClick={() => setIsSidebarCollapsed((prev) => !prev)}
      >
        <span aria-hidden="true">{isSidebarCollapsed ? "›" : "‹"}</span>
      </button>

      <main className="content" ref={mainRef}>
        <Topbar {...props} />

        {status && <p className="ok">{status}</p>}
        {error && <p className="err">{error}</p>}
        <div className="floating-feedback-stack" aria-live="polite">
          {isBusy && <div className="floating-feedback floating-feedback-info">Processing...</div>}
          {statusToast && <div className="floating-feedback floating-feedback-success">{statusToast}</div>}
          {errorToast && <div className="floating-feedback floating-feedback-error">{errorToast}</div>}
        </div>

        <div key={activeTab === "reader" ? `reader-${previewDoc?.documentId || "empty"}` : activeTab}>
          {(activeTab === "home" || activeTab === "recent") && <HomeTab {...props} />}
          {activeTab === "search" && <SearchTab {...props} />}
          {activeTab === "qa" && <QaTab {...props} />}
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
              onDownload={onDownloadFromPreview}
              onReport={onReportFromPreview}
              onStartQa={onStartQaFromPreview}
              comments={previewComments}
              onCreateComment={createCommentForPreview}
              onCreateReply={createReplyForPreview}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default DashboardShell;
