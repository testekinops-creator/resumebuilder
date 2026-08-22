import { useState, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import ResumePreview from '../../components/ResumePreview';
import ResumeIcon from '../../components/ResumeIcon';
import ResumePreviewViewer from '../../components/ResumePreviewViewer';
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
          <ResumeIcon name="arrowLeft" size={16} />Go Back
        </button>
        <Outlet />
      </main>
      <aside className="builder-preview" aria-label="Resume preview">
        <div className="stat-banner">
          <span className="stat-banner-label">Our Resume Builder delivers results</span>
          <div className="stat-banner-row">
            <span className="stat-banner-arrow"><ResumeIcon name="arrowUp" size={18} /></span>
            <span className="stat-banner-value">42%</span>
            <span className="stat-banner-text">Higher response rate from recruiters</span>
          </div>
        </div>
        <ResumePreview highlightSection={activeSection} />
        <button className="btn btn-outline btn-sm builder-preview-expand" onClick={() => setShowMobilePreview(true)}>
          <ResumeIcon name="preview" size={17} />View full preview
        </button>
      </aside>

      {showMobilePreview && (
        <ResumePreviewViewer
          onClose={() => setShowMobilePreview(false)}
          renderResume={({ viewerScale }) => <ResumePreview viewerScale={viewerScale} className="resume-viewer-preview" />}
        />
      )}
    </div>
  );
}
