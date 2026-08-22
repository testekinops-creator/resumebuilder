import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ResumePreview from './ResumePreview';
import ResumeIcon from './ResumeIcon';
import ResumePreviewViewer from './ResumePreviewViewer';
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
  const location = useLocation();
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const returnTo = location.state?.returnTo;
  const finalizeReturnState = returnTo === '/finalize'
    ? { focusSection: location.state?.focusSection }
    : undefined;

  const returnToFinalize = () => navigate(returnTo, { state: finalizeReturnState });

  const handleNext = () => {
    if (onNext) {
      const result = onNext();
      if (result === false) return;
    }
    if (returnTo) {
      returnToFinalize();
      return;
    }
    if (nextPath) navigate(nextPath);
  };

  return (
    <div className="step-navigation">
      {backPath && (
        <button className="step-nav-back" onClick={() => returnTo ? returnToFinalize() : navigate(backPath)}>
          <ResumeIcon name="arrowLeft" size={16} />Go Back
        </button>
      )}
      <div className="step-nav-actions">
        {optional && <span className="step-nav-optional">{optional}</span>}
        {showPreview && (
          <button className="btn btn-outline-dark step-nav-preview" onClick={() => setShowPreviewModal(true)}>
            <ResumeIcon name="preview" size={17} />Preview
          </button>
        )}
        <button
          className="btn btn-accent btn-lg"
          onClick={handleNext}
          disabled={disabled}
        >
          {returnTo ? 'Save & Return to Resume' : nextLabel}
        </button>
      </div>

      {showPreviewModal && (
        <ResumePreviewViewer
          onClose={() => setShowPreviewModal(false)}
          renderResume={({ viewerScale }) => <ResumePreview viewerScale={viewerScale} className="resume-viewer-preview" />}
        />
      )}
    </div>
  );
}
