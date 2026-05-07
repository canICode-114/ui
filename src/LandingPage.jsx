import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import AuthModal from './AuthModal.jsx';

function LandingPage({ api, auth, onAuthSuccess }) {
  const [authMode, setAuthMode] = useState(null);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setAuthMode(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (auth) {
    return <Navigate to="/jobs" replace />;
  }

  return (
    <div className="screen landing-screen">
      <header className="landing-topbar">
        <div className="brand landing-brand">
          <span className="brand-mark">IF</span>
          <div>
            <strong>InvoiceFlow</strong>
            <p>Invoice OCR workspace</p>
          </div>
        </div>

        <div className="landing-topbar-actions">
          <button
            className="primary-button landing-auth-button"
            onClick={() => setAuthMode('signin')}
            type="button"
          >
            Login / Signup
          </button>
        </div>
      </header>

      {authMode && (
        <div className="landing-auth-backdrop" onClick={() => setAuthMode(null)} role="presentation">
          <div onClick={(event) => event.stopPropagation()} role="presentation">
            <AuthModal
              api={api}
              initialMode={authMode}
              onAuthSuccess={onAuthSuccess}
              onClose={() => setAuthMode(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;
