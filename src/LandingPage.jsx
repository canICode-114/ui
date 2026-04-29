import { Link, Navigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle.jsx';

function LandingPage({ auth, theme, onThemeToggle }) {
  if (auth) {
    return <Navigate to="/jobs" replace />;
  }

  return (
    <div className="screen landing-screen">
      <div className="bg-orb bg-orb-a" />
      <div className="bg-orb bg-orb-b" />

      <header className="landing-topbar">
        <div className="brand landing-brand">
          <span className="brand-mark">IF</span>
          <div>
            <strong>InvoiceFlow</strong>
            <p>OCR jobs with cleaner review flow</p>
          </div>
        </div>

        <div className="landing-topbar-actions">
          <ThemeToggle theme={theme} onToggle={onThemeToggle} />
          <Link className="primary-button button-link" to="/auth">
            Login / Signup
          </Link>
        </div>
      </header>

      <main className="landing-layout">
        <section className="card landing-hero">
          <span className="eyebrow">About the website</span>
          <h1>Upload invoices, track OCR progress, and review extracted data in one place.</h1>
          <p>
            InvoiceFlow is built for a simple team workflow: bring in files, let OCR run in the
            background, and step through results job by job without losing context.
          </p>

          <div className="landing-points">
            <div className="landing-point">
              <strong>Fast uploads</strong>
              <p>Drop invoices into a focused upload flow with drag-and-drop support.</p>
            </div>
            <div className="landing-point">
              <strong>Live job tracking</strong>
              <p>See creation time, status, and jump into each extraction result quickly.</p>
            </div>
            <div className="landing-point">
              <strong>Clear review mode</strong>
              <p>Preview the original file beside parsed JSON and move to the next job easily.</p>
            </div>
          </div>
        </section>

        <section className="card landing-side">
          <span className="eyebrow">Why teams use it</span>
          <h2>Built for operators who need speed, visibility, and less clicking around.</h2>
          <div className="chip-row">
            <span className="chip">OCR + Extraction</span>
            <span className="chip">Upload Modal</span>
            <span className="chip">Job-by-job Review</span>
            <span className="chip">Dark + Light Theme</span>
          </div>
          <p className="landing-note">
            Start from the dashboard after login, open uploads in a modal, and review jobs in a
            cleaner sequence.
          </p>
        </section>
      </main>
    </div>
  );
}

export default LandingPage;
