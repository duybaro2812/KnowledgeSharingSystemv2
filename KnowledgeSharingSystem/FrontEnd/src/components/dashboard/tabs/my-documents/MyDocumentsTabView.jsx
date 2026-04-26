import { useMemo, useState } from "react";

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function formatDate(value) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "N/A";
  }
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function MyDocumentsTabView(props) {
  const { model, controller } = props;
  const [viewMode, setViewMode] = useState("uploaded");

  const displayedDocs = useMemo(
    () => (viewMode === "uploaded" ? model.uploadedDocs : model.recentOpenedDocs),
    [viewMode, model.uploadedDocs, model.recentOpenedDocs],
  );

  return (
    <section className="panel mydocs-page">
      <div className="mydocs-head">
        <div>
          <h2>My Documents</h2>
          <p className="hint">
            {model.summary.total} uploaded documents • {model.recentOpenedDocs.length} recently opened
          </p>
        </div>
        <button type="button" className="primary-btn" disabled={model.isBusy} onClick={controller.onUploadNew}>
          Upload New
        </button>
      </div>

      <div className="mydocs-stat-grid">
        <article className="mydocs-stat-card">
          <p>Total Uploads</p>
          <b>{formatNumber(model.summary.total)}</b>
        </article>
        <article className="mydocs-stat-card">
          <p>Total Views</p>
          <b>{formatNumber(model.summary.totalViews)}</b>
        </article>
        <article className="mydocs-stat-card">
          <p>Total Downloads</p>
          <b>{formatNumber(model.summary.totalDownloads)}</b>
        </article>
        <article className="mydocs-stat-card">
          <p>Total Likes</p>
          <b>{formatNumber(model.summary.totalLikes)}</b>
        </article>
      </div>

      <div className="mydocs-filter-row" role="tablist" aria-label="My documents view mode">
        {["uploaded", "recently"].map((key) => (
          <button
            key={key}
            type="button"
            className={viewMode === key ? "active" : ""}
            onClick={() => setViewMode(key)}
          >
            {key === "uploaded" ? "Uploaded" : "Recently"}
          </button>
        ))}
      </div>

      <section className="mydocs-section">
        <div className="mydocs-section-head">
          <h3>{viewMode === "uploaded" ? "Tài liệu đã tải lên" : "Tài liệu mở gần đây"}</h3>
          <small>
            {viewMode === "uploaded"
              ? "Tài liệu do người dùng tải lên và thuộc sở hữu của người dùng."
              : "Tài liệu được người dùng mở gần đây."}
          </small>
        </div>
        <div className="mydocs-list">
          {displayedDocs.map((doc) => {
            const status = normalizeStatus(doc?.status);
            return (
              <article key={`${viewMode}-${doc.documentId}`} className="mydocs-item">
                <div className="mydocs-item-main">
                  <div className="mydocs-item-top">
                    <span className={`qa-status-badge ${status || "closed"}`}>{status || "unknown"}</span>
                    <small>
                      {doc?.categoryNames || doc?.categoryName || "General"} •{" "}
                      {formatDate(
                        viewMode === "uploaded" ? doc?.createdAt : doc?.updatedAt || doc?.createdAt,
                      )}
                    </small>
                  </div>
                  <h3>{doc?.title || "Untitled document"}</h3>
                  <p>{doc?.description || "No description provided."}</p>
                  <div className="mydocs-item-stats">
                    {viewMode === "recently" && (
                      <span>Owner: {doc?.ownerName || doc?.authorName || "NeuShare member"}</span>
                    )}
                    <span>Views: {formatNumber(doc?.viewCount || doc?.views)}</span>
                    {viewMode === "uploaded" ? (
                      <span>Downloads: {formatNumber(doc?.downloadCount || doc?.downloads)}</span>
                    ) : null}
                    <span>Likes: {formatNumber(doc?.likeCount || doc?.likes)}</span>
                  </div>
                </div>
                <div className="mydocs-item-actions">
                  <button type="button" disabled={model.isBusy} onClick={() => controller.onOpenDoc(doc)}>
                    Open
                  </button>
                  {doc?.fileUrl ? (
                    <a href={controller.resolveUrl(doc?.fileUrl)} target="_blank" rel="noreferrer">
                      File
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}

          {displayedDocs.length === 0 && (
            <div className="mydocs-empty">
              <h3>
                {viewMode === "uploaded"
                  ? "No uploaded documents"
                  : "No recently opened documents"}
              </h3>
              <p>
                {viewMode === "uploaded"
                  ? "Upload your first document to get started."
                  : "Open any document and it will appear here."}
              </p>
              {viewMode === "uploaded" && (
                <button type="button" className="primary-btn" onClick={controller.onUploadNew}>
                  Upload Document
                </button>
              )}
            </div>
          )}
        </div>
      </section>

    </section>
  );
}

export default MyDocumentsTabView;
