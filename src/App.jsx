import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AuthPage from './AuthPage.jsx';
import JobDetail from './JobDetail.jsx';
import JobsPage from './JobsPage.jsx';
import LandingPage from './LandingPage.jsx';
import UploadPage from './UploadPage.jsx';
import { createApi, defaultSettings } from './lib/api.js';
import {
  clearAuth,
  readAuth,
  readSettings,
  saveAuth,
  saveSettings,
} from './lib/storage.js';

function ProtectedRoute({ auth, children }) {
  if (!auth) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const [settings, setSettings] = useState(() => {
    const nextSettings = {
      ...defaultSettings,
      ...readSettings(),
    };
    saveSettings(nextSettings);
    return nextSettings;
  });

  const api = useMemo(() => createApi(settings), [settings]);
  const auth = readAuth();
  const theme = settings.theme || 'dark';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  function handleAuthSuccess(session) {
    saveAuth(session);
    window.location.href = '/jobs';
  }

  function handleLogout() {
    clearAuth();
    window.location.href = '/';
  }

  function handleThemeToggle() {
    setSettings((current) => {
      const nextSettings = {
        ...current,
        theme: current.theme === 'light' ? 'dark' : 'light',
      };
      saveSettings(nextSettings);
      return nextSettings;
    });
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <LandingPage
              auth={auth}
              theme={theme}
              onThemeToggle={handleThemeToggle}
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
              theme={theme}
              onThemeToggle={handleThemeToggle}
            />
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute auth={auth}>
              <UploadPage
                auth={auth}
                api={api}
                onLogout={handleLogout}
                theme={theme}
                onThemeToggle={handleThemeToggle}
                settings={settings}
              />
            </ProtectedRoute>
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
                theme={theme}
                onThemeToggle={handleThemeToggle}
                settings={settings}
                setSettings={setSettings}
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
                theme={theme}
                onThemeToggle={handleThemeToggle}
              />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
