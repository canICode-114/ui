import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppSidebar from './AppSidebar.jsx';
import UploadModal from './UploadModal.jsx';
import { BACKGROUND_UPLOAD_EVENT, readBackgroundUploadCount, saveSettings } from './lib/storage.js';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function JobsPage({
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
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState('');
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [backgroundUploadCount, setBackgroundUploadCount] = useState(() => readBackgroundUploadCount());
  const navigate = useNavigate();
  const selectVisibleRef = useRef(null);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!exportMenuRef.current?.open) return;
      if (exportMenuRef.current.contains(event.target)) return;
      exportMenuRef.current.open = false;
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchJobs(silent = false) {
      if (!silent) setLoading(true);

      try {
        const result = await api.getJobs(auth.accessToken);
        if (!cancelled) {
          setJobs(result);
          setSelectedIds((current) => current.filter((id) => result.some((job) => job.uploadId === id)));
          setError('');
        }
      } catch (nextError) {
        if (!cancelled) setError(nextError.message);
      } finally {
        if (!cancelled && !silent) setLoading(false);
      }
    }

    fetchJobs();
    const timer = window.setInterval(() => fetchJobs(true), 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [api, auth.accessToken]);

  useEffect(() => {
    function syncBackgroundUploads() {
      setBackgroundUploadCount(readBackgroundUploadCount());
    }

    window.addEventListener(BACKGROUND_UPLOAD_EVENT, syncBackgroundUploads);
    return () => window.removeEventListener(BACKGROUND_UPLOAD_EVENT, syncBackgroundUploads);
  }, []);

  const filteredJobs = useMemo(() => {
    if (filter === 'verified') {
      return jobs.filter((job) => job.humanVerified);
    }
    if (filter === 'unverified') {
      return jobs.filter((job) => !job.humanVerified);
    }
    return jobs;
  }, [filter, jobs]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleSelected = filteredJobs.length > 0 && filteredJobs.every((job) => selectedIdSet.has(job.uploadId));
  const someVisibleSelected = filteredJobs.some((job) => selectedIdSet.has(job.uploadId));

  useEffect(() => {
    if (!selectVisibleRef.current) return;
    selectVisibleRef.current.indeterminate = !allVisibleSelected && someVisibleSelected;
  }, [allVisibleSelected, someVisibleSelected]);

  function updateSelection(nextIds) {
    setSelectedIds(Array.from(new Set(nextIds)));
  }

  function toggleSelection(uploadId) {
    setSelectedIds((current) =>
      current.includes(uploadId) ? current.filter((id) => id !== uploadId) : [...current, uploadId]
    );
  }

  async function handleDeleteSelected() {
    if (selectedIds.length === 0 || deleting) return;

    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected job${selectedIds.length === 1 ? '' : 's'}? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await api.deleteJobs({
        uploadIds: selectedIds,
        token: auth.accessToken,
      });
      const deletedIdSet = new Set(response.deletedUploadIds || []);
      setJobs((current) => current.filter((job) => !deletedIdSet.has(job.uploadId)));
      setSelectedIds((current) => current.filter((id) => !deletedIdSet.has(id)));
      setError('');
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleExport(format) {
    if (selectedIds.length === 0 || exportingFormat) return;

    setExportingFormat(format);
    try {
      const { blob, fileName } = await api.exportJobs({
        uploadIds: selectedIds,
        format,
        token: auth.accessToken,
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      setError('');
      if (exportMenuRef.current) {
        exportMenuRef.current.open = false;
      }
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setExportingFormat('');
    }
  }

  const counts = useMemo(
    () => ({
      all: jobs.length,
      verified: jobs.filter((job) => job.humanVerified).length,
      unverified: jobs.filter((job) => !job.humanVerified).length,
    }),
    [jobs]
  );

  return (
    <div className="screen app-screen">
      <div className="bg-orb bg-orb-a" />
      <div className="bg-orb bg-orb-b" />

      <div className={sidebarExpanded ? 'workspace-shell sidebar-expanded' : 'workspace-shell sidebar-collapsed'}>
        <AppSidebar
          auth={auth}
          active="jobs"
          expanded={sidebarExpanded}
          onUpload={() => setShowUploadModal(true)}
          onLogout={onLogout}
          onExpandedChange={setSidebarExpanded}
          themeMode={themeMode}
          onThemeModeChange={onThemeModeChange}
          uploadInProgress={backgroundUploadCount > 0}
        />

        <main className="workspace-content">
          <header className="page-header">
            <div>
              <span className="eyebrow">Jobs page</span>
              <h1>All invoice extraction jobs.</h1>
            </div>
            <div className="page-header-actions">
              {selectedIds.length > 0 && (
                <>
                  <details ref={exportMenuRef} className="header-action-menu">
                    <summary className="secondary-button export-button">
                      {exportingFormat ? `Exporting ${String(exportingFormat).toUpperCase()}...` : `Export (${selectedIds.length})`}
                    </summary>
                    <div className="header-action-menu-panel">
                      <button type="button" onClick={() => handleExport('xlsx')} disabled={Boolean(exportingFormat)}>
                        Export as Excel
                      </button>
                      <button type="button" onClick={() => handleExport('pdf')} disabled={Boolean(exportingFormat)}>
                        Export as PDF
                      </button>
                      <button type="button" onClick={() => handleExport('json')} disabled={Boolean(exportingFormat)}>
                        Export as JSON
                      </button>
                    </div>
                  </details>
                  <button
                    className="secondary-button danger-button"
                    type="button"
                    onClick={handleDeleteSelected}
                    disabled={deleting || Boolean(exportingFormat)}
                  >
                    {deleting ? 'Deleting...' : `Delete (${selectedIds.length})`}
                  </button>
                </>
              )}
              <button
                className="primary-button button-link"
                type="button"
                onClick={() => setShowUploadModal(true)}
                disabled={backgroundUploadCount > 0}
              >
                {backgroundUploadCount > 0 ? `Uploading... (${backgroundUploadCount})` : 'Upload'}
              </button>
            </div>
          </header>

          <section className="card jobs-table-card">
            {error && <p className="notice error">{error}</p>}

            {loading ? (
              <div className="empty-state">Loading jobs...</div>
            ) : jobs.length === 0 ? (
              <div className="empty-state">No jobs yet. Upload your first invoice.</div>
            ) : (
              <div className="jobs-table-shell">
                <div className="jobs-toolbar">
                  <div className="jobs-filter-group">
                    <button
                      className={filter === 'all' ? 'tab active' : 'tab'}
                      type="button"
                      onClick={() => setFilter('all')}
                    >
                      All ({counts.all})
                    </button>
                    <button
                      className={filter === 'verified' ? 'tab active' : 'tab'}
                      type="button"
                      onClick={() => setFilter('verified')}
                    >
                      Verified ({counts.verified})
                    </button>
                    <button
                      className={filter === 'unverified' ? 'tab active' : 'tab'}
                      type="button"
                      onClick={() => setFilter('unverified')}
                    >
                      Not verified ({counts.unverified})
                    </button>
                  </div>
                </div>

                <div className="table-wrap">
                  <table className="jobs-table">
                    <thead>
                      <tr>
                        <th className="jobs-select-column">
                          <input
                            ref={selectVisibleRef}
                            aria-label="Select visible jobs"
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={(event) => {
                              if (event.target.checked) {
                                updateSelection([...selectedIds, ...filteredJobs.map((job) => job.uploadId)]);
                                return;
                              }
                              const visibleIdSet = new Set(filteredJobs.map((job) => job.uploadId));
                              setSelectedIds((current) => current.filter((id) => !visibleIdSet.has(id)));
                            }}
                          />
                        </th>
                        <th>File</th>
                        <th>Created</th>
                        <th>Status</th>
                        <th>Verified</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredJobs.map((job) => (
                        <tr key={job.uploadId} onClick={() => navigate(`/jobs/${job.uploadId}`)}>
                          <td className="jobs-select-column" onClick={(event) => event.stopPropagation()}>
                            <input
                              aria-label={`Select ${job.fileName}`}
                              type="checkbox"
                              checked={selectedIdSet.has(job.uploadId)}
                              onChange={() => toggleSelection(job.uploadId)}
                            />
                          </td>
                          <td>{job.fileName}</td>
                          <td>{formatDate(job.createdAt)}</td>
                          <td>
                            <span className={`status-pill status-${String(job.status).toLowerCase()}`}>
                              {job.status}
                            </span>
                          </td>
                          <td>
                            <span className={`status-pill ${job.humanVerified ? 'verified-pill' : 'unverified-pill'}`}>
                              {job.humanVerified ? 'Verified' : 'Not verified'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </main>
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
          }}
        />
      )}
    </div>
  );
}

export default JobsPage;
