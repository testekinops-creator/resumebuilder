import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResume } from '../../context/ResumeContext';
import { TEMPLATES } from '../../data/templates';
import { TEMPLATE_PREVIEW_DATA } from '../../data/templatePreviewData';
import ResumePreview from '../../components/ResumePreview';
import ResumePreviewViewer from '../../components/ResumePreviewViewer';
import Navbar from '../../components/Navbar';
import ResumeIcon from '../../components/ResumeIcon';
import './Onboarding.css';

export default function TemplateGallery() {
  const navigate = useNavigate();
  const { state, dispatch } = useResume();
  const [selected, setSelected] = useState(state.meta.templateId || '');
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const handleSelect = (templateId) => {
    const template = TEMPLATES.find(item => item.id === templateId);
    setSelected(templateId);
    dispatch({ type: 'SET_META', payload: { templateId } });
    if (template) dispatch({ type: 'SET_DESIGN', payload: { colorScheme: template.defaultColor } });
  };

  const handleContinue = () => {
    if (selected) navigate('/upload-resume');
  };

  const applyPreviewTemplate = () => {
    if (previewTemplate) handleSelect(previewTemplate.id);
    setPreviewTemplate(null);
  };

  return (
    <div className="onboarding-page">
      <Navbar />
      <main id="main-content" className="onboarding-container onboarding-centered">
        <div className="onboarding-content template-gallery-content">
          <h1>Choose your resume template</h1>
          <p className="onboarding-subtitle">Every thumbnail is a miniature of the actual layout. Open Preview for a larger view before choosing.</p>

          <div className="template-grid">
            {TEMPLATES.map(template => {
              const isRecommended = template.recommendedFor.includes(state.meta.experienceLevel);
              return (
                <div key={template.id} className={`template-card ${selected === template.id ? 'selected' : ''}`}
                  onClick={() => handleSelect(template.id)} role="button" tabIndex={0}
                  onKeyDown={event => event.key === 'Enter' && handleSelect(template.id)}
                  aria-label={`${template.name} template${isRecommended ? ' - Recommended' : ''}`}>
                  {isRecommended && <div className="badge badge-recommended template-badge">Recommended</div>}
                  <div className="template-preview" aria-hidden="true">
                    <ResumePreview data={TEMPLATE_PREVIEW_DATA} templateId={template.id} accentColor={template.defaultColor} scale={0.22} className="template-thumbnail-resume" />
                  </div>
                  {selected === template.id && <div className="template-check"><ResumeIcon name="finish" size={18} /></div>}
                  <p className="template-name">{template.name}</p>
                  <p className="template-description">{template.description}</p>
                  <button className="template-preview-button" onClick={event => { event.stopPropagation(); setPreviewTemplate(template); }}>
                    Preview layout
                  </button>
                </div>
              );
            })}
          </div>

          <div className="template-actions">
            <button className="btn btn-ghost" onClick={() => navigate('/upload-resume')}>Choose later</button>
            <button className="btn btn-accent btn-lg" onClick={handleContinue} disabled={!selected}>Use this template</button>
          </div>
        </div>
      </main>

      {previewTemplate && (
        <ResumePreviewViewer
          title={`${previewTemplate.name} template preview`}
          onClose={() => setPreviewTemplate(null)}
          renderResume={({ viewerScale }) => (
            <ResumePreview
              data={TEMPLATE_PREVIEW_DATA}
              templateId={previewTemplate.id}
              accentColor={previewTemplate.defaultColor}
              viewerScale={viewerScale}
              className="resume-viewer-preview"
            />
          )}
          footer={<button className="btn btn-accent" onClick={applyPreviewTemplate}>Use {previewTemplate.name}</button>}
        />
      )}
    </div>
  );
}
