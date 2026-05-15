import { useRef, useState } from 'react';

const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;
const SUPPORTED_FILE_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/bmp',
  'image/gif',
  'image/tiff',
]);
const FILE_PREVIEW_LIMIT = 3;

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

function validateFiles(nextFiles) {
  for (const file of nextFiles) {
    if (!file) {
      return 'One of the selected files could not be read.';
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return `${file.name} is too large. Maximum file size is 50 MB.`;
    }

    const normalizedType = (file.type || '').toLowerCase();
    if (normalizedType && !SUPPORTED_FILE_TYPES.has(normalizedType)) {
      return `Unsupported file type for ${file.name}. Use PDF, PNG, JPG, JPEG, WebP, BMP, GIF, or TIFF.`;
    }
  }

  return '';
}

function getUploadErrorMessage(nextError) {
  if (nextError instanceof Error && nextError.message.trim()) {
    return nextError.message;
  }
  return 'Upload failed. Please try again.';
}

function getFilePreviewText(files) {
  if (files.length === 0) {
    return '';
  }

  const previewNames = files.slice(0, FILE_PREVIEW_LIMIT).map((file) => file.name);
  const remainingCount = files.length - previewNames.length;

  if (remainingCount <= 0) {
    return previewNames.join(', ');
  }

  return `${previewNames.join(', ')} and ${remainingCount} more...`;
}

function UploadModal({ auth, api, defaultUseLocalOcr, onClose, onUploadStart, onUploadingChange, onUploadError, onUploadComplete }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [imageUrl, setImageUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  function reportError(message) {
    onUploadError?.(message);
    onClose?.();
  }

  function handleFilePick(nextFiles) {
    const pickedFiles = Array.from(nextFiles || []);
    if (pickedFiles.length === 0) return;
    const validationMessage = validateFiles(pickedFiles);
    if (validationMessage) {
      reportError(validationMessage);
      return;
    }
    setFiles(pickedFiles);
    setImageUrl('');
  }

  async function handleUrlImport() {
    if (!imageUrl.trim()) return;

    setBusy(true);

    try {
      const nextFile = await createFileFromUrl(imageUrl.trim());
      const validationMessage = validateFiles([nextFile]);
      if (validationMessage) {
        reportError(validationMessage);
        return;
      }
      setFiles((current) => [...current, nextFile]);
      setImageUrl('');
    } catch (nextError) {
      reportError(getUploadErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (files.length === 0) return;

    setBusy(true);
    onUploadingChange?.(true);
    onUploadStart?.(defaultUseLocalOcr);
    onClose?.();

    try {
      const response = await api.uploadInvoice({
        files,
        useLocalOcr: defaultUseLocalOcr,
        token: auth.accessToken,
      });
      onUploadComplete?.(response);
    } catch (nextError) {
      const message = getUploadErrorMessage(nextError);
      console.error(nextError);
      onUploadError?.(message);
    } finally {
      onUploadingChange?.(false);
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
            {files.length > 0 && (
              <small className="upload-file-preview" title={files.map((file) => file.name).join(', ')}>
                {getFilePreviewText(files)}
              </small>
            )}
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
