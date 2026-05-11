const AUTH_STORAGE_KEY = 'invoiceflow.auth';
const SETTINGS_STORAGE_KEY = 'invoiceflow.settings';
const BACKGROUND_UPLOAD_COUNT_KEY = 'invoiceflow.backgroundUploadCount';
export const BACKGROUND_UPLOAD_EVENT = 'invoiceflow:background-upload-changed';

export function readAuth() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAuth(value) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(value));
}

export function clearAuth() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function readSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSettings(value) {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(value));
}

export function readBackgroundUploadCount() {
  try {
    const raw = window.localStorage.getItem(BACKGROUND_UPLOAD_COUNT_KEY);
    const value = Number.parseInt(raw || '0', 10);
    return Number.isNaN(value) ? 0 : Math.max(0, value);
  } catch {
    return 0;
  }
}

function saveBackgroundUploadCount(value) {
  window.localStorage.setItem(BACKGROUND_UPLOAD_COUNT_KEY, String(Math.max(0, value)));
  window.dispatchEvent(new CustomEvent(BACKGROUND_UPLOAD_EVENT));
}

export function beginBackgroundUpload(amount = 1) {
  saveBackgroundUploadCount(readBackgroundUploadCount() + amount);
}

export function finishBackgroundUpload(amount = 1) {
  saveBackgroundUploadCount(readBackgroundUploadCount() - amount);
}
