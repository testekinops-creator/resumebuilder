import { useState, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import ResumePreview from '../../components/ResumePreview';
import './Builder.css';

const ROUTE_TO_SECTION = {
  '/builder/contact': 'heading',
  '/builder/purpose': 'heading',
  '/builder/work-history': 'workHistory',
  '/builder/work-editor': 'workHistory',
  '/builder/work-summary': 'workHistory',
  '/builder/education-intro': 'education',
  '/builder/education-level': 'education',
  '/builder/education-form': 'education',
  '/builder/education-summary': 'education',
  '/builder/skills-intro': 'skills',
  '/builder/skills-editor': 'skills',
  '/builder/summary-intro': 'summary',
  '/builder/summary-editor': 'summary',
  '/builder/certifications': 'certifications',
  '/builder/websites': 'websites',
  '/builder/personal-details': 'personalDetails',
};

export default function BuilderLayout() {
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const activeSection = useMemo(() => {
    return ROUTE_TO_SECTION[location.pathname] || '';
  }, [location.pathname]);

  return (
    <div className="builder-layout">
      <Sidebar />
      <main id="main-content" className="builder-content">
        <button className="go-back-link" onClick={() => navigate(-1)}>
          ← Go Back
        </button>
        <Outlet />
      </main>
      <aside className="builder-preview" aria-label="Resume preview">
        <div className="stat-banner">
          <span className="stat-banner-label">Our Resume Builder delivers results</span>
          <div className="stat-banner-row">
            <span className="stat-banner-arrow">↑</span>
            <span className="stat-banner-value">42%</span>
            <span className="stat-banner-text">Higher response rate from recruiters</span>
          </div>
        </div>
        <ResumePreview highlightSection={activeSection} />
      </aside>

      {/* Mobile floating preview button */}
      <button
        className="mobile-preview-fab"
        onClick={() => setShowMobilePreview(!showMobilePreview)}
        aria-label="Toggle resume preview"
      >
        {showMobilePreview ? '✕' : '👁️'}
      </button>

      {/* Mobile preview overlay */}
      {showMobilePreview && (
        <div
          className="mobile-preview-overlay"
          onClick={() => setShowMobilePreview(false)}
        >
          <div className="mobile-preview-content" onClick={e => e.stopPropagation()}>
            <ResumePreview scale={0.55} />
          </div>
        </div>
      )}
    </div>
  );
}
