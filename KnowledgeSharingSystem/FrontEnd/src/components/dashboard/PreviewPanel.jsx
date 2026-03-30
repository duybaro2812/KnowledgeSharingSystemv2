function PreviewPanel(props) {
  const { previewDoc, setPreviewDoc } = props;

  if (!previewDoc) return null;

  return (
    <section className="panel preview-panel">
      <div className="preview-head">
        <div>
          <h2>Document reader</h2>
          <p>
            {previewDoc.title} ({previewDoc.originalFileName})
          </p>
        </div>
        <div className="preview-head-actions">
          <a href={previewDoc.fileUrl} target="_blank" rel="noreferrer">
            Open in new tab
          </a>
          {!!previewDoc.fallbackPreviewUrls?.length && (
            <button
              type="button"
              onClick={() =>
                setPreviewDoc((prev) => {
                  if (!prev?.fallbackPreviewUrls?.length) return prev;
                  const [nextUrl, ...remaining] = prev.fallbackPreviewUrls;
                  return {
                    ...prev,
                    previewUrl: nextUrl,
                    fallbackPreviewUrls: [...remaining, prev.previewUrl],
                  };
                })
              }
            >
              Switch viewer
            </button>
          )}
          <button type="button" onClick={() => setPreviewDoc(null)}>
            Close
          </button>
        </div>
      </div>
      <div className="preview-frame-wrap">
        {previewDoc.previewUrl ? (
          <iframe
            title={`preview-${previewDoc.title}`}
            src={previewDoc.previewUrl}
            className="preview-frame"
          />
        ) : (
          <p>{previewDoc.previewReason || "No preview available for this file type."}</p>
        )}
      </div>
      <p className="hint">
        If your document is local-only or blocked by remote viewer policy, use
        "Open in new tab".
      </p>
    </section>
  );
}

export default PreviewPanel;
