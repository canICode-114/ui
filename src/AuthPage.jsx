import { Link, Navigate, useNavigate } from 'react-router-dom';
import AuthModal from './AuthModal.jsx';

function AuthPage({ api, auth, onAuthSuccess }) {
  const navigate = useNavigate();

  if (auth) {
    return <Navigate to="/jobs" replace />;
  }

  return (
    <div className="screen auth-screen">
      <div className="landing-auth-backdrop auth-route-backdrop">
        <div className="auth-route-shell">
          <AuthModal
            api={api}
            initialMode="signin"
            onAuthSuccess={onAuthSuccess}
            onClose={() => navigate('/')}
          />
          <Link className="inline-link auth-route-link" to="/">
            Back to website
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
