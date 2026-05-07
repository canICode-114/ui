import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle.jsx';
import UploadModal from './UploadModal.jsx';
import { saveSettings } from './lib/storage.js';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function JobsPage({ auth, api, onLogout, theme, onThemeToggle, settings, setSettings }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function fetchJobs(silent = false) {
      if (!silent) setLoading(true);

      try {
        const result = await api.getJobs(auth.accessToken);
        if (!cancelled) {
          setJobs(result);
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
              <span className="eyebrow">Jobs page</span>
              <h1>All invoice extraction jobs.</h1>
            </div>
            <button className="primary-button button-link" type="button" onClick={() => setShowUploadModal(true)}>
              Upload
            </button>
          </header>

          <section className="card jobs-table-card">
            {error && <p className="notice error">{error}</p>}

            {loading ? (
              <div className="empty-state">Loading jobs...</div>
            ) : jobs.length === 0 ? (
              <div className="empty-state">No jobs yet. Upload your first invoice.</div>
            ) : (
              <div className="table-wrap">
                <table className="jobs-table">
                  <thead>
                    <tr>
                      <th>File</th>
                      <th>Created</th>
                      <th>Status</th>
                      <th>Verified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.uploadId} onClick={() => navigate(`/jobs/${job.uploadId}`)}>
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
          onUploadComplete={(result, useLocalOcr) => {
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

export default JobsPage;
