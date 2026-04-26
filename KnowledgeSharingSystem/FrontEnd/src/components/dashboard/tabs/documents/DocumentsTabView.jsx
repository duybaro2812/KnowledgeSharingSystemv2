function formatTime(value) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "N/A";
  }
}

function DocumentsTabView(props) {
  const { model, controller } = props;

  if (!model.isModerator) {
    return (
      <section className="panel">
        <h2>Documents</h2>
        <p>No permission.</p>
      </section>
    );
  }

  return (
    <section className="panel documents-panel">
      <div className="moderation-header-row documents-head-row">
        <div>
          <h2>My Documents Workspace</h2>
          <p className="hint">
            Review and maintain all uploaded documents with fast moderation actions.
          </p>
        </div>
        <button type="button" disabled={model.isBusy} onClick={() => controller.onRefresh()}>
          Refresh documents
        </button>
      </div>

      <div className="moderation-dashboard-cards">
        <article className="moderation-dashboard-card">
          <span>Total documents</span>
          <b>{Number(model.summary?.total || 0)}</b>
        </article>
        <article className="moderation-dashboard-card">
          <span>Approved</span>
          <b>{Number(model.summary?.approved || 0)}</b>
        </article>
        <article className="moderation-dashboard-card">
          <span>Pending</span>
          <b>{Number(model.summary?.pending || 0)}</b>
        </article>
        <article className="moderation-dashboard-card">
          <span>Rejected</span>
          <b>{Number(model.summary?.rejected || 0)}</b>
        </article>
        <article className="moderation-dashboard-card">
          <span>Hidden</span>
          <b>{Number(model.summary?.hidden || 0)}</b>
        </article>
        <article className="moderation-dashboard-card">
          <span>Total downloads</span>
          <b>{Number(model.summary?.downloads || 0)}</b>
        </article>
      </div>

      <h3>Document list</h3>
      {model.documents.length === 0 ? (
        <p className="hint">No documents found.</p>
      ) : (
        <div className="moderation-list documents-list">
          {model.documents.map((doc) => {
            const status = String(doc?.status || "").toLowerCase();
            const isPending = status === "pending";
            return (
              <article key={doc.documentId} className="moderation-item">
                <div className="documents-item-head">
                  <h3>
                    #{doc.documentId} - {doc.title || "Untitled document"}
                  </h3>
                  <span className={`qa-status-badge ${status}`}>{status || "unknown"}</span>
                </div>
                <div className="documents-item-meta">
                  <p>
                    Owner: <b>{doc.ownerName || "Unknown"}</b>
                  </p>
                  <p>
                    Course: <b>{doc.categoryNames || "N/A"}</b>
                  </p>
                  <p>
                    Updated: <b>{formatTime(doc.updatedAt || doc.createdAt)}</b>
                  </p>
                </div>
                <div className="action-row">
                  <button type="button" disabled={model.isBusy} onClick={() => controller.onOpenPreview(doc)}>
                    Open
                  </button>
                  <button type="button" disabled={model.isBusy} onClick={() => controller.onCheckDuplicate(doc.documentId)}>
                    Check duplicate
                  </button>
                  {isPending && (
                    <>
                      <button type="button" disabled={model.isBusy} onClick={() => controller.onApprove(doc.documentId)}>
                        Approve
                      </button>
                      <button type="button" className="danger" disabled={model.isBusy} onClick={() => controller.onReject(doc.documentId)}>
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="danger"
                    disabled={model.isBusy}
                    onClick={() => {
                      const ok = window.confirm(`Delete document #${doc.documentId}?`);
                      if (ok) controller.onDelete(doc.documentId);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default DocumentsTabView;
