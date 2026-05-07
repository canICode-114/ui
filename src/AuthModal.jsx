import { useEffect, useState } from 'react';

function AuthModal({ api, initialMode = 'signin', onAuthSuccess, onClose }) {
  const [mode, setMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

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

  return (
    <div className="auth-dialog card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="auth-close" onClick={onClose} type="button" aria-label="Close">
        x
      </button>

      <div className="auth-dialog-copy">
        <h1 id="auth-title">Log in or sign up</h1>
        <p>
          Access your OCR workspace, upload invoices, and review extracted results from one place.
        </p>
      </div>

      <div className="auth-dialog-tabs" role="tablist" aria-label="Authentication mode">
        <button
          className={mode === 'signin' ? 'auth-mode-pill active' : 'auth-mode-pill'}
          onClick={() => setMode('signin')}
          type="button"
        >
          Log in
        </button>
        <button
          className={mode === 'signup' ? 'auth-mode-pill active' : 'auth-mode-pill'}
          onClick={() => setMode('signup')}
          type="button"
        >
          Sign up
        </button>
      </div>

      <div className="auth-divider">
        <span>{mode === 'signin' ? 'Use your account details' : 'Create your account'}</span>
      </div>

      <form className="stack-form auth-dialog-form" onSubmit={handleSubmit}>
        <label>
          Username
          <input
            value={form.username}
            onChange={(event) => updateField('username', event.target.value)}
            placeholder="Enter your username"
            required
          />
        </label>

        {mode === 'signup' && (
          <label>
            Email address
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="name@example.com"
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
            placeholder="Enter your password"
            required
          />
        </label>

        {error && <p className="notice error">{error}</p>}

        <button className="auth-submit-button" disabled={busy}>
          {busy ? 'Working...' : mode === 'signin' ? 'Continue to workspace' : 'Create account'}
        </button>
      </form>
    </div>
  );
}

export default AuthModal;
