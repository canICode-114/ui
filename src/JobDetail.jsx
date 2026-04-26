import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ThemeToggle from './ThemeToggle.jsx';

function safeParse(json) {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return `Invalid JSON from backend:\n${json}`;
  }
}

function getFileType(path) {
  if (!path) return 'unknown';
  const ext = path.split('.').pop()?.toLowerCase();

  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) return 'image';
  return 'unknown';
}

function JobDetail({ auth, api, onLogout, theme, onThemeToggle }) {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    Promise.all([api.getJob(id, auth.accessToken), api.getJobs(auth.accessToken)])
      .then(([jobResult, jobsResult]) => {
        if (!cancelled) {
          setJob(jobResult);
          setJobs(jobsResult);
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

  const nextJob = useMemo(() => {
    const currentIndex = jobs.findIndex((item) => String(item.uploadId) === String(id));
    if (currentIndex === -1) return null;
    return jobs[currentIndex + 1] || null;
  }, [id, jobs]);

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

  const fileType = getFileType(job?.filePath || job?.fileName);

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
          <button className="ghost-button" onClick={onLogout}>
            Sign out
          </button>
        </aside>

        <main className="content">
          <header className="page-header">
            <div>
              <span className="eyebrow">Job detail</span>
              <h1>{job?.fileName || `Upload #${id}`}</h1>
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
            <section className="detail-layout">
              <div className="card detail-panel">
                <h3>Uploaded file</h3>

                {fileType === 'pdf' && previewUrl && (
                  <iframe src={previewUrl} title="pdf preview" className="file-preview" />
                )}

                {fileType === 'image' && previewUrl && (
                  <img src={previewUrl} alt="preview" className="file-preview image-preview" />
                )}

                {fileType === 'unknown' && (
                  <div className="preview-placeholder">Unsupported file type</div>
                )}

                {!previewUrl && fileType !== 'unknown' && (
                  <div className="preview-placeholder">Loading file preview...</div>
                )}
              </div>

              <div className="card detail-panel">
                <div className="detail-meta">
                  <span className={`status-pill status-${String(job.status).toLowerCase()}`}>
                    {job.status}
                  </span>
                </div>

                <h3>Extracted data</h3>

                {job.resultJson ? (
                  <pre className="json-view">{safeParse(job.resultJson)}</pre>
                ) : (
                  <div className="preview-placeholder">Processing...</div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      {nextJob && (
        <button
          className="floating-next-button"
          type="button"
          onClick={() => navigate(`/jobs/${nextJob.uploadId}`)}
        >
          Next job
        </button>
      )}
    </div>
  );
}

export default JobDetail;
