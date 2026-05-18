import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import AuthModal from './AuthModal.jsx';

function LandingPage({ api, auth, onAuthSuccess }) {
  const [authMode, setAuthMode] = useState(null);
  const previewVideoRef = useRef(null);
  const featureCards = [
    {
      title: 'Capture everything in one drop',
      body: 'Upload PDFs, scans, photos, and URL imports without bouncing across tools.',
    },
    {
      title: 'Review before it reaches finance',
      body: 'Confidence-aware fields and visual proof make verification fast for operators.',
    },
    {
      title: 'Export in the format your team needs',
      body: 'Move verified invoice data into Excel, PDF, or JSON for downstream workflows.',
    },
  ];
  const workflowSteps = [
    {
      label: '01',
      title: 'Upload',
      body: 'Bring invoices in from desktop files or remote links.',
    },
    {
      label: '02',
      title: 'Extract',
      body: 'OCR turns scattered layouts into structured invoice fields.',
    },
    {
      label: '03',
      title: 'Verify',
      body: 'Teams review low-confidence fields and confirm the final values.',
    },
    {
      label: '04',
      title: 'Export',
      body: 'Push clean records out for finance ops, audits, or reporting.',
    },
  ];

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setAuthMode(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const video = previewVideoRef.current;
    if (!video) {
      return undefined;
    }

    function applyPlaybackRate() {
      video.playbackRate = 1.1;
      video.defaultPlaybackRate = 1.1;
    }

    applyPlaybackRate();
    video.addEventListener('loadedmetadata', applyPlaybackRate);
    video.addEventListener('play', applyPlaybackRate);

    return () => {
      video.removeEventListener('loadedmetadata', applyPlaybackRate);
      video.removeEventListener('play', applyPlaybackRate);
    };
  }, []);

  if (auth) {
    return <Navigate to="/jobs" replace />;
  }

  return (
    <div className="screen landing-screen">
      <div className="landing-noise" />
      <div className="landing-glow landing-glow-a" />
      <div className="landing-glow landing-glow-b" />

      <header className="landing-topbar">
        <div className="brand landing-brand">
          <span className="brand-mark">VF</span>
          <div>
            <strong>VeriFlow</strong>
          </div>
        </div>

        <div className="landing-topbar-actions">
          <button
            className="ghost-button landing-secondary-cta"
            onClick={() => setAuthMode('signup')}
            type="button"
          >
            Start free
          </button>
          <button
            className="primary-button landing-auth-button"
            onClick={() => setAuthMode('signin')}
            type="button"
          >
            Login
          </button>
        </div>
      </header>

      <main className="landing-shell">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <span className="landing-kicker">VeriFlow for teams that need control</span>
            <h1>Extract, review, and approve invoice data without the spreadsheet chase.</h1>

            <div className="landing-cta-row">
              <button className="primary-button landing-hero-button" onClick={() => setAuthMode('signup')} type="button">
                Create workspace
              </button>
              <button className="secondary-button landing-hero-button" onClick={() => setAuthMode('signin')} type="button">
                Explore dashboard
              </button>
            </div>

            <div className="landing-proof-row">
              <div className="landing-proof-pill">PDF and image uploads</div>
              <div className="landing-proof-pill">Human-verified fields</div>
              <div className="landing-proof-pill">Bulk export to Excel, PDF, JSON</div>
            </div>
          </div>

          <div className="landing-hero-panel card">
            <div className="landing-preview-media-frame">
              <video
                ref={previewVideoRef}
                className="landing-preview-media"
                src="/landing-workflow-preview.mp4"
                autoPlay
                loop
                muted
                playsInline
                aria-label="VeriFlow invoice extraction workspace preview"
              />
            </div>
          </div>
        </section>

        <section className="landing-strip card">
          <div>
            <span className="landing-strip-label">Why teams switch</span>
            <h2>Built for the gap between OCR output and finance-ready data.</h2>
          </div>
          <p>
            Competitors lead with extraction speed. VeriFlow’s advantage is the operational layer after extraction:
            invoice tracking, field review, verification, and export from one workspace.
          </p>
        </section>

        <section className="landing-feature-grid">
          {featureCards.map((feature, index) => (
            <article className="landing-feature-card card" key={feature.title}>
              <span className="landing-feature-index">0{index + 1}</span>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </section>

        <section className="landing-workflow card">
          <div className="landing-section-head">
            <span className="landing-strip-label">Workflow</span>
            <h2>From raw invoice files to clean, exportable records.</h2>
          </div>

          <div className="landing-step-grid">
            {workflowSteps.map((step) => (
              <article className="landing-step-card" key={step.label}>
                <span className="landing-step-label">{step.label}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

      </main>

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
