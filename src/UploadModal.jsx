import { useRef, useState } from 'react';
import { beginBackgroundUpload, finishBackgroundUpload } from './lib/storage.js';

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

function UploadModal({ auth, api, defaultUseLocalOcr, onClose, onUploadQueued }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [imageUrl, setImageUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  function handleFilePick(nextFiles) {
    const pickedFiles = Array.from(nextFiles || []);
    if (pickedFiles.length === 0) return;
    setFiles(pickedFiles);
    setImageUrl('');
    setError('');
  }

  async function handleUrlImport() {
    if (!imageUrl.trim()) return;

    setBusy(true);
    setError('');

    try {
      const nextFile = await createFileFromUrl(imageUrl.trim());
      setFiles((current) => [...current, nextFile]);
      setImageUrl('');
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (files.length === 0) return;

    setBusy(true);
    setError('');
    beginBackgroundUpload(files.length);
    onUploadQueued(defaultUseLocalOcr);

    try {
      await api.uploadInvoice({
        files,
        useLocalOcr: defaultUseLocalOcr,
        token: auth.accessToken,
      });
    } catch (nextError) {
      console.error(nextError);
    } finally {
      finishBackgroundUpload(files.length);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">New upload</span>
            <h2>Add invoices</h2>
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
            <strong>
              {files.length > 0
                ? `${files.length} invoice${files.length === 1 ? '' : 's'} ready to upload`
                : 'Drag and drop invoice files here'}
            </strong>
            {files.length > 0 && <small>{files.map((file) => file.name).join(', ')}</small>}
            <span>or</span>
            <button
              type="button"
              className="secondary-button choose-file-button"
              onClick={() => inputRef.current?.click()}
            >
              Browse files
            </button>
            <small>Use PDF, PNG, JPG, JPEG, WebP, BMP or GIF.</small>
          </div>

          <div className="modal-divider">
            <span>or</span>
          </div>

          <label className="stack-label">
            Import from URL
            <div className="url-import-row">
              <input
                placeholder="Paste your invoice file URL"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
              />
              <button
                type="button"
                className="secondary-button import-button"
                onClick={handleUrlImport}
                disabled={busy || !imageUrl.trim()}
              >
                Import
              </button>
            </div>
          </label>

          {error && <p className="notice error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button className="primary-button" disabled={files.length === 0 || busy}>
              {busy ? 'Uploading...' : 'Save'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default UploadModal;
