import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResumePreview from './ResumePreview';
import './StepNavigation.css';

export default function StepNavigation({
  backPath,
  nextPath,
  nextLabel = 'Next',
  onNext,
  showPreview = true,
  disabled = false,
  optional,
}) {
  const navigate = useNavigate();
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const handleNext = () => {
    if (onNext) {
      const result = onNext();
      if (result === false) return;
    }
    if (nextPath) navigate(nextPath);
  };

  return (
    <div className="step-navigation">
      {backPath && (
        <button className="step-nav-back" onClick={() => navigate(backPath)}>
          ← Go Back
        </button>
      )}
      <div className="step-nav-actions">
        {optional && <span className="step-nav-optional">{optional}</span>}
        {showPreview && (
          <button className="btn btn-outline-dark" onClick={() => setShowPreviewModal(true)}>
            Preview
          </button>
        )}
        <button
          className="btn btn-accent btn-lg"
          onClick={handleNext}
          disabled={disabled}
        >
          {nextLabel}
        </button>
      </div>

      {showPreviewModal && (
        <div className="mobile-preview-overlay" style={{ zIndex: 1000 }} onClick={() => setShowPreviewModal(false)}>
          <div className="mobile-preview-content" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
            <button className="fe-close-btn" onClick={() => setShowPreviewModal(false)} style={{ position: 'absolute', top: -40, right: 0, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'white' }}>✕</button>
            <ResumePreview scale={0.55} />
          </div>
        </div>
      )}
    </div>
  );
}
