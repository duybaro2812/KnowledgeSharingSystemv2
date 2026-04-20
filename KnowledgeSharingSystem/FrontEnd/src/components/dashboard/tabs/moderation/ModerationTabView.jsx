import { useMemo, useState } from "react";

function ModerationTabView(props) {
  const { model, controller } = props;
  const [commentNoteById, setCommentNoteById] = useState({});
  const [pointNoteByEventId, setPointNoteByEventId] = useState({});
  const [pointDeltaByEventId, setPointDeltaByEventId] = useState({});
  const controlsDisabled = Boolean(model.isBusy);

  const focus = model.moderationFocus || {};
  const focusedCommentId = Number(focus.commentId || 0);
  const focusedDocumentId = Number(focus.documentId || 0);
  const focusedQaSessionId = Number(focus.qaSessionId || 0);
  const focusedPointEventId = Number(focus.pointEventId || 0);

  const prioritizedComments = useMemo(() => {
    const source = Array.isArray(model.pendingComments) ? model.pendingComments : [];
    if (!focusedCommentId && !focusedDocumentId) return source;
    return [...source].sort((a, b) => {
      const aScore =
        Number(a.commentId) === focusedCommentId
          ? 100
          : Number(a.documentId) === focusedDocumentId
            ? 10
            : 0;
      const bScore =
        Number(b.commentId) === focusedCommentId
          ? 100
          : Number(b.documentId) === focusedDocumentId
            ? 10
            : 0;
      return bScore - aScore;
    });
  }, [model.pendingComments, focusedCommentId, focusedDocumentId]);

  const prioritizedQaRatings = useMemo(() => {
    const source = Array.isArray(model.qaRatingEvents) ? model.qaRatingEvents : [];
    if (!focusedQaSessionId && !focusedPointEventId) return source;
    return [...source].sort((a, b) => {
      const aScore =
        Number(a.eventId) === focusedPointEventId
          ? 100
          : Number(a.qaSessionId) === focusedQaSessionId
            ? 10
            : 0;
      const bScore =
        Number(b.eventId) === focusedPointEventId
          ? 100
          : Number(b.qaSessionId) === focusedQaSessionId
            ? 10
            : 0;
      return bScore - aScore;
    });
  }, [model.qaRatingEvents, focusedQaSessionId, focusedPointEventId]);

  if (!model.isModerator) {
    return (
      <section className="panel">
        <h2>Moderation queue</h2>
        <p>No permission.</p>
      </section>
    );
  }

  return (
    <section className="panel moderation-panel">
      <div className="moderation-header-row">
        <h2>Moderation queue</h2>
        <button type="button" disabled={controlsDisabled} onClick={() => controller.onRefreshOverview()}>
          Refresh overview
        </button>
      </div>
      {controlsDisabled && <p className="hint">Processing moderation action...</p>}

      <div className="moderation-dashboard-cards">
        <article className="moderation-dashboard-card">
          <span>Pending documents</span>
          <b>{Number(model.queueSummary?.pendingDocs || 0)}</b>
        </article>
        <article className="moderation-dashboard-card">
          <span>Pending comments</span>
          <b>{Number(model.queueSummary?.pendingComments || 0)}</b>
        </article>
        <article className="moderation-dashboard-card">
          <span>Pending reports</span>
          <b>{Number(model.queueSummary?.pendingReports || 0)}</b>
        </article>
        <article className="moderation-dashboard-card">
          <span>Pending point events</span>
          <b>{Number(model.queueSummary?.pendingPointEvents || 0)}</b>
        </article>
        <article className="moderation-dashboard-card">
          <span>Locked documents</span>
          <b>{Number(model.moderationStats?.lockedDocuments || 0)}</b>
        </article>
        <article className="moderation-dashboard-card">
          <span>Total downloads</span>
          <b>{Number(model.moderationStats?.totalDownloads || 0)}</b>
        </article>
      </div>

      {Array.isArray(model.moderationTimeline) && model.moderationTimeline.length > 0 && (
        <div className="moderation-timeline-box">
          <div className="moderation-subhead">
            <h3>Recent moderation timeline</h3>
            <p>Latest admin/moderator actions across report, comment, point, and plagiarism workflows.</p>
          </div>
          <ul className="moderation-timeline-list">
            {model.moderationTimeline.slice(0, 8).map((item) => (
              <li key={`${item.source}-${item.sourceId}`}>
                <b>{item.actorName || "Moderator"}</b> · {item.action} · {item.source}
                {item.targetName ? ` · ${item.targetName}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="moderation-subhead">
        <h3>Comment review with quick point scoring</h3>
        <p>
          Click from notification to land here, review the comment, then approve/reject comment and point
          events in one place.
        </p>
      </div>

      {prioritizedComments.length === 0 ? (
        <p className="subtle-text">No pending comments.</p>
      ) : (
        <div className="moderation-list">
          {prioritizedComments.map((comment) => {
            const linkedPointEvents =
              model.commentPointEventsByCommentId?.[Number(comment.commentId)] || [];
            const isFocused =
              Number(comment.commentId) === focusedCommentId ||
              (focusedCommentId <= 0 &&
                focusedDocumentId > 0 &&
                Number(comment.documentId) === focusedDocumentId);

            return (
              <article
                key={`pending-comment-${comment.commentId}`}
                className={`moderation-item moderation-comment-item ${isFocused ? "is-focused" : ""}`}
              >
                <h3>
                  Comment #{comment.commentId} {isFocused ? "• From notification" : ""}
                </h3>
                <p>
                  Document #{comment.documentId}: <b>{comment.documentTitle}</b>
                </p>
                <p>
                  Author: <b>{comment.authorName}</b>
                </p>
                <p className="moderation-comment-content">{comment.content}</p>
                <div className="action-row">
                  <button
                    type="button"
                    disabled={controlsDisabled}
                    onClick={() =>
                      controller.onOpenPreview({
                        documentId: comment.documentId,
                        title: comment.documentTitle,
                      })
                    }
                  >
                    Open document
                  </button>
                  <button
                    type="button"
                    disabled={controlsDisabled}
                    onClick={() =>
                      controller.onApproveComment(comment.commentId, commentNoteById[comment.commentId] || "")
                    }
                  >
                    Approve comment
                  </button>
                  <button
                    type="button"
                    className="danger"
                    disabled={controlsDisabled}
                    onClick={() =>
                      controller.onRejectComment(comment.commentId, commentNoteById[comment.commentId] || "")
                    }
                  >
                    Reject comment
                  </button>
                  <button
                    type="button"
                    className="danger"
                    disabled={controlsDisabled}
                    onClick={() => controller.onHideComment(comment.commentId, comment.documentId)}
                  >
                    Hide comment
                  </button>
                </div>

                <textarea
                  className="moderation-note-input"
                  rows={2}
                  placeholder="Review note for comment (required when reject)"
                  value={commentNoteById[comment.commentId] || ""}
                  disabled={controlsDisabled}
                  onChange={(event) =>
                    setCommentNoteById((prev) => ({
                      ...prev,
                      [comment.commentId]: event.target.value,
                    }))
                  }
                />

                {linkedPointEvents.length > 0 && (
                  <div className="moderation-linked-events">
                    <h4>Point events generated from this comment</h4>
                    {linkedPointEvents.map((event) => (
                      <div
                        key={`comment-event-${event.eventId}`}
                        className={`moderation-inline-event ${
                          Number(event.eventId) === focusedPointEventId ? "is-focused" : ""
                        }`}
                      >
                        <p>
                          Event #{event.eventId} • <b>{event.eventType}</b> • Suggested points:{" "}
                          <b>{event.points}</b>
                        </p>
                        <div className="moderation-inline-controls">
                          <input
                            type="number"
                            placeholder={String(event.points || 0)}
                            value={pointDeltaByEventId[event.eventId] ?? ""}
                            disabled={controlsDisabled}
                            onChange={(inputEvent) =>
                              setPointDeltaByEventId((prev) => ({
                                ...prev,
                                [event.eventId]: inputEvent.target.value,
                              }))
                            }
                          />
                          <input
                            type="text"
                            placeholder="Review note"
                            value={pointNoteByEventId[event.eventId] || ""}
                            disabled={controlsDisabled}
                            onChange={(inputEvent) =>
                              setPointNoteByEventId((prev) => ({
                                ...prev,
                                [event.eventId]: inputEvent.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            disabled={controlsDisabled}
                            onClick={() =>
                              controller.onApprovePointEventInline(
                                event.eventId,
                                pointDeltaByEventId[event.eventId],
                                pointNoteByEventId[event.eventId] || "",
                              )
                            }
                          >
                            Approve points
                          </button>
                          <button
                            type="button"
                            className="danger"
                            disabled={controlsDisabled}
                            onClick={() =>
                              controller.onRejectPointEventInline(
                                event.eventId,
                                pointNoteByEventId[event.eventId] || "",
                              )
                            }
                          >
                            Reject points
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <div className="moderation-subhead">
        <h3>Q&A rating review</h3>
        <p>Click rating notification to open this card, then decide point reward for the owner.</p>
      </div>

      {prioritizedQaRatings.length === 0 ? (
        <p className="subtle-text">No pending Q&A rating events.</p>
      ) : (
        <div className="moderation-list">
          {prioritizedQaRatings.map((event) => {
            const meta = event.metadataJson || {};
            const stars = Number(meta.stars || 0);
            const feedback = String(meta.feedback || "").trim();
            const isFocused =
              Number(event.eventId) === focusedPointEventId ||
              (focusedPointEventId <= 0 &&
                focusedQaSessionId > 0 &&
                Number(event.qaSessionId) === focusedQaSessionId);

            return (
              <article
                key={`qa-rating-event-${event.eventId}`}
                className={`moderation-item moderation-rating-item ${isFocused ? "is-focused" : ""}`}
              >
                <h3>
                  Session #{event.qaSessionId} rating {isFocused ? "• From notification" : ""}
                </h3>
                <p>
                  Event #{event.eventId} • Owner user #{event.userId} {event.userName ? `- ${event.userName}` : ""}
                </p>
                <p>
                  Rating: <b>{stars > 0 ? `${stars}/5` : "N/A"}</b>
                </p>
                <p>
                  Feedback: <b>{feedback || "No feedback text."}</b>
                </p>
                <p>
                  Suggested points: <b>{event.points}</b>
                </p>
                <div className="moderation-inline-controls">
                  <input
                    type="number"
                    placeholder={String(event.points || 0)}
                    value={pointDeltaByEventId[event.eventId] ?? ""}
                    disabled={controlsDisabled}
                    onChange={(inputEvent) =>
                      setPointDeltaByEventId((prev) => ({
                        ...prev,
                        [event.eventId]: inputEvent.target.value,
                      }))
                    }
                  />
                  <input
                    type="text"
                    placeholder="Moderator evaluation note"
                    value={pointNoteByEventId[event.eventId] || ""}
                    disabled={controlsDisabled}
                    onChange={(inputEvent) =>
                      setPointNoteByEventId((prev) => ({
                        ...prev,
                        [event.eventId]: inputEvent.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    disabled={controlsDisabled}
                    onClick={() =>
                      controller.onApprovePointEventInline(
                        event.eventId,
                        pointDeltaByEventId[event.eventId],
                        pointNoteByEventId[event.eventId] || "",
                      )
                    }
                  >
                    Approve points
                  </button>
                  <button
                    type="button"
                    className="danger"
                    disabled={controlsDisabled}
                    onClick={() =>
                      controller.onRejectPointEventInline(
                        event.eventId,
                        pointNoteByEventId[event.eventId] || "",
                      )
                    }
                  >
                    Reject
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

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
                <button type="button" disabled={controlsDisabled} onClick={() => controller.onOpenPreview(d)}>
                  Open for review
                </button>
              </p>
              <div className="action-row">
                <button disabled={controlsDisabled} onClick={() => controller.onResolveReportedUnlock(d.documentId)}>Unlock</button>
                <button
                  className="danger"
                  disabled={controlsDisabled}
                  onClick={() => controller.onResolveReportedDelete(d.documentId)}
                >
                  Delete + Penalty
                </button>
                <button disabled={controlsDisabled} onClick={() => controller.onCheckDuplicate(d.documentId)}>Check duplicate</button>
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
                <button type="button" disabled={controlsDisabled} onClick={() => controller.onOpenPreview(d)}>
                  Open for review
                </button>
              </p>
              <div className="action-row">
                <button disabled={controlsDisabled} onClick={() => controller.onCheckDuplicate(d.documentId)}>Check duplicate</button>
                <button disabled={controlsDisabled} onClick={() => controller.onApprove(d.documentId)}>Approve</button>
                <button disabled={controlsDisabled} onClick={() => controller.onReject(d.documentId)}>Reject</button>
                <button disabled={controlsDisabled} onClick={() => controller.onLock(d.documentId)}>Lock</button>
                <button disabled={controlsDisabled} onClick={() => controller.onUnlock(d.documentId)}>Unlock</button>
                <button className="danger" disabled={controlsDisabled} onClick={() => controller.onDelete(d.documentId)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default ModerationTabView;
