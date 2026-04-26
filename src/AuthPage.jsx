import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle.jsx';

function AuthPage({ api, auth, onAuthSuccess, theme, onThemeToggle }) {
  const [mode, setMode] = useState('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    setError('');
  }, [mode]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      if (mode === 'signup') {
        await api.signup(form);
      }

      const result = await api.signin(form.username, form.password);

      onAuthSuccess({
        accessToken: result.accessToken,
        username: result.username,
        email: result.email,
        roles: result.roles || [],
        id: result.id,
      });
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  if (auth) {
    return <Navigate to="/jobs" replace />;
  }

  return (
    <div className="screen auth-screen">
      <div className="bg-orb bg-orb-a" />
      <div className="bg-orb bg-orb-b" />

      <div className="floating-theme-toggle">
        <ThemeToggle theme={theme} onToggle={onThemeToggle} />
      </div>

      <section className="auth-layout">
        <div className="auth-side card">
          <span className="eyebrow">Invoice extraction</span>
          <h1>Log in and start uploading invoices.</h1>
          <p>
            This flow stays simple: sign in, upload a file, watch the job status, and open the
            extracted result in a dedicated detail page.
          </p>
          <div className="chip-row">
            <span className="chip">Upload</span>
            <span className="chip">Jobs</span>
            <span className="chip">Preview + JSON</span>
          </div>
        </div>

        <div className="card auth-card">
          <div className="tab-row">
            <button
              className={mode === 'signin' ? 'tab active' : 'tab'}
              onClick={() => setMode('signin')}
              type="button"
            >
              Sign in
            </button>
            <button
              className={mode === 'signup' ? 'tab active' : 'tab'}
              onClick={() => setMode('signup')}
              type="button"
            >
              Sign up
            </button>
          </div>

          <form className="stack-form" onSubmit={handleSubmit}>
            <label>
              Username
              <input
                value={form.username}
                onChange={(event) => updateField('username', event.target.value)}
                required
              />
            </label>

            {mode === 'signup' && (
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  required
                />
              </label>
            )}

            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                required
              />
            </label>

            {error && <p className="notice error">{error}</p>}

            <button className="primary-button stretch" disabled={busy}>
              {busy ? 'Working...' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="auth-footnote">
            After login you will land on the jobs page, and from there you can add a new upload.
          </p>
          <Link className="inline-link" to="/">
            Back to website
          </Link>
        </div>
      </section>
    </div>
  );
}

export default AuthPage;
