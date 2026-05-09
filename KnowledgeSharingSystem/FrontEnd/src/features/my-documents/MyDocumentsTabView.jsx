import { useMemo, useState } from "react";
import { tFor } from "../../i18n";

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function formatDate(value, text) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return text.recentlyUpdated;
  }
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function MyDocumentsTabView(props) {
  const { model, controller } = props;
  const text = tFor(model.user);
  const [viewMode, setViewMode] = useState("uploaded");

  const displayedDocs = useMemo(
    () => (viewMode === "uploaded" ? model.uploadedDocs : model.recentOpenedDocs),
    [viewMode, model.uploadedDocs, model.recentOpenedDocs],
  );

  return (
    <section className="panel mydocs-page">
      <div className="mydocs-head">
        <div>
          <h2>{text.myDocumentsTitle}</h2>
          <p className="hint">
            {model.summary.total} {text.uploadedDocuments} - {model.recentOpenedDocs.length} {text.recentlyOpened}
          </p>
        </div>
        <button type="button" className="primary-btn" disabled={model.isBusy} onClick={controller.onUploadNew}>
          {text.uploadNew}
        </button>
      </div>

      <div className="mydocs-stat-grid">
        <article className="mydocs-stat-card"><p>{text.totalUploads}</p><b>{formatNumber(model.summary.total)}</b></article>
        <article className="mydocs-stat-card"><p>{text.totalViews}</p><b>{formatNumber(model.summary.totalViews)}</b></article>
        <article className="mydocs-stat-card"><p>{text.totalDownloads}</p><b>{formatNumber(model.summary.totalDownloads)}</b></article>
        <article className="mydocs-stat-card"><p>{text.totalLikes}</p><b>{formatNumber(model.summary.totalLikes)}</b></article>
      </div>

      <div className="mydocs-filter-row" role="tablist" aria-label={text.myDocumentsTitle}>
        {["uploaded", "recently"].map((key) => (
          <button
            key={key}
            type="button"
            className={viewMode === key ? "active" : ""}
            onClick={() => setViewMode(key)}
          >
            {key === "uploaded" ? text.uploaded : text.recently}
          </button>
        ))}
      </div>

      <section className="mydocs-section">
        <div className="mydocs-section-head">
          <h3>{viewMode === "uploaded" ? text.uploadedDocsTitle : text.recentDocsTitle}</h3>
          <small>{viewMode === "uploaded" ? text.uploadedDocsHint : text.recentDocsHint}</small>
        </div>
        <div className="mydocs-list">
          {displayedDocs.map((doc) => {
            const status = normalizeStatus(doc?.status);
            return (
              <article key={`${viewMode}-${doc.documentId}`} className="mydocs-item">
                <div className="mydocs-item-main">
                  <div className="mydocs-item-top">
                    <span className={`qa-status-badge ${status || "closed"}`}>{status || text.unknown}</span>
                    <small>
                      {doc?.categoryNames || doc?.categoryName || text.general} -{" "}
                      {formatDate(viewMode === "uploaded" ? doc?.createdAt : doc?.updatedAt || doc?.createdAt, text)}
                    </small>
                  </div>
                  <h3>{doc?.title || text.untitledDocument}</h3>
                  <p>{doc?.description || text.noDescription}</p>
                  <div className="mydocs-item-stats">
                    {viewMode === "recently" && (
                      <span>{text.owner}: {doc?.ownerName || doc?.authorName || "NeuShare"}</span>
                    )}
                    <span>{text.views}: {formatNumber(doc?.viewCount || doc?.views)}</span>
                    {viewMode === "uploaded" ? (
                      <span>{text.downloads}: {formatNumber(doc?.downloadCount || doc?.downloads)}</span>
                    ) : null}
                    <span>{text.likes}: {formatNumber(doc?.likeCount || doc?.likes)}</span>
                  </div>
                </div>
                <div className="mydocs-item-actions">
                  <button type="button" disabled={model.isBusy} onClick={() => controller.onOpenDoc(doc)}>
                    {text.open}
                  </button>
                  {doc?.fileUrl ? (
                    <a href={controller.resolveUrl(doc?.fileUrl)} target="_blank" rel="noreferrer">
                      {text.file}
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}

          {displayedDocs.length === 0 && (
            <div className="mydocs-empty">
              <h3>{viewMode === "uploaded" ? text.noUploadedDocuments : text.noRecentlyOpenedDocuments}</h3>
              <p>{viewMode === "uploaded" ? text.uploadFirstDocument : text.openAnyDocumentHint}</p>
              {viewMode === "uploaded" && (
                <button type="button" className="primary-btn" onClick={controller.onUploadNew}>
                  {text.uploadDocument}
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
