function formatDocDate(value) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "N/A";
  }
}

const FILE_ICON_BY_EXTENSION = {
  pdf: "/img/pdf.png",
  docx: "/img/docx.png",
};

function extractFileExtension(doc) {
  const candidates = [
    doc?.originalFileName,
    doc?.fileName,
    doc?.fileUrl,
    doc?.viewerUrl,
    doc?.downloadUrl,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  for (const value of candidates) {
    const cleanValue = value.split("?")[0].split("#")[0];
    const match = cleanValue.match(/\.([a-z0-9]+)$/i);
    if (match?.[1]) return String(match[1]).toLowerCase();
  }

  return "";
}

function getFileVisualMeta(doc) {
  const extension = extractFileExtension(doc);
  const normalized = extension === "doc" ? "docx" : extension;
  const iconSrc = FILE_ICON_BY_EXTENSION[normalized] || "";
  const label = normalized ? normalized.toUpperCase() : "FILE";
  return { extension: normalized, iconSrc, label };
}

function LibraryTabView(props) {
  const { model, controller } = props;
  const totalDocs = Array.isArray(model.myDocs) ? model.myDocs.length : 0;
  const approvedDocs = (model.myDocs || []).filter(
    (doc) => String(doc?.status || "").toLowerCase() === "approved",
  ).length;
  const pendingDocs = (model.myDocs || []).filter(
    (doc) => String(doc?.status || "").toLowerCase() === "pending",
  ).length;
  const reportedDocs = (model.myDocs || []).filter(
    (doc) => String(doc?.status || "").toLowerCase() === "reported",
  ).length;

  return (
    <section className="panel library-panel">
      <div className="library-head">
        <div>
          <h2>My Library</h2>
          <p className="hint">
            Manage your uploaded resources, monitor status, and open files quickly.
          </p>
        </div>
        <div className="library-metrics" aria-hidden="true">
          <div>
            <span>Total</span>
            <b>{totalDocs}</b>
          </div>
          <div>
            <span>Approved</span>
            <b>{approvedDocs}</b>
          </div>
          <div>
            <span>Pending</span>
            <b>{pendingDocs}</b>
          </div>
          <div>
            <span>Reported</span>
            <b>{reportedDocs}</b>
          </div>
        </div>
      </div>

      {model.isBusy && <p className="hint">Updating your library...</p>}
      {model.myDocs.length === 0 && !model.isBusy && (
        <p className="hint">You do not have uploaded documents yet.</p>
      )}

      <div className="library-grid">
        {model.myDocs.map((d) => {
          const status = String(d?.status || "unknown").toLowerCase();
          const fileVisual = getFileVisualMeta(d);
          return (
            <article key={d.documentId} className="reading-card library-doc-card">
              <button
                type="button"
                className="reading-thumb"
                disabled={model.isBusy}
                onClick={() => controller.onPreviewDoc(d)}
                title={`File type: ${fileVisual.label}`}
              >
                {fileVisual.iconSrc ? (
                  <img
                    className="reading-thumb-file-icon"
                    src={fileVisual.iconSrc}
                    alt={`${fileVisual.label} file`}
                    loading="lazy"
                  />
                ) : (
                  <span className="reading-thumb-file-label">{fileVisual.label}</span>
                )}
              </button>
              <div className="library-doc-main">
                <div className="library-doc-head">
                  <h3 title={d.title}>{d.title}</h3>
                  <span className={`qa-status-badge ${status}`}>{status}</span>
                </div>
                <p>{d.description || "Your uploaded material"}</p>
                <div className="library-doc-meta">
                  <span>Created: {formatDocDate(d.createdAt)}</span>
                  <span>Updated: {formatDocDate(d.updatedAt || d.createdAt)}</span>
                </div>
              </div>
              <div className="doc-actions">
                <button type="button" disabled={model.isBusy} onClick={() => controller.onPreviewDoc(d)}>
                  Preview
                </button>
                <a href={controller.resolveUrl(d.fileUrl)} target="_blank" rel="noreferrer">
                  Open file
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default LibraryTabView;
