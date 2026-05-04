const DEFAULT_AUTH_API = '/auth-api';
const DEFAULT_OCR_API = '/ocr-api';

function normalizeBaseUrl(url, fallback) {
  const value = (url || fallback).trim();
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'string'
        ? payload
        : payload.message || payload.error || 'Request failed';
    throw new Error(message);
  }

  return payload;
}

export function createApi(config) {
  const authBase = normalizeBaseUrl(config.authBaseUrl, DEFAULT_AUTH_API);
  const ocrBase = normalizeBaseUrl(config.ocrBaseUrl, DEFAULT_OCR_API);

  return {
    authBase,
    ocrBase,
    async signin(username, password) {
      const response = await fetch(`${authBase}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      return parseResponse(response);
    },
    async signup({ username, email, password }) {
      const response = await fetch(`${authBase}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      return parseResponse(response);
    },
    async getJobs(token) {
      const response = await fetch(`${ocrBase}/api/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return parseResponse(response);
    },
    async getJob(uploadId, token) {
      const response = await fetch(`${ocrBase}/api/jobs/${uploadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return parseResponse(response);
    },
    async getJobOcrPages(uploadId, token) {
      const response = await fetch(`${ocrBase}/api/jobs/${uploadId}/ocr-pages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return parseResponse(response);
    },
    async uploadInvoice({ file, useLocalOcr, token }) {
      const form = new FormData();
      form.append('file', file);
      form.append('useLocalOcr', String(useLocalOcr));

      const response = await fetch(`${ocrBase}/api/invoice`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      return parseResponse(response);
    },
    async getFileBlob(uploadId, token) {
      const response = await fetch(`${ocrBase}/api/files/${uploadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Unable to load file preview');
      }

      return response.blob();
    },
  };
}

export const defaultSettings = {
  authBaseUrl: DEFAULT_AUTH_API,
  ocrBaseUrl: DEFAULT_OCR_API,
  useLocalOcr: true,
  theme: 'dark',
};
