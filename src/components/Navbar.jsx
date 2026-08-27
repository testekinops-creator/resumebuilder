import { Link, NavLink } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import ResumeIcon from './ResumeIcon';
import './Navbar.css';

export default function Navbar() {
  const { isDark, toggle } = useTheme();

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand" aria-label="Resume Builder home">
          <div className="navbar-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
                  <stop offset="0%" stopColor="#E84D39" />
                  <stop offset="100%" stopColor="#E91E8C" />
                </linearGradient>
              </defs>
              <rect width="32" height="32" rx="8" fill="url(#logoGrad)" />
              <path d="M8 8h6v16H8V8zm10 0h6v4h-6V8zm0 6h6v4h-6v-4zm0 6h6v4h-6v-4z" fill="white" opacity="0.9" />
            </svg>
          </div>
          <span className="navbar-title">Resume Builder</span>
        </Link>
        <button
          type="button"
          className="btn-icon theme-toggle"
          onClick={toggle}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle dark mode"
          aria-pressed={isDark}
        >
          <ResumeIcon name={isDark ? 'sun' : 'moon'} size={18} />
        </button>
        <div className="navbar-actions">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => `btn btn-sm navbar-my-resumes${isActive ? ' is-active' : ''}`}
            aria-label="My Resumes"
            title="My Resumes"
          >
            <ResumeIcon name="document" size={17} />
            <span>My Resumes</span>
          </NavLink>
          <Link to="/get-started" className="btn btn-accent btn-sm navbar-build-cta">
            <span>Build My Resume</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
