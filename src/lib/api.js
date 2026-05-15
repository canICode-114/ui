const DEFAULT_AUTH_API = '/auth-api';
const DEFAULT_BACKEND_API = '/backend-api';

function normalizeBaseUrl(url, fallback) {
  const value = (url || fallback).trim();
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function extractFilenameFromDisposition(disposition) {
  if (!disposition) return '';
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1]);
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || '';
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
  const backendBase = normalizeBaseUrl(config.apiBaseUrl, DEFAULT_BACKEND_API);

  return {
    authBase,
    backendBase,
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
      const response = await fetch(`${backendBase}/api/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return parseResponse(response);
    },
    async getCredits(token) {
      const response = await fetch(`${backendBase}/api/credits`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return parseResponse(response);
    },
    async getJob(uploadId, token) {
      const response = await fetch(`${backendBase}/api/jobs/${uploadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return parseResponse(response);
    },
    async updateJobFields({ uploadId, fields, token }) {
      const response = await fetch(`${backendBase}/api/jobs/${uploadId}/fields`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      });
      return parseResponse(response);
    },
    async verifyJob({ uploadId, token }) {
      const response = await fetch(`${backendBase}/api/jobs/${uploadId}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      return parseResponse(response);
    },
    async deleteJobs({ uploadIds, token }) {
      const response = await fetch(`${backendBase}/api/jobs`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uploadIds }),
      });
      return parseResponse(response);
    },
    async exportJobs({ uploadIds, format, token }) {
      const response = await fetch(`${backendBase}/api/jobs/export`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uploadIds, format }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const payload = contentType.includes('application/json') ? await response.json() : await response.text();
        const message =
          typeof payload === 'string'
            ? payload
            : payload.message || payload.error || 'Export failed';
        throw new Error(message);
      }

      return {
        blob: await response.blob(),
        fileName: extractFilenameFromDisposition(response.headers.get('content-disposition')) || `invoice-export.${format}`,
      };
    },
    async uploadInvoice({ files, useLocalOcr, token }) {
      const form = new FormData();
      files.forEach((file) => {
        form.append('file', file);
      });
      form.append('useLocalOcr', String(useLocalOcr));

      const response = await fetch(`${backendBase}/api/invoice`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      return parseResponse(response);
    },
    async getFileBlob(uploadId, token) {
      const response = await fetch(`${backendBase}/api/files/${uploadId}`, {
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
  apiBaseUrl: DEFAULT_BACKEND_API,
  useLocalOcr: true,
  themeMode: 'system',
};
