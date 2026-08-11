import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResume } from '../../context/ResumeContext';
import { TEMPLATES, COLOR_SCHEMES } from '../../data/templates';
import Navbar from '../../components/Navbar';
import './Onboarding.css';

export default function TemplateGallery() {
  const navigate = useNavigate();
  const { state, dispatch } = useResume();
  const [selected, setSelected] = useState(state.meta.templateId || '');

  const handleSelect = (templateId) => {
    setSelected(templateId);
    dispatch({ type: 'SET_META', payload: { templateId } });
  };

  const handleContinue = () => {
    if (selected) navigate('/upload-resume');
  };

  return (
    <div className="onboarding-page">
      <Navbar />
      <main id="main-content" className="onboarding-container onboarding-centered">
        <div className="onboarding-content" style={{ maxWidth: 900 }}>
          <h1>Choose your resume template</h1>
          <p className="onboarding-subtitle">
            Pick a template that suits your style. You can always change it later.
          </p>

          <div className="template-grid">
            {TEMPLATES.map(template => {
              const isRecommended = template.recommendedFor.includes(state.meta.experienceLevel);
              return (
                <div
                  key={template.id}
                  className={`template-card ${selected === template.id ? 'selected' : ''}`}
                  onClick={() => handleSelect(template.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelect(template.id)}
                  aria-label={`${template.name} template${isRecommended ? ' - Recommended' : ''}`}
                >
                  {isRecommended && (
                    <div className="badge badge-recommended template-badge">Recommended</div>
                  )}
                  <div className="template-preview" style={{ '--t-color': template.defaultColor }}>
                    <div className="tp-header" style={{ backgroundColor: template.defaultColor }}>
                      <div className="tp-name-line"></div>
                      <div className="tp-sub-line"></div>
                    </div>
                    <div className="tp-body">
                      <div className="tp-section">
                        <div className="tp-title" style={{ backgroundColor: template.defaultColor }}></div>
                        <div className="tp-line"></div>
                        <div className="tp-line short"></div>
                      </div>
                      <div className="tp-section">
                        <div className="tp-title" style={{ backgroundColor: template.defaultColor }}></div>
                        <div className="tp-line"></div>
                        <div className="tp-line short"></div>
                      </div>
                    </div>
                  </div>
                  {selected === template.id && (
                    <div className="template-check">✓</div>
                  )}
                  <p className="template-name">{template.name}</p>
                </div>
              );
            })}
          </div>

          <div className="template-actions">
            <button className="btn btn-ghost" onClick={() => navigate('/upload-resume')}>
              Choose later
            </button>
            <button
              className="btn btn-accent btn-lg"
              onClick={handleContinue}
              disabled={!selected}
            >
              Use this template
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
