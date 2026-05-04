import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import ThemeToggle from './ThemeToggle.jsx';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const FIELD_LABELS = {
  seller_gstin: 'Seller GSTIN',
  seller_name: 'Seller Name',
  buyer_gstin: 'Buyer GSTIN',
  buyer_name: 'Buyer Name',
  invoice_number: 'Invoice Number',
  invoice_date: 'Invoice Date',
  place_of_supply: 'Place of Supply',
  taxable_value: 'Taxable Value',
  cgst: 'CGST',
  sgst: 'SGST',
  igst: 'IGST',
  total_value: 'Total Value',
};

function parseJobResult(json) {
  if (!json) return null;

  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function formatRawJson(json) {
  if (!json) return '';

  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

function getFileType(path) {
  if (!path) return 'unknown';
  const ext = path.split('.').pop()?.toLowerCase();

  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) return 'image';
  return 'unknown';
}

function formatLabel(key) {
  return (
    FIELD_LABELS[key] ||
    key
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  );
}

function getExtractedFields(result) {
  if (!result || typeof result !== 'object') return [];

  return Object.entries(result)
    .filter(([, field]) => field && typeof field === 'object' && 'value' in field)
    .map(([key, field]) => ({
      key,
      label: formatLabel(key),
      value: field.value,
      confidence: typeof field.confidence_value === 'number' ? field.confidence_value : null,
      bbox: field.bbox_value || null,
      page: field.value_location?.page || 1,
      location: field.value_location || null,
    }))
    .filter((field) => field.value);
}

function getConfidenceTone(confidence) {
  if (typeof confidence !== 'number') return 'unknown';
  if (confidence >= 0.9) return 'high';
  if (confidence >= 0.75) return 'medium';
  return 'low';
}

function hasUsableBbox(bbox) {
  if (!bbox) return false;
  return [bbox.xMin, bbox.yMin, bbox.xMax, bbox.yMax].every((value) => typeof value === 'number');
}

function scaleBboxToRenderedSize(bbox, pageInfo, renderedSize) {
  if (!hasUsableBbox(bbox)) return null;
  if (!pageInfo?.width || !pageInfo?.height || !renderedSize.width || !renderedSize.height) {
    return bbox;
  }

  const scaleX = renderedSize.width / pageInfo.width;
  const scaleY = renderedSize.height / pageInfo.height;

  return {
    xMin: bbox.xMin * scaleX,
    yMin: bbox.yMin * scaleY,
    xMax: bbox.xMax * scaleX,
    yMax: bbox.yMax * scaleY,
  };
}

function mergeWordBoxesForLocation(location, pageInfo) {
  if (!location || !pageInfo?.words?.length) return null;

  const startIndex = location.start_word_index;
  const endIndex = location.end_word_index;
  if (!Number.isInteger(startIndex) || !Number.isInteger(endIndex) || startIndex < 0 || endIndex < startIndex) {
    return null;
  }

  const selectedWords = pageInfo.words.slice(startIndex, endIndex + 1).filter((word) => word);
  if (!selectedWords.length) return null;

  let xMin = Number.POSITIVE_INFINITY;
  let yMin = Number.POSITIVE_INFINITY;
  let xMax = Number.NEGATIVE_INFINITY;
  let yMax = Number.NEGATIVE_INFINITY;
  let usableCount = 0;

  selectedWords.forEach((word) => {
    if (!hasUsableBbox(word)) return;
    xMin = Math.min(xMin, word.xMin);
    yMin = Math.min(yMin, word.yMin);
    xMax = Math.max(xMax, word.xMax);
    yMax = Math.max(yMax, word.yMax);
    usableCount += 1;
  });

  if (!usableCount) return null;

  return { xMin, yMin, xMax, yMax };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getStageTransform(viewportSize, contentSize, bbox) {
  if (!viewportSize.width || !viewportSize.height || !contentSize.width || !contentSize.height || !hasUsableBbox(bbox)) {
    return {
      scale: 1,
      translateX: 0,
      translateY: 0,
    };
  }

  const bboxWidth = Math.max(bbox.xMax - bbox.xMin, 28);
  const bboxHeight = Math.max(bbox.yMax - bbox.yMin, 20);
  const bboxCenterX = bbox.xMin + bboxWidth / 2;
  const bboxCenterY = bbox.yMin + bboxHeight / 2;

  const zoomX = viewportSize.width / (bboxWidth * 2.5);
  const zoomY = viewportSize.height / (bboxHeight * 2.5);
  const scale = clamp(Math.min(zoomX, zoomY), 1, 2.8);
  const translateX = viewportSize.width / 2 - bboxCenterX * scale;
  const translateY = viewportSize.height / 2 - bboxCenterY * scale;
  const minX = viewportSize.width - contentSize.width * scale;
  const minY = viewportSize.height - contentSize.height * scale;

  return {
    scale,
    translateX: clamp(translateX, minX, 0),
    translateY: clamp(translateY, minY, 0),
  };
}

function JobDetail({ auth, api, onLogout, theme, onThemeToggle }) {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [activeFieldKey, setActiveFieldKey] = useState('');
  const [activePage, setActivePage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [showRawJson, setShowRawJson] = useState(false);
  const [ocrPages, setOcrPages] = useState([]);
  const [pdfPageSize, setPdfPageSize] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [viewerSize, setViewerSize] = useState({ width: 0, height: 0 });
  const navigate = useNavigate();
  const viewerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.getJob(id, auth.accessToken),
      api.getJobs(auth.accessToken),
      api.getJobOcrPages(id, auth.accessToken).catch(() => []),
    ])
      .then(([jobResult, jobsResult, ocrPagesResult]) => {
        if (!cancelled) {
          setJob(jobResult);
          setJobs(jobsResult);
          setOcrPages(ocrPagesResult);
          setError('');
        }
      })
      .catch((nextError) => {
        if (!cancelled) setError(nextError.message);
      });

    return () => {
      cancelled = true;
    };
  }, [api, auth.accessToken, id]);

  const currentIndex = useMemo(
    () => jobs.findIndex((item) => String(item.uploadId) === String(id)),
    [id, jobs],
  );

  const previousJob = useMemo(() => {
    if (currentIndex === -1) return null;
    return jobs[currentIndex - 1] || null;
  }, [currentIndex, jobs]);

  const nextJob = useMemo(() => {
    if (currentIndex === -1) return null;
    return jobs[currentIndex + 1] || null;
  }, [currentIndex, jobs]);

  useEffect(() => {
    if (!job?.uploadId) {
      setPreviewUrl('');
      return undefined;
    }

    let disposed = false;
    let objectUrl = '';

    api
      .getFileBlob(job.uploadId, auth.accessToken)
      .then((blob) => {
        if (disposed) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (!disposed) setPreviewUrl('');
      });

    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [api, auth.accessToken, job]);

  useEffect(() => {
    if (!viewerRef.current) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setViewerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(viewerRef.current);

    return () => observer.disconnect();
  }, []);

  const result = useMemo(() => parseJobResult(job?.resultJson), [job?.resultJson]);
  const rawJson = useMemo(() => formatRawJson(job?.resultJson), [job?.resultJson]);
  const extractedFields = useMemo(() => getExtractedFields(result), [result]);

  useEffect(() => {
    if (!extractedFields.length) {
      setActiveFieldKey('');
      return;
    }

    setActiveFieldKey((currentKey) =>
      currentKey && extractedFields.some((field) => field.key === currentKey) ? currentKey : '',
    );
  }, [extractedFields]);

  const activeField = useMemo(
    () => extractedFields.find((field) => field.key === activeFieldKey) || null,
    [activeFieldKey, extractedFields],
  );

  useEffect(() => {
    if (activeField?.page) {
      setActivePage(activeField.page);
    }
  }, [activeField]);

  useEffect(() => {
    setPageCount(1);
    setPdfPageSize({ width: 0, height: 0 });
    setImageSize({ width: 0, height: 0 });
  }, [previewUrl]);

  const fileType = getFileType(job?.filePath || job?.fileName);

  useEffect(() => {
    if (fileType !== 'pdf' || !previewUrl || !canvasRef.current) return undefined;

    let disposed = false;
    let renderTask = null;
    let pdfDocument = null;

    async function renderPdfPage() {
      try {
        const loadingTask = pdfjsLib.getDocument(previewUrl);
        pdfDocument = await loadingTask.promise;
        if (disposed) {
          await pdfDocument.destroy();
          return;
        }

        setPageCount(pdfDocument.numPages);
        const pageNumber = clamp(activePage, 1, pdfDocument.numPages);
        if (pageNumber !== activePage) {
          setActivePage(pageNumber);
        }

        const page = await pdfDocument.getPage(pageNumber);
        if (disposed) return;

        const viewport = page.getViewport({ scale: 1.6 });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        setPdfPageSize({ width: viewport.width, height: viewport.height });

        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;
      } catch (nextError) {
        if (!disposed) {
          setError(nextError.message || 'Unable to render PDF preview');
        }
      }
    }

    renderPdfPage();

    return () => {
      disposed = true;
      if (renderTask) {
        renderTask.cancel();
      }
      if (pdfDocument) {
        pdfDocument.destroy();
      }
    };
  }, [activePage, fileType, previewUrl]);

  const activePageInfo = useMemo(
    () => ocrPages.find((page) => page.pageNumber === activePage) || null,
    [activePage, ocrPages],
  );
  const activeBbox = useMemo(() => {
    if (!activeField || activeField.page !== activePage) return null;
    return mergeWordBoxesForLocation(activeField.location, activePageInfo) || activeField.bbox || null;
  }, [activeField, activePage, activePageInfo]);
  const contentSize = fileType === 'pdf' ? pdfPageSize : imageSize;
  const renderedActiveBbox = scaleBboxToRenderedSize(activeBbox, activePageInfo, contentSize);
  const stageTransform = getStageTransform(viewerSize, contentSize, renderedActiveBbox);

  return (
    <div className="screen app-screen">
      <div className="bg-orb bg-orb-a" />
      <div className="bg-orb bg-orb-b" />

      <div className="shell">
        <aside className="sidebar card">
          <div className="brand">
            <span className="brand-mark">IF</span>
            <div>
              <strong>InvoiceFlow</strong>
              <p>{auth.username}</p>
            </div>
          </div>

          <nav className="nav-stack">
            <Link className="nav-link active" to="/jobs">
              Jobs
            </Link>
          </nav>

          <ThemeToggle theme={theme} onToggle={onThemeToggle} />
          <div className="sidebar-spacer" />
          <button className="ghost-button" type="button" onClick={onLogout}>
            Sign out
          </button>
        </aside>

        <main className="content">
          <header className="page-header detail-page-header">
            <div className="detail-page-title">
              <div>
                <span className="eyebrow">Job detail</span>
                <h1>{job?.fileName || `Upload #${id}`}</h1>
              </div>
            </div>
            <Link className="secondary-button button-link" to="/jobs">
              Back to jobs
            </Link>
          </header>

          {error && <p className="notice error">{error}</p>}

          {!job ? (
            <section className="card detail-layout">
              <div className="empty-state">Loading job...</div>
            </section>
          ) : (
            <section className="detail-layout detail-layout-wide">
              <div className="card detail-panel detail-preview-panel">
                <div className="detail-panel-header">
                  <div>
                    <h3>Uploaded file</h3>
                    <p className="detail-subcopy">
                      Hover an extracted value to zoom to its location in the document.
                    </p>
                  </div>

                  {fileType === 'pdf' && pageCount > 1 && (
                    <div className="page-pill">
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => setActivePage((page) => clamp(page - 1, 1, pageCount))}
                      >
                        -
                      </button>
                      <span>
                        Page {activePage} / {pageCount}
                      </span>
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => setActivePage((page) => clamp(page + 1, 1, pageCount))}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                {fileType === 'pdf' && previewUrl && (
                  <div ref={viewerRef} className="document-viewer">
                    <div
                      className="document-stage"
                      style={{
                        width: pdfPageSize.width || '100%',
                        height: pdfPageSize.height || '100%',
                        transform: `translate(${stageTransform.translateX}px, ${stageTransform.translateY}px) scale(${stageTransform.scale})`,
                      }}
                    >
                      <canvas ref={canvasRef} className="pdf-canvas" />
                      {hasUsableBbox(renderedActiveBbox) && (
                        <div
                          className={`bbox-highlight confidence-${getConfidenceTone(activeField?.confidence)}`}
                          style={{
                            left: renderedActiveBbox.xMin,
                            top: renderedActiveBbox.yMin,
                            width: renderedActiveBbox.xMax - renderedActiveBbox.xMin,
                            height: renderedActiveBbox.yMax - renderedActiveBbox.yMin,
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {fileType === 'image' && previewUrl && (
                  <div ref={viewerRef} className="document-viewer">
                    <div
                      className="document-stage"
                      style={{
                        width: imageSize.width || '100%',
                        height: imageSize.height || '100%',
                        transform: `translate(${stageTransform.translateX}px, ${stageTransform.translateY}px) scale(${stageTransform.scale})`,
                      }}
                    >
                      <img
                        src={previewUrl}
                        alt="preview"
                        className="image-stage"
                        onLoad={(event) => {
                          const image = event.currentTarget;
                          setImageSize({
                            width: image.naturalWidth,
                            height: image.naturalHeight,
                          });
                        }}
                      />
                      {hasUsableBbox(renderedActiveBbox) && (
                        <div
                          className={`bbox-highlight confidence-${getConfidenceTone(activeField?.confidence)}`}
                          style={{
                            left: renderedActiveBbox.xMin,
                            top: renderedActiveBbox.yMin,
                            width: renderedActiveBbox.xMax - renderedActiveBbox.xMin,
                            height: renderedActiveBbox.yMax - renderedActiveBbox.yMin,
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {fileType === 'unknown' && (
                  <div className="preview-placeholder">Unsupported file type</div>
                )}

                {!previewUrl && fileType !== 'unknown' && (
                  <div className="preview-placeholder">Loading file preview...</div>
                )}
              </div>

              <div className="card detail-panel detail-data-panel">
                <div className="detail-meta">
                  <span className={`status-pill status-${String(job.status).toLowerCase()}`}>
                    {job.status}
                  </span>
                </div>

                <div className="detail-panel-header detail-data-header">
                  <h3>Extracted data</h3>
                  {job.resultJson && (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => setShowRawJson((value) => !value)}
                    >
                      {showRawJson ? 'Show fields' : 'View full JSON'}
                    </button>
                  )}
                </div>

                {showRawJson ? (
                  <pre className="json-view">{rawJson}</pre>
                ) : extractedFields.length ? (
                  <div className="field-list" onMouseLeave={() => setActiveFieldKey('')}>
                    {extractedFields.map((field) => {
                      const tone = getConfidenceTone(field.confidence);
                      const isActive = field.key === activeFieldKey;

                      return (
                        <button
                          key={field.key}
                          className={`field-row confidence-${tone} ${isActive ? 'active' : ''}`}
                          type="button"
                          onMouseEnter={() => setActiveFieldKey(field.key)}
                          onFocus={() => setActiveFieldKey(field.key)}
                        >
                          <span className="field-label">{field.label}</span>
                          <span className="field-value">{field.value}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="preview-placeholder">Processing...</div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      {(previousJob || nextJob) && (
        <div className="floating-job-nav">
          {previousJob && (
            <button
              className="floating-nav-button secondary"
              type="button"
              onClick={() => navigate(`/jobs/${previousJob.uploadId}`)}
            >
              Previous job
            </button>
          )}

          {nextJob && (
            <button
              className="floating-nav-button primary"
              type="button"
              onClick={() => navigate(`/jobs/${nextJob.uploadId}`)}
            >
              Next job
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default JobDetail;
