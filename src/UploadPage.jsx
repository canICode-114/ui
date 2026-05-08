import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function UploadPage({ auth, api, onLogout }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();

  function handleFilePick(nextFiles) {
    const pickedFiles = Array.from(nextFiles || []);
    if (pickedFiles.length === 0) return;
    setFiles(pickedFiles);
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (files.length === 0) return;

    setBusy(true);
    setError('');

    try {
      await api.uploadInvoice({
        files,
        useLocalOcr: true,
        token: auth.accessToken,
      });

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
                  handleFilePick(event.dataTransfer.files);
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".pdf,image/*"
                  onChange={(event) => handleFilePick(event.target.files)}
                />
                <span>
                  {files.length > 0
                    ? `${files.length} invoice${files.length === 1 ? '' : 's'} selected`
                    : 'Drag and drop invoices here'}
                </span>
                {files.length > 0 && (
                  <small>{files.map((file) => file.name).join(', ')}</small>
                )}
                <small>or</small>
                <button
                  type="button"
                  className="secondary-button choose-file-button"
                  onClick={() => inputRef.current?.click()}
                >
                  Choose files
                </button>
                <small>Supported: PDF, PNG, JPG, JPEG, WebP, BMP, GIF</small>
              </div>

              {error && <p className="notice error">{error}</p>}

              <button className="primary-button stretch" disabled={files.length === 0 || busy}>
                {busy ? 'Uploading...' : 'Upload invoices'}
              </button>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}

export default UploadPage;
