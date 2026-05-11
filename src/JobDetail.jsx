import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import AppSidebar from './AppSidebar.jsx';
import UploadModal from './UploadModal.jsx';
import { BACKGROUND_UPLOAD_EVENT, readBackgroundUploadCount, saveSettings } from './lib/storage.js';

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

function formatFieldValue(value) {
  if (value === null) return '—';
  if (value === undefined || value === '') return '—';
  return String(value);
}

function getProcessingMessage(status) {
  if (status === 'FAILED') return 'Extraction failed.';
  if (status === 'PROCESSING') return 'Processing...';
  if (status === 'UPLOADED') return 'Queued for processing...';
  return 'Processing...';
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

function expandBbox(bbox, contentSize, padding = 10) {
  if (!hasUsableBbox(bbox)) return null;

  const maxWidth = contentSize?.width || Number.POSITIVE_INFINITY;
  const maxHeight = contentSize?.height || Number.POSITIVE_INFINITY;

  return {
    xMin: clamp(bbox.xMin - padding, 0, maxWidth),
    yMin: clamp(bbox.yMin - padding, 0, maxHeight),
    xMax: clamp(bbox.xMax + padding, 0, maxWidth),
    yMax: clamp(bbox.yMax + padding, 0, maxHeight),
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getStageTransform(viewportSize, contentSize, bbox) {
  if (!viewportSize.width || !viewportSize.height || !contentSize.width || !contentSize.height) {
    return {
      scale: 1,
      translateX: 0,
      translateY: 0,
    };
  }

  const framePadding = 20;
  const fittedWidth = Math.max(viewportSize.width - framePadding * 2, 1);
  const fittedHeight = Math.max(viewportSize.height - framePadding * 2, 1);
  const baseScale = Math.min(fittedWidth / contentSize.width, fittedHeight / contentSize.height);
  const centeredTranslateX = (viewportSize.width - contentSize.width * baseScale) / 2;
  const centeredTranslateY = (viewportSize.height - contentSize.height * baseScale) / 2;

  if (!hasUsableBbox(bbox)) {
    return {
      scale: baseScale,
      translateX: centeredTranslateX,
      translateY: centeredTranslateY,
    };
  }

  const bboxWidth = Math.max(bbox.xMax - bbox.xMin, 28);
  const bboxHeight = Math.max(bbox.yMax - bbox.yMin, 20);
  const bboxCenterX = bbox.xMin + bboxWidth / 2;
  const bboxCenterY = bbox.yMin + bboxHeight / 2;

  const zoomX = fittedWidth / (bboxWidth * 1.9);
  const zoomY = fittedHeight / (bboxHeight * 2.2);
  const scale = clamp(Math.min(zoomX, zoomY), baseScale, Math.max(baseScale, 3.6));
  const rawTranslateX = viewportSize.width / 2 - bboxCenterX * scale;
  const rawTranslateY = viewportSize.height / 2 - bboxCenterY * scale;
  const scaledWidth = contentSize.width * scale;
  const scaledHeight = contentSize.height * scale;
  const minX = Math.min(viewportSize.width - scaledWidth - framePadding, centeredTranslateX);
  const maxX = Math.max(framePadding, centeredTranslateX);
  const minY = Math.min(viewportSize.height - scaledHeight - framePadding, centeredTranslateY);
  const maxY = Math.max(framePadding, centeredTranslateY);

  return {
    scale,
    translateX: clamp(rawTranslateX, minX, maxX),
    translateY: clamp(rawTranslateY, minY, maxY),
  };
}

function JobDetail({
  auth,
  api,
  onLogout,
  settings,
  setSettings,
  sidebarExpanded,
  setSidebarExpanded,
  themeMode,
  onThemeModeChange,
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const viewerRef = useRef(null);
  const canvasRef = useRef(null);

  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [activeFieldKey, setActiveFieldKey] = useState('');
  const [activePage, setActivePage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [pdfPageSize, setPdfPageSize] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [viewerSize, setViewerSize] = useState({ width: 0, height: 0 });
  const [editMode, setEditMode] = useState(false);
  const [draftValues, setDraftValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [backgroundUploadCount, setBackgroundUploadCount] = useState(() => readBackgroundUploadCount());

  useEffect(() => {
    let cancelled = false;

    async function loadJob() {
      try {
        const jobResult = await api.getJob(id, auth.accessToken);

        if (!cancelled) {
          setJob(jobResult);
          setError('');
        }
      } catch (nextError) {
        if (!cancelled) setError(nextError.message);
      }
    }

    loadJob();

    return () => {
      cancelled = true;
    };
  }, [api, auth.accessToken, id]);

  useEffect(() => {
    function syncBackgroundUploads() {
      setBackgroundUploadCount(readBackgroundUploadCount());
    }

    window.addEventListener(BACKGROUND_UPLOAD_EVENT, syncBackgroundUploads);
    return () => window.removeEventListener(BACKGROUND_UPLOAD_EVENT, syncBackgroundUploads);
  }, []);

  useEffect(() => {
    const nextDrafts = {};
    for (const field of job?.extractedFields || []) {
      nextDrafts[field.key] = field.value ?? '';
    }
    setDraftValues(nextDrafts);
    setEditMode(false);
  }, [job]);

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
  }, [previewUrl, job?.filePath, job?.fileName]);

  const extractedFields = useMemo(() => {
    return (job?.extractedFields || []).map((field) => ({
      ...field,
      label: formatLabel(field.key),
    }));
  }, [job?.extractedFields]);
  const canReview = job?.status === 'DONE';

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
    if (Number.isInteger(activeField?.page)) {
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
    () => (job?.ocrPages || []).find((page) => page.pageNumber === activePage) || null,
    [activePage, job?.ocrPages],
  );
  const activeBbox = useMemo(() => {
    if (!activeField || !hasUsableBbox(activeField.bboxValue)) return null;
    if (Number.isInteger(activeField.page) && activeField.page !== activePage) return null;
    return activeField.bboxValue;
  }, [activeField, activePage]);
  const contentSize = fileType === 'pdf' ? pdfPageSize : imageSize;
  const renderedActiveBbox = useMemo(() => {
    const scaledBbox = scaleBboxToRenderedSize(activeBbox, activePageInfo, contentSize);
    return expandBbox(scaledBbox, contentSize, 12);
  }, [activeBbox, activePageInfo, contentSize]);
  const stageTransform = getStageTransform(viewerSize, contentSize, renderedActiveBbox);

  const dirtyFields = useMemo(() => {
    return extractedFields.filter((field) => (draftValues[field.key] ?? '') !== (field.value ?? ''));
  }, [draftValues, extractedFields]);

  async function handleSave() {
    if (!dirtyFields.length) {
      setEditMode(false);
      return;
    }

    setSaving(true);
    try {
      const updatedJob = await api.updateJobFields({
        uploadId: id,
        fields: dirtyFields.map((field) => ({
          key: field.key,
          value: draftValues[field.key] ?? '',
        })),
        token: auth.accessToken,
      });
      setJob(updatedJob);
      setError('');
      setEditMode(false);
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleVerify() {
    setVerifying(true);
    try {
      const verifiedJob = await api.verifyJob({
        uploadId: id,
        token: auth.accessToken,
      });
      setJob(verifiedJob);
      setError('');
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setVerifying(false);
    }
  }

  function handleCancelEdit() {
    const nextDrafts = {};
    for (const field of extractedFields) {
      nextDrafts[field.key] = field.value ?? '';
    }
    setDraftValues(nextDrafts);
    setEditMode(false);
  }

  return (
    <div className="screen app-screen">
      <div className="bg-orb bg-orb-a" />
      <div className="bg-orb bg-orb-b" />

      <div className={sidebarExpanded ? 'workspace-shell sidebar-expanded' : 'workspace-shell sidebar-collapsed'}>
        <AppSidebar
          auth={auth}
          active="review"
          expanded={sidebarExpanded}
          onUpload={() => setShowUploadModal(true)}
          onLogout={onLogout}
          onExpandedChange={setSidebarExpanded}
          themeMode={themeMode}
          onThemeModeChange={onThemeModeChange}
          uploadInProgress={backgroundUploadCount > 0}
        />

        <main className="workspace-content detail-workspace-content">
          {!job && (
            <header className="page-header detail-page-header">
              <div className="detail-page-title">
                <div>
                  <span className="eyebrow">Job detail</span>
                  <h1>{`Upload #${id}`}</h1>
                </div>
              </div>
            </header>
          )}

          {error && <p className="notice error">{error}</p>}

          {!job ? (
            <section className="card detail-layout">
              <div className="empty-state">Loading job...</div>
            </section>
          ) : (
            <section className="detail-layout detail-layout-wide">
              <div className="card detail-panel detail-preview-panel">
                <div className="detail-panel-header detail-preview-header">
                  <div className="detail-preview-title-block">
                    <h2>{job?.fileName || `Upload #${id}`}</h2>
                  </div>

                  <div className="detail-preview-header-actions">
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
                          className={`bbox-highlight confidence-${getConfidenceTone(activeField?.confidenceValue)}`}
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
                          className={`bbox-highlight confidence-${getConfidenceTone(activeField?.confidenceValue)}`}
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
                <div className="detail-data-top">
                  <div className="detail-meta detail-meta-spread">
                    <span className={`status-pill status-${String(job.status).toLowerCase()}`}>
                      {job.status}
                    </span>
                    <span className={`status-pill ${job.humanVerified ? 'verified-pill' : 'unverified-pill'}`}>
                      {job.humanVerified ? 'Verified by human' : 'Awaiting verification'}
                    </span>
                  </div>

                  <div className="detail-panel-header detail-data-header">
                    <div>
                      <h3>Extracted data</h3>
                      {!canReview && (
                        <p className="detail-subcopy">
                          Extraction is still running. Review will unlock once OCR finishes.
                        </p>
                      )}
                    </div>
                  </div>

                  {canReview && (
                    <div className="detail-action-row">
                    {!editMode ? (
                      <>
                        <button className="primary-button detail-action-button detail-edit-button" type="button" onClick={() => setEditMode(true)}>
                          Edit
                        </button>
                        {!job.humanVerified && (
                          <button
                            className="primary-button detail-action-button detail-verify-button"
                            type="button"
                            disabled={verifying}
                            onClick={handleVerify}
                            >
                              {verifying ? 'Verifying...' : 'Verify'}
                            </button>
                          )}
                        </>
                      ) : (
                      <>
                        <button
                          className="primary-button detail-action-button"
                          type="button"
                          disabled={saving}
                          onClick={handleSave}
                        >
                          {saving ? 'Updating...' : 'Update'}
                        </button>
                        <button
                          className="primary-button detail-action-button"
                          type="button"
                          disabled={saving}
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </button>
                      </>
                      )}
                    </div>
                  )}
                </div>

                {canReview && extractedFields.length ? (
                  <div className="field-list" onMouseLeave={() => setActiveFieldKey('')}>
                    {extractedFields.map((field) => {
                      const tone = getConfidenceTone(field.confidenceValue);
                      const isActive = field.key === activeFieldKey;
                      const hasPreviewBbox =
                        (!Number.isInteger(field.page) || field.page === activePage) &&
                        hasUsableBbox(
                          scaleBboxToRenderedSize(
                            field.bboxValue || null,
                            activePageInfo,
                            contentSize,
                          ),
                        );

                      return (
                        <div
                          key={field.key}
                          className={`field-row confidence-${tone} ${isActive ? 'active' : ''}`}
                          onMouseEnter={() => setActiveFieldKey(field.key)}
                        >
                          <span className="field-label">
                            <span>{field.label}</span>
                            <span className="field-meta-row">
                              {field.source && <span className="field-source-badge">{field.source}</span>}
                            </span>
                          </span>

                          {editMode ? (
                            <input
                              value={draftValues[field.key] ?? ''}
                              onChange={(event) =>
                                setDraftValues((current) => ({
                                  ...current,
                                  [field.key]: event.target.value,
                                }))
                              }
                              onFocus={() => setActiveFieldKey(field.key)}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                            />
                          ) : (
                            <span className="field-value">{formatFieldValue(field.value)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="preview-placeholder">{getProcessingMessage(job.status)}</div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      {(job?.previousJobId || job?.nextJobId) && (
        <div className="floating-job-nav">
          {job?.previousJobId ? (
            <button
              className="floating-nav-button primary-button"
              type="button"
              onClick={() => navigate(`/jobs/${job.previousJobId}`)}
            >
              Previous job
            </button>
          ) : (
            <span className="floating-nav-spacer" aria-hidden="true" />
          )}

          {job?.nextJobId ? (
            <button
              className="floating-nav-button primary-button"
              type="button"
              onClick={() => navigate(`/jobs/${job.nextJobId}`)}
            >
              Next job
            </button>
          ) : (
            <span className="floating-nav-spacer" aria-hidden="true" />
          )}
        </div>
      )}

      <div className="floating-back-nav">
        <Link className="floating-nav-button primary-button button-link" to="/jobs">
          Back to jobs
        </Link>
      </div>

      {showUploadModal && (
        <UploadModal
          auth={auth}
          api={api}
          defaultUseLocalOcr={settings.useLocalOcr ?? true}
          onClose={() => setShowUploadModal(false)}
          onUploadQueued={(useLocalOcr) => {
            const nextSettings = {
              ...settings,
              useLocalOcr,
            };
            saveSettings(nextSettings);
            setSettings(nextSettings);
            setShowUploadModal(false);
            navigate('/jobs');
          }}
        />
      )}
    </div>
  );
}

export default JobDetail;
