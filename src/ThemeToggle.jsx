function ThemeToggle({ theme, onToggle }) {
  return (
    <button className="theme-toggle" onClick={onToggle} type="button" aria-label="Toggle theme">
      <span className={theme === 'dark' ? 'theme-pill active' : 'theme-pill'}>Dark</span>
      <span className={theme === 'light' ? 'theme-pill active' : 'theme-pill'}>Light</span>
    </button>
  );
}

export default ThemeToggle;
