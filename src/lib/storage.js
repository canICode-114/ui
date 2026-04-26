const AUTH_STORAGE_KEY = 'invoiceflow.auth';
const SETTINGS_STORAGE_KEY = 'invoiceflow.settings';

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
