import { useRef, useState } from 'react';

function createFileFromUrl(url) {
  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Could not load file from URL');
      }
      return Promise.all([response.blob(), response.headers.get('content-type')]);
    })
    .then(([blob, contentType]) => {
      const cleanUrl = url.split('?')[0];
      const name = cleanUrl.split('/').pop() || 'remote-file';
      return new File([blob], name, { type: contentType || blob.type || 'application/octet-stream' });
    });
}

function UploadModal({ auth, api, defaultUseLocalOcr, onClose, onUploadComplete }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [useLocalOcr, setUseLocalOcr] = useState(defaultUseLocalOcr);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  function handleFilePick(nextFile) {
    if (!nextFile) return;
    setFile(nextFile);
    setImageUrl('');
    setError('');
  }

  async function handleUrlImport() {
    if (!imageUrl.trim()) return;

    setBusy(true);
    setError('');

    try {
      const nextFile = await createFileFromUrl(imageUrl.trim());
      setFile(nextFile);
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
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
      onUploadComplete(result, useLocalOcr);
    } catch (nextError) {
      setError(nextError.message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">New upload</span>
            <h2>Add image</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            x
          </button>
        </div>

        <form className="upload-modal-form" onSubmit={handleSubmit}>
          <div
            className={isDragging ? 'upload-dropzone modal-dropzone dragging' : 'upload-dropzone modal-dropzone'}
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
            <strong>{file ? file.name : 'Drag and drop an image here'}</strong>
            <span>or</span>
            <button
              type="button"
              className="secondary-button choose-file-button"
              onClick={() => inputRef.current?.click()}
            >
              Browse images
            </button>
            <small>Use PNG, JPG, SVG or PDF when available.</small>
          </div>

          <div className="modal-divider">
            <span>or</span>
          </div>

          <label className="stack-label">
            Import from URL
            <div className="url-import-row">
              <input
                placeholder="Paste your image URL"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
              />
              <button
                type="button"
                className="secondary-button"
                onClick={handleUrlImport}
                disabled={busy || !imageUrl.trim()}
              >
                Import
              </button>
            </div>
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={useLocalOcr}
              onChange={(event) => setUseLocalOcr(event.target.checked)}
            />
            Use local OCR before Gemini extraction
          </label>

          {error && <p className="notice error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button className="primary-button" disabled={!file || busy}>
              {busy ? 'Uploading...' : 'Save'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default UploadModal;
