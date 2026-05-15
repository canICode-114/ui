import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AuthPage from './AuthPage.jsx';
import JobDetail from './JobDetail.jsx';
import JobsPage from './JobsPage.jsx';
import LandingPage from './LandingPage.jsx';
import { createApi, defaultSettings } from './lib/api.js';
import {
  clearAuth,
  readAuth,
  readSettings,
  saveAuth,
  saveSettings,
} from './lib/storage.js';

function getSystemTheme() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return 'dark';
}

function getInitialThemeMode(storedSettings) {
  if (storedSettings?.themeMode === 'dark' || storedSettings?.themeMode === 'light' || storedSettings?.themeMode === 'system') {
    return storedSettings.themeMode;
  }

  if (storedSettings?.theme === 'dark' || storedSettings?.theme === 'light') {
    return storedSettings.theme;
  }

  return 'system';
}

const SIDEBAR_STATE_KEY = 'veriflow.sidebar.expanded';

function readSidebarExpanded() {
  if (typeof window === 'undefined') {
    return true;
  }

  const raw = window.sessionStorage.getItem(SIDEBAR_STATE_KEY);
  return raw === null ? true : raw === 'true';
}

function ProtectedRoute({ auth, children }) {
  if (!auth) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const [settings, setSettings] = useState(() => {
    const storedSettings = readSettings();
    const nextSettings = {
      ...defaultSettings,
      ...storedSettings,
      themeMode: getInitialThemeMode(storedSettings),
    };
    saveSettings(nextSettings);
    return nextSettings;
  });
  const [sidebarExpanded, setSidebarExpanded] = useState(readSidebarExpanded);
  const [uploading, setUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState({
    message: '',
    creditsMessage: '',
    showCreditsContact: false,
  });

  const api = useMemo(() => createApi(settings), [settings]);
  const auth = readAuth();
  const theme = settings.themeMode === 'dark' || settings.themeMode === 'light' ? settings.themeMode : systemTheme;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.setItem(SIDEBAR_STATE_KEY, String(sidebarExpanded));
  }, [sidebarExpanded]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    function syncTheme(event) {
      setSystemTheme(event.matches ? 'dark' : 'light');
    }

    syncTheme(mediaQuery);
    mediaQuery.addEventListener('change', syncTheme);

    return () => mediaQuery.removeEventListener('change', syncTheme);
  }, []);

  function handleAuthSuccess(session) {
    saveAuth(session);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(SIDEBAR_STATE_KEY, 'true');
    }
    setSidebarExpanded(true);
    window.location.href = '/jobs';
  }

  function handleLogout() {
    clearAuth();
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(SIDEBAR_STATE_KEY);
    }
    setSidebarExpanded(true);
    window.location.href = '/';
  }

  function handleThemeModeChange(nextThemeMode) {
    setSettings((current) => {
      if (current.themeMode === nextThemeMode) {
        return current;
      }

      const nextSettings = {
        ...current,
        themeMode: nextThemeMode,
      };
      saveSettings(nextSettings);
      return nextSettings;
    });
  }

  function clearUploadFeedback() {
    setUploadFeedback({
      message: '',
      creditsMessage: '',
      showCreditsContact: false,
    });
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <LandingPage
              api={api}
              auth={auth}
              onAuthSuccess={handleAuthSuccess}
            />
          }
        />
        <Route
          path="/auth"
          element={
            <AuthPage
              api={api}
              auth={auth}
              onAuthSuccess={handleAuthSuccess}
            />
          }
        />
        <Route
          path="/jobs"
          element={
            <ProtectedRoute auth={auth}>
              <JobsPage
                auth={auth}
                api={api}
                onLogout={handleLogout}
                settings={settings}
                setSettings={setSettings}
                uploading={uploading}
                setUploading={setUploading}
                uploadFeedback={uploadFeedback}
                setUploadFeedback={setUploadFeedback}
                clearUploadFeedback={clearUploadFeedback}
                sidebarExpanded={sidebarExpanded}
                setSidebarExpanded={setSidebarExpanded}
                themeMode={settings.themeMode}
                onThemeModeChange={handleThemeModeChange}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs/:id"
          element={
            <ProtectedRoute auth={auth}>
              <JobDetail
                auth={auth}
                api={api}
                onLogout={handleLogout}
                settings={settings}
                setSettings={setSettings}
                uploading={uploading}
                setUploading={setUploading}
                uploadFeedback={uploadFeedback}
                setUploadFeedback={setUploadFeedback}
                clearUploadFeedback={clearUploadFeedback}
                sidebarExpanded={sidebarExpanded}
                setSidebarExpanded={setSidebarExpanded}
                themeMode={settings.themeMode}
                onThemeModeChange={handleThemeModeChange}
              />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
