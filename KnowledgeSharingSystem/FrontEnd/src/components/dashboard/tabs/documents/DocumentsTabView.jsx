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
    <section className="panel">
      <div className="moderation-header-row">
        <h2>Documents workspace</h2>
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
        <div className="moderation-list">
          {model.documents.map((doc) => {
            const status = String(doc?.status || "").toLowerCase();
            const isPending = status === "pending";
            return (
              <article key={doc.documentId} className="moderation-item">
                <h3>
                  #{doc.documentId} - {doc.title || "Untitled document"}
                </h3>
                <p>
                  Owner: <b>{doc.ownerName || "Unknown"}</b> · Status: <b>{status || "unknown"}</b>
                </p>
                <p>
                  Course: <b>{doc.categoryNames || "N/A"}</b>
                </p>
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

