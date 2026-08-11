import { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useResume } from '../context/ResumeContext';
import { useTheme } from '../hooks/useTheme';
import './Sidebar.css';

const STEPS = [
  { id: 'heading', label: 'Heading', introPath: '/builder/contact', summaryPath: '/builder/contact', paths: ['/builder/contact'] },
  { id: 'work', label: 'Work history', introPath: '/builder/purpose', summaryPath: '/builder/work-summary', paths: ['/builder/purpose', '/builder/work-history', '/builder/work-editor', '/builder/work-summary'] },
  { id: 'education', label: 'Education', introPath: '/builder/education-intro', summaryPath: '/builder/education-summary', paths: ['/builder/education-intro', '/builder/education-level', '/builder/education-form', '/builder/education-summary'] },
  { id: 'skills', label: 'Skills', introPath: '/builder/skills-intro', summaryPath: '/builder/skills-editor', paths: ['/builder/skills-intro', '/builder/skills-editor'] },
  { id: 'summary', label: 'Summary', introPath: '/builder/summary-intro', summaryPath: '/builder/summary-editor', paths: ['/builder/summary-intro', '/builder/summary-editor'] },
  { id: 'finalize', label: 'Finalize', introPath: '/finalize', summaryPath: '/finalize', paths: ['/builder/extra-sections', '/builder/personal-details', '/builder/websites', '/builder/certifications', '/builder/languages', '/builder/smart-apply', '/finalize'] },
];

function checkHasData(stepIndex, state) {
  switch (stepIndex) {
    case 0: return !!(state.contact.firstName || state.contact.surname || state.contact.email);
    case 1: return state.workHistory.length > 0;
    case 2: return state.education.length > 0;
    case 3: return !!state.skills.textContent || state.skills.ratings.length > 0;
    case 4: return !!state.summary.content;
    case 5: return false; // finalize
    default: return false;
  }
}

function getStepStatus(stepIndex, currentStepIndex, state) {
  if (stepIndex === currentStepIndex) return 'active';
  return checkHasData(stepIndex, state) ? 'completed' : 'pending';
}

export default function Sidebar() {
  const location = useLocation();
  const { state, dispatch, completeness } = useResume();
  const { isDark, toggle } = useTheme();

  const currentStepIndex = STEPS.findIndex(step =>
    step.paths.some(p => location.pathname.startsWith(p))
  );

  useEffect(() => {
    if (currentStepIndex > -1) {
      dispatch({ type: 'UPDATE_FURTHEST_STEP', payload: currentStepIndex });
    }
  }, [currentStepIndex, dispatch]);

  return (
    <aside className="sidebar" role="complementary" aria-label="Resume progress">
      <div className="sidebar-header">
        <Link to="/" className="sidebar-brand">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="sideLogoGrad" x1="0" y1="0" x2="32" y2="32">
                <stop offset="0%" stopColor="#E84D39" />
                <stop offset="100%" stopColor="#E91E8C" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="8" fill="url(#sideLogoGrad)" />
            <path d="M8 8h6v16H8V8zm10 0h6v4h-6V8zm0 6h6v4h-6v-4zm0 6h6v4h-6v-4z" fill="white" opacity="0.9" />
          </svg>
          <span>Resume Builder</span>
        </Link>
      </div>

      <nav className="sidebar-steps" aria-label="Builder steps">
        {STEPS.map((step, index) => {
          const status = getStepStatus(index, currentStepIndex, state);
          const furthest = state.meta.furthestStepReached || 0;
          const isClickable = index <= furthest; // Only allow navigating to reached steps

          const StepContent = (
            <div className={`sidebar-step ${status} ${isClickable ? 'clickable' : ''}`}>
              <div className="step-indicator">
                {status === 'completed' ? (
                  <div className="step-check" aria-label="Completed">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7l3.5 3.5L12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                ) : (
                  <div className="step-number">{index + 1}</div>
                )}
              </div>
              <span className="step-label">{step.label}</span>
              {index < STEPS.length - 1 && <div className="step-connector" />}
            </div>
          );

          const targetPath = checkHasData(index, state) ? step.summaryPath : step.introPath;

          return isClickable ? (
            <Link to={targetPath} key={step.id} style={{ textDecoration: 'none', color: 'inherit' }}>
              {StepContent}
            </Link>
          ) : (
            <div key={step.id}>{StepContent}</div>
          );
        })}
      </nav>

      <div className="sidebar-completeness">
        <div className="completeness-header">
          <span className="completeness-title">Resume Completeness:</span>
        </div>
        <div className="completeness-bar">
          <div className="completeness-fill" style={{ width: `${completeness}%` }} />
        </div>
        <span className="completeness-value">{completeness}%</span>
      </div>

      <div className="sidebar-footer">
        <button className="sidebar-theme-toggle" onClick={toggle} title={isDark ? 'Light mode' : 'Dark mode'}>
          {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
        <a href="#terms">Terms &amp; Conditions</a>
        <a href="#privacy">Privacy Policy</a>
        <a href="#accessibility">Accessibility</a>
        <a href="#contact">Contact Us</a>
        <p className="sidebar-copyright">© 2026, Resume Builder. All rights reserved.</p>
      </div>
    </aside>
  );
}
