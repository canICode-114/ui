import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

function IconFrame({ children }) {
  return <span className="app-sidebar-icon-frame">{children}</span>;
}

function PanelIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="4" />
      <path d="M11.5 4.5v15" />
    </svg>
  );
}

function MenuBarsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7.5h14" />
      <path d="M5 12h14" />
      <path d="M5 16.5h14" />
    </svg>
  );
}

function JobsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="3" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 16V6" />
      <path d="m8.5 9.5 3.5-3.5 3.5 3.5" />
      <path d="M5 18.5h14" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 6H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4" />
      <path d="M13 8.5 17.5 12 13 15.5" />
      <path d="M9 12h8.5" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function AppSidebar({
  auth,
  active = 'jobs',
  expanded,
  onUpload,
  onLogout,
  onExpandedChange,
  themeMode,
  onThemeModeChange,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const accountAreaRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [expanded]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    function handleOutsidePress(event) {
      if (accountAreaRef.current?.contains(event.target)) {
        return;
      }

      setMenuOpen(false);
    }

    document.addEventListener('mousedown', handleOutsidePress);
    document.addEventListener('touchstart', handleOutsidePress);

    return () => {
      document.removeEventListener('mousedown', handleOutsidePress);
      document.removeEventListener('touchstart', handleOutsidePress);
    };
  }, [menuOpen]);

  const primaryActions = [
    { key: 'jobs', label: 'Jobs', icon: <JobsIcon />, to: '/jobs' },
    { key: 'upload', label: 'New upload', icon: <UploadIcon />, onClick: onUpload },
  ];

  function renderAccountMenu(className = 'sidebar-account-menu') {
    return (
      <div className={className}>
        <div className="sidebar-account-card">
          <div className="sidebar-account-summary">
            <div className="sidebar-account-avatar">
              {String(auth.username || 'IF').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <strong>{auth.username}</strong>
              <p>Workspace user</p>
            </div>
            <span className="sidebar-account-chevron">
              <ChevronIcon />
            </span>
          </div>

          <div className="sidebar-account-divider" />

          <div className="theme-mode-group" role="group" aria-label="Theme mode">
            <button
              className={themeMode === 'dark' ? 'theme-mode-button active' : 'theme-mode-button'}
              type="button"
              onClick={() => onThemeModeChange?.('dark')}
            >
              Dark
            </button>
            <button
              className={themeMode === 'light' ? 'theme-mode-button active' : 'theme-mode-button'}
              type="button"
              onClick={() => onThemeModeChange?.('light')}
            >
              Light
            </button>
            <button
              className={themeMode === 'system' ? 'theme-mode-button active' : 'theme-mode-button'}
              type="button"
              onClick={() => onThemeModeChange?.('system')}
            >
              Default
            </button>
          </div>

          <div className="sidebar-account-divider" />

          <button className="sidebar-account-link" type="button" onClick={onLogout}>
            <IconFrame>
              <LogoutIcon />
            </IconFrame>
            <span>Log out</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <aside className="app-sidebar">
        {!expanded && (
          <div className="app-sidebar-rail">
            <button
              className="rail-icon-button rail-toggle-button"
              type="button"
              aria-label="Open sidebar"
              onClick={() => onExpandedChange?.(true)}
            >
              <IconFrame>
                <PanelIcon />
              </IconFrame>
            </button>

            <button
              className="rail-icon-button rail-upload-button"
              type="button"
              aria-label="New upload"
              onClick={onUpload}
            >
              <IconFrame>
                <UploadIcon />
              </IconFrame>
            </button>

            <div className="sidebar-account-area sidebar-account-area-rail" ref={accountAreaRef}>
              <button className="rail-profile-button" type="button" onClick={() => setMenuOpen((value) => !value)}>
                <span>{String(auth.username || 'IF').slice(0, 2).toUpperCase()}</span>
              </button>

              {menuOpen && renderAccountMenu('sidebar-account-menu sidebar-account-menu-rail')}
            </div>
          </div>
        )}

        {expanded ? (
          <div className="app-sidebar-panel">
            <button
              className="app-sidebar-panel-header"
              type="button"
              aria-label="Collapse sidebar"
              onClick={() => onExpandedChange?.(false)}
            >
              <div className="app-sidebar-panel-heading">
                <span className="app-sidebar-header-toggle app-sidebar-header-bars">
                  <MenuBarsIcon />
                </span>
                <strong>InvoiceFlow</strong>
              </div>
            </button>

            <div className="app-sidebar-panel-actions">
              {primaryActions.map((action) => {
                const itemClass =
                  action.key === active ? 'sidebar-panel-link active' : 'sidebar-panel-link';

                if (action.to) {
                  return (
                    <Link key={action.key} className={itemClass} to={action.to}>
                      <IconFrame>{action.icon}</IconFrame>
                      <span>{action.label}</span>
                    </Link>
                  );
                }

                return (
                  <button
                    key={action.key}
                    className={itemClass}
                    type="button"
                    onClick={action.onClick}
                    disabled={action.disabled}
                  >
                    <IconFrame>{action.icon}</IconFrame>
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="sidebar-account-area" ref={accountAreaRef}>
              {menuOpen && renderAccountMenu()}

              <button className="sidebar-account-trigger" type="button" onClick={() => setMenuOpen((value) => !value)}>
                <div className="sidebar-account-avatar">
                  {String(auth.username || 'IF').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <strong>{auth.username}</strong>
                  <p>Workspace user</p>
                </div>
              </button>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}

export default AppSidebar;
