function ModerationTabView(props) {
  const { model, controller } = props;

  return (
    <section className="panel">
      <h2>Moderation queue</h2>
      {!model.isModerator ? <p>No permission.</p> : (
        <>
          <div className="moderation-subhead">
            <h3>Reported documents</h3>
            <p>Auto-locked documents with active report signals.</p>
          </div>

          {model.reportedDocs.length === 0 ? (
            <p className="subtle-text">No active reported documents.</p>
          ) : (
            <div className="moderation-list">
              {model.reportedDocs.map((d) => (
                <article key={`reported-${d.documentId}`} className="moderation-item report-item">
                  <h3>
                    #{d.documentId} - {d.title}
                  </h3>
                  <p>
                    Owner: {d.ownerName} ({d.ownerEmail})
                  </p>
                  <p>
                    Reports: <b>{d.totalReports || 0}</b> | Unique reporters:{" "}
                    <b>{d.uniqueReporterCount || 0}</b>
                  </p>
                  {d.latestReportReason && <p>Latest reason: {d.latestReportReason}</p>}
                  <p>
                    File:{" "}
                    <button type="button" onClick={() => controller.onOpenPreview(d)}>
                      Open for review
                    </button>
                  </p>
                  <div className="action-row">
                    <button onClick={() => controller.onResolveReportedUnlock(d.documentId)}>
                      Unlock
                    </button>
                    <button className="danger" onClick={() => controller.onResolveReportedDelete(d.documentId)}>
                      Delete + Penalty
                    </button>
                    <button onClick={() => controller.onCheckDuplicate(d.documentId)}>
                      Check duplicate
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

          <div className="moderation-subhead">
            <h3>Pending uploads</h3>
            <p>Approve or reject normal pending submissions.</p>
          </div>

          {model.pendingDocs.length === 0 ? (
            <p className="subtle-text">No pending documents.</p>
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

          <div className="moderation-subhead">
            <h3>Pending point events</h3>
            <p>Approve/reject point rewards and deductions created by system events.</p>
          </div>

          {model.pendingPointEvents.length === 0 ? (
            <p className="subtle-text">No pending point events.</p>
          ) : (
            <div className="moderation-list">
              {model.pendingPointEvents.map((event) => (
                <article key={`point-event-${event.eventId}`} className="moderation-item">
                  <h3>
                    Event #{event.eventId} - {event.eventType}
                  </h3>
                  <p>
                    User: #{event.userId} {event.userName ? `- ${event.userName}` : ""}
                  </p>
                  <p>
                    Suggested points: <b>{event.points}</b>
                  </p>
                  <p>Status: {event.status}</p>
                  {event.documentId && <p>Document: #{event.documentId}</p>}
                  {event.qaSessionId && <p>Q&A session: #{event.qaSessionId}</p>}
                  <div className="action-row">
                    <button onClick={() => controller.onApprovePointEvent(event.eventId)}>
                      Approve points
                    </button>
                    <button className="danger" onClick={() => controller.onRejectPointEvent(event.eventId)}>
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default ModerationTabView;
