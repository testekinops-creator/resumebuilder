import { useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResume } from '../../context/ResumeContext';
import { filterTemplates, getTemplateTheme, TEMPLATE_CATEGORIES, TEMPLATES } from '../../data/templates';
import { TEMPLATE_PREVIEW_DATA } from '../../data/templatePreviewData';
import ResumePreview from '../../components/ResumePreview';
import ResumePreviewViewer from '../../components/ResumePreviewViewer';
import Navbar from '../../components/Navbar';
import ResumeIcon from '../../components/ResumeIcon';
import './Onboarding.css';
import './TemplateGallery.css';

export default function TemplateGallery() {
  const navigate = useNavigate();
  const { state, dispatch } = useResume();
  const [selected, setSelected] = useState(state.meta.templateId || '');
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [category, setCategory] = useState('all');
  const [isContinuing, setIsContinuing] = useState(false);
  const continuingRef = useRef(false);
  const keyboardNavigationRef = useRef(false);
  const focusFrameRef = useRef(0);
  const pageRef = useRef(null);
  const actionBarRef = useRef(null);
  const visibleTemplates = filterTemplates(category);
  const selectedTemplate = TEMPLATES.find(template => template.id === selected);

  useLayoutEffect(() => {
    const page = pageRef.current;
    const actionBar = actionBarRef.current;
    if (!page || !actionBar) return undefined;

    // Reserve the real bar height, including wrapped names and safe-area padding.
    const measureActionBar = () => {
      const height = `${Math.ceil(actionBar.getBoundingClientRect().height)}px`;
      page.style.setProperty('--template-action-bar-height', height);
    };
    measureActionBar();
    const observer = new ResizeObserver(measureActionBar);
    observer.observe(actionBar);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(focusFrameRef.current);
    };
  }, []);

  const revealFocusedControl = (event) => {
    const target = event.target;
    if (!keyboardNavigationRef.current || !target.matches('button, .template-card')) return;
    window.cancelAnimationFrame(focusFrameRef.current);
    focusFrameRef.current = window.requestAnimationFrame(() => {
      if (!keyboardNavigationRef.current || !target.isConnected || document.activeElement !== target) return;
      // A card may be taller than the usable viewport; keep its name in view.
      const focusContent = target.classList.contains('template-card') ? target.querySelector('.template-name') : target;
      const bounds = focusContent.getBoundingClientRect();
      const top = (pageRef.current?.querySelector('.navbar')?.getBoundingClientRect().bottom || 0) + 16;
      const bottom = (actionBarRef.current?.getBoundingClientRect().top ?? window.innerHeight) - 16;
      const offset = bounds.bottom > bottom ? bounds.bottom - bottom : bounds.top < top ? bounds.top - top : 0;
      if (offset) window.scrollBy({ top: offset, behavior: 'instant' });
    });
  };

  const handleSelect = (templateId) => {
    const template = TEMPLATES.find(item => item.id === templateId);
    if (!template || continuingRef.current) return;
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

  const handleContinue = (chooseLater = false) => {
    if (continuingRef.current || (!chooseLater && !selectedTemplate)) return;
    // A ref closes the gap before disabled buttons rerender on rapid activation.
    continuingRef.current = true;
    setIsContinuing(true);
    navigate('/upload-resume');
  };

  const applyPreviewTemplate = () => {
    if (previewTemplate) handleSelect(previewTemplate.id);
    setPreviewTemplate(null);
  };

  return (
    <div className="onboarding-page template-gallery-page" ref={pageRef}>
      <Navbar />
      <main id="main-content" className="onboarding-container onboarding-centered">
        <div className="onboarding-content template-gallery-content"
          onKeyDownCapture={event => { if (event.key === 'Tab') keyboardNavigationRef.current = true; }}
          onPointerDownCapture={() => { keyboardNavigationRef.current = false; }}
          onFocusCapture={revealFocusedControl}>
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
                  onKeyDown={event => {
                    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      handleSelect(template.id);
                    }
                  }}
                  aria-pressed={selected === template.id}
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
                  <button type="button" className="template-preview-button" onClick={event => { event.stopPropagation(); setPreviewTemplate(template); }}>
                    Preview layout
                  </button>
                </div>
              );
            })}
          </div>

        </div>
      </main>

      <footer className="template-selection-bar" aria-label="Template confirmation" ref={actionBarRef}>
        <div className="template-selection-bar-inner">
          <p className="template-selection-status" role="status" aria-live="polite" aria-atomic="true">
            <span>{selectedTemplate ? 'Selected:' : 'No template selected'}</span>
            {selectedTemplate && <strong>{selectedTemplate.name}</strong>}
          </p>
          <div className="template-selection-actions">
            <button type="button" className="btn btn-outline-dark" onClick={() => handleContinue(true)} disabled={isContinuing}>Choose later</button>
            <button type="button" className="btn btn-accent" onClick={() => handleContinue()} disabled={!selectedTemplate || isContinuing}>Use this template</button>
          </div>
        </div>
      </footer>

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
