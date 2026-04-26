import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle.jsx';

function UploadPage({ auth, api, onLogout, theme, onThemeToggle }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [useLocalOcr, setUseLocalOcr] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();

  function handleFilePick(nextFile) {
    if (!nextFile) return;
    setFile(nextFile);
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) return;

    setBusy(true);
    setError('');

    try {
      const result = await api.uploadInvoice({
        file,
        useLocalOcr,
        token: auth.accessToken,
      });

      if (result.uploadId) {
        navigate(`/jobs/${result.uploadId}`);
        return;
      }

      navigate('/jobs');
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

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
              <span className="eyebrow">Upload page</span>
              <h1>Submit a new invoice for extraction.</h1>
            </div>
            <Link className="secondary-button button-link" to="/jobs">
              Back to jobs
            </Link>
          </header>

          <section className="card upload-hero">
            <div className="upload-copy">
              <h2>Drop in the file, then let the backend process it asynchronously.</h2>
              <p>
                This page is now focused only on upload. The jobs list and job detail each have
                their own page, so the flow feels cleaner and less crowded.
              </p>
            </div>

            <form className="upload-form" onSubmit={handleSubmit}>
              <div
                className={isDragging ? 'upload-dropzone dragging' : 'upload-dropzone'}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  handleFilePick(event.dataTransfer.files?.[0] || null);
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(event) => handleFilePick(event.target.files?.[0] || null)}
                />
                <span>{file ? file.name : 'Drag and drop invoice here'}</span>
                <small>or</small>
                <button
                  type="button"
                  className="secondary-button choose-file-button"
                  onClick={() => inputRef.current?.click()}
                >
                  Choose file
                </button>
                <small>Supported: PDF, PNG, JPG, JPEG, WebP, BMP, GIF</small>
              </div>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={useLocalOcr}
                  onChange={(event) => setUseLocalOcr(event.target.checked)}
                />
                Use local OCR before Gemini extraction
              </label>

              {error && <p className="notice error">{error}</p>}

              <button className="primary-button stretch" disabled={!file || busy}>
                {busy ? 'Uploading...' : 'Upload'}
              </button>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}

export default UploadPage;
