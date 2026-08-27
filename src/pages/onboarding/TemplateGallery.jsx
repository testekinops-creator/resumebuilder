import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResume } from '../../context/ResumeContext';
import { filterTemplates, getTemplateTheme, TEMPLATE_CATEGORIES, TEMPLATES } from '../../data/templates';
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
  const [category, setCategory] = useState('all');
  const visibleTemplates = filterTemplates(category);

  const handleSelect = (templateId) => {
    const template = TEMPLATES.find(item => item.id === templateId);
    setSelected(templateId);
    dispatch({ type: 'SET_META', payload: { templateId } });
    if (template) {
      const selectedTheme = getTemplateTheme(template);
      dispatch({
        type: 'SET_DESIGN',
        payload: {
          themePreset: selectedTheme.id,
          colorScheme: selectedTheme.colors.accent,
          headingColor: selectedTheme.colors.heading,
          sidebarColor: selectedTheme.colors.sidebar,
          dividerColor: selectedTheme.colors.divider,
        },
      });
    }
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

          <div className="template-category-filters" role="group" aria-label="Filter resume templates">
            {TEMPLATE_CATEGORIES.map(item => (
              <button
                key={item.id}
                type="button"
                className={`template-category-filter ${category === item.id ? 'active' : ''}`}
                onClick={() => setCategory(item.id)}
                aria-pressed={category === item.id}
              >
                {item.label}
              </button>
            ))}
          </div>

          <p className="template-results-count" aria-live="polite">{visibleTemplates.length} distinct designs</p>

          <div className="template-grid">
            {visibleTemplates.map(template => {
              const isRecommended = template.recommendedFor.includes(state.meta.experienceLevel);
              return (
                <div key={template.id} className={`template-card ${selected === template.id ? 'selected' : ''}`}
                  onClick={() => handleSelect(template.id)} role="button" tabIndex={0}
                  onKeyDown={event => event.key === 'Enter' && handleSelect(template.id)}
                  aria-label={`${template.name} template${isRecommended ? ' - Recommended' : ''}`}>
                  <div className="template-card-badges">
                    {isRecommended && <span className="badge badge-recommended">Recommended</span>}
                    {template.atsFriendly && <span className="template-ats-badge"><ResumeIcon name="shield" size={12} />ATS Friendly</span>}
                  </div>
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
