import { useEffect, useRef, useState } from "react";
import PreviewPanel from "./PreviewPanel";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import CategoriesTab from "../categories/CategoriesTab";
import HomeTab from "../home/HomeTab";
import ModerationTab from "../moderation/ModerationTab";
import MyDocumentsTab from "../my-documents/MyDocumentsTab";
import MyLibraryTab from "../library/MyLibraryTab";
import NotificationsTab from "../notifications/NotificationsTab";
import PointPolicyTab from "../points/PointPolicyTab";
import PointsTab from "../points/PointsTab";
import ProfileTab from "../profile/ProfileTab";
import QaTab from "../qa/QaTab";
import SearchTab from "../search/SearchTab";
import SettingsTab from "../settings/SettingsTab";
import UploadTab from "../upload/UploadTab";
import UsersTab from "../users/UsersTab";

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
    getDocRatings,
    toggleLike,
    toggleDislike,
    toggleSave,
    saveDocumentRating,
    deleteDocumentRating,
    onDownloadFromPreview,
    onReportFromPreview,
    onStartQaFromPreview,
    previewComments,
    createCommentForPreview,
    createReplyForPreview,
  } = props;
  const mainRef = useRef(null);
  const roleClass = `role-${user?.role || "user"}`;
  const tabClass = `tab-${String(activeTab || "home")}`;
  const previewOpenClass = previewDoc ? "preview-open" : "";
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
    <div
      className={`app-shell ${roleClass} ${tabClass} ${previewOpenClass} ${
        isSidebarCollapsed ? "sidebar-collapsed" : ""
      }`}
    >
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
        <div className="floating-feedback-stack" aria-live="polite">
          {isBusy && <div className="floating-feedback floating-feedback-info">Processing...</div>}
          {statusToast && <div className="floating-feedback floating-feedback-success">{statusToast}</div>}
          {errorToast && <div className="floating-feedback floating-feedback-error">{errorToast}</div>}
        </div>

        <div key={activeTab === "reader" ? `reader-${previewDoc?.documentId || "empty"}` : activeTab}>
          {activeTab === "home" && <HomeTab {...props} />}
          {activeTab === "recent" && <MyDocumentsTab {...props} />}
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
          {activeTab === "point-policy" && <PointPolicyTab {...props} />}
          {activeTab === "categories" && <CategoriesTab {...props} />}
          {(activeTab === "reader" || previewDoc) && (
            <PreviewPanel
              previewDoc={previewDoc}
              onClose={closePreview}
              getDocReactionCounts={getDocReactionCounts}
              getDocRatings={getDocRatings}
              onToggleLike={toggleLike}
              onToggleDislike={toggleDislike}
              onToggleSave={toggleSave}
              onSaveRating={saveDocumentRating}
              onDeleteRating={deleteDocumentRating}
              onDownload={onDownloadFromPreview}
              onReport={onReportFromPreview}
              onStartQa={onStartQaFromPreview}
              comments={previewComments}
              focusCommentId={props.moderationFocus?.commentId}
              onCreateComment={createCommentForPreview}
              onCreateReply={createReplyForPreview}
              onReviewCommentPoint={props.onReviewCommentPointFromPreview}
              onHideComment={props.onHideCommentFromPreview}
              onRestoreComment={props.onRestoreCommentFromPreview}
              onDeleteHiddenComment={props.onDeleteHiddenCommentFromPreview}
              onOpenHiddenKnowledge={props.onOpenHiddenKnowledge}
              onSaveHiddenKnowledge={props.onSaveHiddenKnowledge}
              onAddHiddenKnowledgeFromComment={props.onAddHiddenKnowledgeFromComment}
              isGuestMode={props.isGuestMode}
              onNavigateToLogin={props.onNavigateToLogin}
              onNavigateToRegister={props.onNavigateToRegister}
              isBusy={isBusy}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default DashboardShell;
