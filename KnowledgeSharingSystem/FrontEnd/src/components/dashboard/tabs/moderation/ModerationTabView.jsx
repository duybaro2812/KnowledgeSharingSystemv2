function ModerationTabView(props) {
  const { model, controller } = props;

  return (
    <section className="panel">
      <h2>Moderation queue</h2>
      {!model.isModerator ? (
        <p>No permission.</p>
      ) : model.pendingDocs.length === 0 ? (
        <p>No pending documents.</p>
      ) : (
        <div className="moderation-list">
          {model.pendingDocs.map((d) => (
            <article key={d.documentId} className="moderation-item">
              <h3>
                #{d.documentId} - {d.title}
              </h3>
              <p>
                Owner: {d.ownerName} ({d.ownerEmail})
              </p>
              <p>
                File:{" "}
                <button type="button" onClick={() => controller.onOpenPreview(d)}>
                  Open for review
                </button>
              </p>
              <div className="action-row">
                <button onClick={() => controller.onCheckDuplicate(d.documentId)}>
                  Check duplicate
                </button>
                <button onClick={() => controller.onApprove(d.documentId)}>Approve</button>
                <button onClick={() => controller.onReject(d.documentId)}>Reject</button>
                <button onClick={() => controller.onLock(d.documentId)}>Lock</button>
                <button onClick={() => controller.onUnlock(d.documentId)}>Unlock</button>
                <button className="danger" onClick={() => controller.onDelete(d.documentId)}>
                  Delete
                </button>
              </div>
              {model.duplicateByDocId[d.documentId] && (
                <div className="duplicates-box">
                  {model.duplicateByDocId[d.documentId].length === 0 ? (
                    <p>No duplicate found.</p>
                  ) : (
                    <ul>
                      {model.duplicateByDocId[d.documentId].map((dup) => (
                        <li key={`${d.documentId}-${dup.documentId}`}>
                          #{dup.documentId} - {dup.title} ({dup.duplicateReason})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default ModerationTabView;
