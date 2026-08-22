import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useResume } from '../../context/ResumeContext';
import { COLOR_SCHEMES, FONT_FAMILIES, TEMPLATES } from '../../data/templates';
import { TEMPLATE_PREVIEW_DATA } from '../../data/templatePreviewData';
import ResumePreview from '../../components/ResumePreview';
import ResumePreviewViewer from '../../components/ResumePreviewViewer';
import PrintableResume from '../../components/PrintableResume';
import EmailResumeDialog from '../../components/EmailResumeDialog';
import { getOrderedSectionIds, getSectionColumns, getSectionDisplayName, getSectionEditRoute, isCustomResumeSection } from '../../utils/resumeSections';
import { getResumeQualityReview } from '../../utils/resumeQuality';
import { generateDOCX, generatePDF, printResume } from '../../utils/pdfGenerator';
import {
  dismissFinalizeWelcome,
  exportResumeJSON,
  isFinalizeWelcomeDismissed,
} from '../../utils/storage';
import AuthModal from '../../components/AuthModal';
import { DndContext, DragOverlay, KeyboardSensor, closestCenter, PointerSensor, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ResumeIcon from '../../components/ResumeIcon';
import { useTheme } from '../../hooks/useTheme';
import './FinalEditor.css';

const PAGE_BORDER_OPTIONS = [
  { id: 'none', label: 'None', description: 'No outer page border' },
  { id: 'thin', label: 'Thin', description: '0.75pt accent border' },
  { id: 'medium', label: 'Medium', description: '1.5pt accent border' },
  { id: 'thick', label: 'Thick', description: '3pt accent border' },
];

export default function FinalEditor() {
  // Finalize can be opened directly, outside a page that exposes the theme
  // switcher. Initializing the hook here keeps the panel and live thumbnails
  // in the saved light/dark theme after a reload.
  useTheme();
  const { state, dispatch, completeness, canUndo, canRedo } = useResume();
  const location = useLocation();
  const navigate = useNavigate();
  const design = state.design;
  const [activeTab, setActiveTab] = useState('templates');
  const [zoom, setZoom] = useState(100);
  const [resumeName, setResumeName] = useState(state.meta.name ?? 'My Resume');
  const [showMenu, setShowMenu] = useState(false);
  const [showWelcome, setShowWelcome] = useState(
    () => !isFinalizeWelcomeDismissed(state.meta?.id),
  );
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPreviewViewer, setShowPreviewViewer] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [generating, setGenerating] = useState('');
  const [notification, setNotification] = useState(null);
  const [selectedSection, setSelectedSection] = useState(() => location.state?.focusSection || '');
  const [hoveredSection, setHoveredSection] = useState('');
  const [focusSection, setFocusSection] = useState(() => location.state?.focusSection || '');
  const [focusRequest, setFocusRequest] = useState(0);
  const [sectionPendingDelete, setSectionPendingDelete] = useState('');
  const [sectionPendingRename, setSectionPendingRename] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [showSectionReorder, setShowSectionReorder] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const previewRef = useRef(null);
  const sectionsPanelRef = useRef(null);
  const exportJobRef = useRef('');

  const showNotification = useCallback(({ type = 'error', title, message }) => {
    setNotification({ id: Date.now(), type, title, message });
  }, []);

  const selectPreviewSection = useCallback((sectionId) => {
    setSelectedSection(sectionId);
    setActiveTab('sections');
  }, []);

  const focusPreviewSection = useCallback((sectionId) => {
    setSelectedSection(sectionId);
    setFocusSection(sectionId);
    setFocusRequest(request => request + 1);
  }, []);

  useEffect(() => {
    const returnedSection = location.state?.focusSection;
    if (!returnedSection) return undefined;

    focusPreviewSection(returnedSection);
    const clearFocus = window.setTimeout(() => setFocusSection(''), 1900);
    return () => window.clearTimeout(clearFocus);
  }, [focusPreviewSection, location.key, location.state?.focusSection]);

  useEffect(() => {
    if (!showMobileActions) return undefined;

    const mobileQuery = window.matchMedia('(max-width: 900px)');
    if (!mobileQuery.matches) {
      setShowMobileActions(false);
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setShowMobileActions(false);
    };
    const closeOnDesktop = (event) => {
      if (!event.matches) setShowMobileActions(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    mobileQuery.addEventListener('change', closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
      mobileQuery.removeEventListener('change', closeOnDesktop);
    };
  }, [showMobileActions]);

  useEffect(() => {
    if (!notification) return undefined;
    const timeout = window.setTimeout(() => setNotification(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [notification]);

  const handleDownload = async (format = 'pdf') => {
    const exportFormat = typeof format === 'string' ? format : 'pdf';
    if (!['pdf', 'docx'].includes(exportFormat) || exportJobRef.current) return;

    exportJobRef.current = exportFormat;
    setGenerating(exportFormat);
    try {
      if (exportFormat === 'docx') {
        await generateDOCX({ state, resumeName });
      } else {
        await generatePDF({ state, resumeName });
      }
    } catch (error) {
      console.error('Resume export failed', {
        format: exportFormat,
        template: state.meta?.templateId,
        resumeId: state.meta?.id,
        stage: error?.exportStage || 'unknown',
        status: error?.status,
        error: error instanceof Error ? error.message : String(error),
      });
      showNotification({
        title: `${exportFormat.toUpperCase()} download failed`,
        message: `We couldn't generate your ${exportFormat.toUpperCase()}. Your resume is still saved. Please try again.`,
      });
    } finally {
      exportJobRef.current = '';
      setGenerating('');
    }
  };

  const handlePrint = async () => {
    if (exportJobRef.current) return;

    exportJobRef.current = 'print';
    setGenerating('print');
    try {
      document.body.classList.add('resume-printing');
      await printResume();
    } catch (error) {
      console.error('Resume print failed', {
        template: state.meta?.templateId,
        resumeId: state.meta?.id,
        stage: error?.exportStage || 'unknown',
        error: error instanceof Error ? error.message : String(error),
      });
      showNotification({
        title: 'Print preview failed',
        message: "We couldn't prepare your resume for printing. Your resume is still saved. Please try again.",
      });
    } finally {
      document.body.classList.remove('resume-printing');
      exportJobRef.current = '';
      setGenerating('');
    }
  };

  const dismissWelcome = () => {
    dismissFinalizeWelcome(state.meta?.id);
    setShowWelcome(false);
  };

  const selectTemplate = (template) => {
    dispatch({ type: 'SET_META', payload: { templateId: template.id } });
    dispatch({ type: 'SET_DESIGN', payload: { colorScheme: template.defaultColor } });
  };

  const handleNameChange = (event) => {
    const name = event.target.value.slice(0, 50);
    setResumeName(name);
    dispatch({ type: 'SET_META', payload: { name } });
  };

  const selectedSectionName = selectedSection ? getSectionDisplayName(state, selectedSection) : '';
  const reviewFindings = getResumeQualityReview(state);

  const editSelectedSection = () => {
    const route = getSectionEditRoute(state, selectedSection);
    if (!route) return;
    navigate(`/builder/${route}`, {
      state: { returnTo: '/finalize', focusSection: selectedSection },
    });
  };

  const requestRenameSelectedSection = () => {
    if (!selectedSection) return;
    setRenameValue(getSectionDisplayName(state, selectedSection));
    setSectionPendingRename(selectedSection);
  };

  const saveSectionRename = (event) => {
    event.preventDefault();
    const nextTitle = renameValue.trim();
    if (!nextTitle || !sectionPendingRename) return;

    if (isCustomResumeSection(state, sectionPendingRename)) {
      dispatch({ type: 'UPDATE_CUSTOM_SECTION', payload: { id: sectionPendingRename, title: nextTitle } });
    } else {
      dispatch({ type: 'SET_SECTION_TITLE', payload: { sectionId: sectionPendingRename, title: nextTitle } });
    }

    focusPreviewSection(sectionPendingRename);
    setSectionPendingRename('');
  };

  const confirmSectionDelete = () => {
    if (!sectionPendingDelete) return;
    dispatch({
      type: isCustomResumeSection(state, sectionPendingDelete) ? 'REMOVE_CUSTOM_SECTION' : 'REMOVE_SECTION',
      payload: sectionPendingDelete,
    });
    setSelectedSection('');
    setFocusSection('');
    setSectionPendingDelete('');
  };

  const tabs = [
    { id: 'templates', label: 'Templates', icon: 'template' },
    { id: 'design', label: 'Design', icon: 'design' },
    { id: 'sections', label: 'Sections', icon: 'sections' },
  ];
  const scoreColor = completeness >= 80 ? 'var(--color-success)' : completeness >= 50 ? 'var(--color-warning)' : 'var(--color-error)';

  return (
    <div className="final-editor">
      <header className="fe-topbar">
        <div className="fe-topbar-left">
          <Link to="/builder/smart-apply" className="fe-back-link"><ResumeIcon name="arrowLeft" size={16} />Back</Link>
          <input className="fe-resume-name" type="text" value={resumeName}
            onChange={handleNameChange} maxLength={50} aria-label="Resume name" />
          <div className="fe-menu-wrapper">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowMenu(!showMenu)}>More</button>
            {showMenu && (
              <div className="fe-dropdown">
                <button onClick={() => { exportResumeJSON(state); setShowMenu(false); }}><ResumeIcon name="save" size={16} />Export JSON Backup</button>
                <button onClick={() => { dispatch({ type: 'RESET' }); setResumeName('My Resume'); setShowMenu(false); }}><ResumeIcon name="delete" size={16} />Start New Resume</button>
              </div>
            )}
          </div>
        </div>
        <div className="fe-topbar-center">
          <button className="btn btn-icon btn-ghost" disabled={!canUndo} onClick={() => dispatch({ type: 'UNDO' })} title="Undo" aria-label="Undo"><ResumeIcon name="undo" /></button>
          <button className="btn btn-icon btn-ghost" disabled={!canRedo} onClick={() => dispatch({ type: 'REDO' })} title="Redo" aria-label="Redo"><ResumeIcon name="redo" /></button>
          <span className="fe-divider" />
          <button className="btn btn-icon btn-ghost" onClick={() => setZoom(value => Math.max(value - 10, 50))} title="Zoom out">−</button>
          <span className="fe-zoom">{zoom}%</span>
          <button className="btn btn-icon btn-ghost" onClick={() => setZoom(value => Math.min(value + 10, 150))} title="Zoom in">+</button>
        </div>
        <div className="fe-topbar-right"><span className="fe-saved"><ResumeIcon name="finish" size={15} />Saved</span></div>
      </header>

      <div className="fe-body">
        <aside className="fe-tools" ref={sectionsPanelRef}>
          <div className="fe-tool-tabs">
            {tabs.map(tab => (
              <button key={tab.id} className={`fe-tool-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}><ResumeIcon name={tab.icon} size={16} />{tab.label}</button>
            ))}
          </div>

          <div className="fe-tool-content">
            {activeTab === 'templates' && (
              <div className="fe-templates-panel">
                <h3>Colors</h3>
                <div className="fe-color-swatches">
                  {COLOR_SCHEMES.map(color => (
                    <button key={color.id}
                      className={`fe-swatch ${design.colorScheme === color.value ? 'active' : ''}`}
                      style={{ backgroundColor: color.value, border: color.value === '#FFFFFF' ? '2px solid var(--color-border)' : 'none' }}
                      onClick={() => dispatch({ type: 'SET_DESIGN', payload: { colorScheme: color.value } })}
                      title={color.label} aria-label={`Color ${color.label}`} />
                  ))}
                </div>

                <h3 style={{ marginTop: 'var(--space-6)' }}>All templates</h3>
                <div className="fe-template-grid">
                  {TEMPLATES.map(template => (
                    <div key={template.id} className={`fe-template-thumb ${state.meta.templateId === template.id ? 'active' : ''}`}
                      onClick={() => selectTemplate(template)} role="button" tabIndex={0}
                      onKeyDown={event => {
                        if (!['Enter', ' '].includes(event.key)) return;
                        event.preventDefault();
                        selectTemplate(template);
                      }}>
                      <div className="fe-thumb-preview">
                        <ResumePreview
                          data={TEMPLATE_PREVIEW_DATA}
                          templateId={template.id}
                          accentColor={template.defaultColor}
                          scale={0.15}
                          className="fe-template-thumbnail"
                        />
                      </div>
                      <span className="fe-thumb-name">{template.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'design' && (
              <div className="fe-design-panel">
                <h3>Accent Color</h3>
                <label className="fe-color-control">
                  <input type="color" value={design.colorScheme || '#6B21A8'}
                    onChange={event => dispatch({ type: 'SET_DESIGN', payload: { colorScheme: event.target.value } })}
                    aria-label="Custom accent color" />
                  <span>Choose a custom color</span>
                </label>

                <h3 style={{ marginTop: 'var(--space-6)' }}>Font Family</h3>
                <select className="form-input form-select" value={design.fontFamily}
                  onChange={event => dispatch({ type: 'SET_DESIGN', payload: { fontFamily: event.target.value } })}>
                  {FONT_FAMILIES.map(font => <option key={font} value={font}>{font}</option>)}
                </select>

                <h3 style={{ marginTop: 'var(--space-6)' }}>Font Size</h3>
                <div className="fe-font-size-buttons">
                  {['small', 'normal', 'large'].map(size => (
                    <button key={size} className={`btn btn-sm ${design.fontStyle === size ? 'btn-accent' : 'btn-outline'}`}
                      onClick={() => dispatch({ type: 'SET_DESIGN', payload: { fontStyle: size } })}>{size[0].toUpperCase()}</button>
                  ))}
                </div>

                <h3 className="fe-border-title" style={{ marginTop: 'var(--space-6)' }}>
                  Page Border <span className="fe-premium-badge">Premium</span>
                </h3>
                <p className="fe-border-description">Uses your accent color in the preview and PDF.</p>
                <div className="fe-page-border-options" role="group" aria-label="Page Border">
                  {PAGE_BORDER_OPTIONS.map(option => (
                    <button key={option.id} type="button"
                      className={`fe-page-border-option ${design.pageBorder === option.id ? 'active' : ''}`}
                      onClick={() => dispatch({ type: 'SET_DESIGN', payload: { pageBorder: option.id } })}
                      aria-pressed={design.pageBorder === option.id}
                      title={option.description}>
                      {option.label}
                    </button>
                  ))}
                </div>

                <DesignRange label="Page Margins" value={design.pageMargin ?? 32} min="20" max="48" unit="px"
                  onChange={value => dispatch({ type: 'SET_DESIGN', payload: { pageMargin: value } })} />
                <DesignRange label="Section Spacing" value={design.sectionSpacing ?? 50}
                  onChange={value => dispatch({ type: 'SET_DESIGN', payload: { sectionSpacing: value } })} />
                <DesignRange label="Paragraph Spacing" value={design.paragraphSpacing ?? 50}
                  onChange={value => dispatch({ type: 'SET_DESIGN', payload: { paragraphSpacing: value } })} />
                <DesignRange label="Line Spacing" value={design.lineSpacing ?? 50}
                  onChange={value => dispatch({ type: 'SET_DESIGN', payload: { lineSpacing: value } })} />
                <DesignRange label="Heading Spacing" value={design.headingLetterSpacing ?? 0.5} min="-1" max="3" step="0.25" unit="px"
                  onChange={value => dispatch({ type: 'SET_DESIGN', payload: { headingLetterSpacing: value } })} />

                <button className="btn btn-ghost btn-sm fe-reset-design" onClick={() => dispatch({ type: 'SET_DESIGN', payload: {
                  colorScheme: '#6B21A8', fontFamily: 'Inter', fontStyle: 'normal', pageMargin: 32,
                  sectionSpacing: 50, paragraphSpacing: 50, lineSpacing: 50, headingLetterSpacing: 0.5, pageBorder: 'none',
                } })}><ResumeIcon name="undo" size={16} />Reset to Default</button>
              </div>
            )}

            {activeTab === 'sections' && (
              <SectionsPanel
                state={state}
                dispatch={dispatch}
                selectedSection={selectedSection}
                hoveredSection={hoveredSection}
                onSectionSelect={focusPreviewSection}
                onSectionHover={setHoveredSection}
                scrollContainerRef={sectionsPanelRef}
              />
            )}
          </div>
        </aside>

        {selectedSection && (
          <div className="fe-mobile-quick-actions">
            <SectionQuickActions
              sectionName={selectedSectionName}
              canEdit={Boolean(getSectionEditRoute(state, selectedSection))}
              onEdit={editSelectedSection}
              onDelete={() => setSectionPendingDelete(selectedSection)}
              onRename={requestRenameSelectedSection}
              onReorder={() => { setActiveTab('sections'); setShowSectionReorder(true); }}
            />
          </div>
        )}

        <main className="fe-main">
          {selectedSection && (
            <SectionQuickActions
              sectionName={selectedSectionName}
              canEdit={Boolean(getSectionEditRoute(state, selectedSection))}
              onEdit={editSelectedSection}
              onDelete={() => setSectionPendingDelete(selectedSection)}
              onRename={requestRenameSelectedSection}
              onReorder={() => { setActiveTab('sections'); setShowSectionReorder(true); }}
            />
          )}
          <div className="fe-preview-scroll" aria-label="Resume preview">
            <div className="fe-resume-wrapper" ref={previewRef}>
              <ResumePreview
                scale={zoom / 100}
                interactive
                selectedSection={selectedSection}
                hoveredSection={hoveredSection}
                focusSection={focusSection}
                focusRequest={focusRequest}
                onSectionSelect={selectPreviewSection}
                onSectionHover={setHoveredSection}
                onPageCountChange={setPageCount}
              />
            </div>
          </div>
        </main>

        <aside className="fe-actions">
          <div className="fe-score-card">
            <div className="fe-score-circle" style={{ '--score-color': scoreColor, '--score-pct': completeness }}>
              <svg viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="35" fill="none" stroke="var(--color-border)" strokeWidth="5" />
                <circle cx="40" cy="40" r="35" fill="none" stroke={scoreColor} strokeWidth="5"
                  strokeDasharray={`${completeness * 2.2} 220`} strokeLinecap="round" transform="rotate(-90, 40, 40)" />
              </svg>
              <span className="fe-score-value">{completeness}</span>
            </div>
            <span className="fe-score-label">Profile completion</span>
          </div>
          <div className="fe-page-count" aria-live="polite">
            <ResumeIcon name="document" size={16} />
            <span>{pageCount} {pageCount === 1 ? 'page' : 'pages'} in preview</span>
          </div>
          <ResumeReview findings={reviewFindings} id="resume-review-title" />
          <FinalizeActionButtons
            generating={generating}
            onDownload={handleDownload}
            onPrint={handlePrint}
            onEmail={() => setShowEmailDialog(true)}
            onFinish={() => setShowAuthModal(true)}
          />
        </aside>
      </div>

      <section className="fe-mobile-summary" aria-labelledby="mobile-finalize-title">
        <div className="fe-mobile-completion">
          <div>
            <h2 id="mobile-finalize-title">Ready to finish</h2>
            <span>{completeness}% complete</span>
          </div>
          <span className="fe-mobile-page-count"><ResumeIcon name="document" size={16} />{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
          <div className="fe-mobile-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={completeness}>
            <span style={{ width: `${completeness}%`, background: scoreColor }} />
          </div>
        </div>
        <ResumeReview findings={reviewFindings} id="mobile-resume-review-title" />
        <FinalizeActionButtons
          generating={generating}
          onDownload={handleDownload}
          onPrint={handlePrint}
          onEmail={() => setShowEmailDialog(true)}
          onFinish={() => setShowAuthModal(true)}
          onPreview={() => setShowPreviewViewer(true)}
        />
      </section>

      <nav className="fe-mobile-primary-bar" aria-label="Finalize resume actions">
        <button className="btn btn-outline-dark" onClick={() => setShowPreviewViewer(true)}>
          <ResumeIcon name="preview" size={18} />Preview
        </button>
        <button className="btn btn-primary" onClick={() => handleDownload('pdf')} disabled={Boolean(generating)}>
          <ResumeIcon name="download" size={18} />{generating === 'pdf' ? 'Preparing...' : 'PDF'}
        </button>
        <button className="btn btn-outline-dark" onClick={() => setShowMobileActions(true)} aria-haspopup="dialog">
          <ResumeIcon name="more" size={18} />More
        </button>
        <button className="btn btn-outline-dark" onClick={() => setShowAuthModal(true)}>
          <ResumeIcon name="finish" size={18} />Finish
        </button>
      </nav>

      {showMobileActions && (
        <div className="fe-mobile-actions-backdrop" role="presentation" onMouseDown={() => setShowMobileActions(false)}>
          <section className="fe-mobile-actions-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-actions-title" onMouseDown={event => event.stopPropagation()}>
            <div className="fe-mobile-actions-heading">
              <div>
                <h2 id="mobile-actions-title">Download and share</h2>
                <p>Choose what you want to do with this resume.</p>
              </div>
              <button type="button" className="btn btn-icon btn-ghost" onClick={() => setShowMobileActions(false)} aria-label="Close resume actions" autoFocus>
                <ResumeIcon name="close" size={20} />
              </button>
            </div>
            <div className="fe-mobile-actions-grid">
              <button type="button" className="btn btn-outline-dark" onClick={() => { setShowMobileActions(false); handleDownload('docx'); }} disabled={Boolean(generating)}>
                <ResumeIcon name="download" size={19} />{generating === 'docx' ? 'Preparing...' : 'DOCX'}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => { setShowMobileActions(false); handleDownload('pdf'); }} disabled={Boolean(generating)}>
                <ResumeIcon name="download" size={19} />{generating === 'pdf' ? 'Preparing...' : 'PDF'}
              </button>
              <button type="button" className="btn btn-outline-dark" onClick={() => { setShowMobileActions(false); handlePrint(); }} disabled={Boolean(generating)}>
                <ResumeIcon name="print" size={19} />{generating === 'print' ? 'Preparing...' : 'Print'}
              </button>
              <button type="button" className="btn btn-outline-dark" onClick={() => { setShowMobileActions(false); setShowEmailDialog(true); }} disabled={Boolean(generating)}>
                <ResumeIcon name="email" size={19} />Email
              </button>
            </div>
          </section>
        </div>
      )}

      {generating && <div className="loading-overlay" aria-live="polite"><div className="spinner" /><p>{generating === 'print' ? 'Preparing print preview...' : `Preparing your ${generating.toUpperCase()}...`}</p></div>}
      {sectionPendingDelete && (
        <SectionDialog
          title={`Delete ${getSectionDisplayName(state, sectionPendingDelete)}?`}
          description="This removes the complete section from your resume. You can restore it with Undo."
          confirmLabel="Delete"
          onCancel={() => setSectionPendingDelete('')}
          onConfirm={confirmSectionDelete}
        />
      )}
      {sectionPendingRename && (
        <div className="fe-section-dialog-backdrop" role="presentation" onMouseDown={() => setSectionPendingRename('')}>
          <form className="fe-section-dialog" role="dialog" aria-modal="true" aria-labelledby="rename-section-title" onSubmit={saveSectionRename} onMouseDown={event => event.stopPropagation()}>
            <h2 id="rename-section-title">Rename section</h2>
            <p>Use a title that best describes this part of your resume.</p>
            <label className="form-label" htmlFor="section-rename">Section title</label>
            <input id="section-rename" className="form-input" value={renameValue} onChange={event => setRenameValue(event.target.value)} maxLength={60} autoFocus />
            <div className="fe-section-dialog-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setSectionPendingRename('')}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={!renameValue.trim()}>Save name</button>
            </div>
          </form>
        </div>
      )}
      {showSectionReorder && (
        <SectionReorderDialog
          state={state}
          dispatch={dispatch}
          selectedSection={selectedSection}
          hoveredSection={hoveredSection}
          onSectionSelect={focusPreviewSection}
          onSectionHover={setHoveredSection}
          onClose={() => setShowSectionReorder(false)}
        />
      )}
      {showWelcome && (
        <div className="mobile-preview-overlay" style={{ zIndex: 1000 }} onClick={dismissWelcome}>
          <div className="mobile-preview-content fe-welcome-card" onClick={event => event.stopPropagation()}>
            <button className="fe-close-btn" onClick={dismissWelcome} aria-label="Dismiss welcome message" title="Dismiss welcome message"><ResumeIcon name="close" size={20} /></button>
            <h2>Great work, {state.contact.firstName || 'there'}!</h2>
            <p>Your resume is looking good. We're just one step away from finalizing it!</p>
            <button className="btn btn-primary" onClick={dismissWelcome}>Got it</button>
          </div>
        </div>
      )}
      {showPreviewViewer && (
        <ResumePreviewViewer
          title={`${resumeName || 'My Resume'} preview`}
          onClose={() => setShowPreviewViewer(false)}
          renderResume={({ viewerScale }) => (
            <ResumePreview viewerScale={viewerScale} className="resume-viewer-preview" onPageCountChange={setPageCount} />
          )}
        />
      )}
      <PrintableResume state={state} />
      {showEmailDialog && (
        <EmailResumeDialog
          state={state}
          resumeName={resumeName}
          onClose={() => setShowEmailDialog(false)}
        />
      )}
      {notification && (
        <div className="toast-container" role="region" aria-label="Notifications">
          <div className={`toast toast-${notification.type}`} role={notification.type === 'error' ? 'alert' : 'status'}>
            <ResumeIcon name={notification.type === 'error' ? 'info' : 'finish'} size={20} />
            <div className="toast-message">
              <strong>{notification.title}</strong>
              <span>{notification.message}</span>
            </div>
            <button type="button" className="toast-close" onClick={() => setNotification(null)} aria-label="Dismiss notification">×</button>
          </div>
        </div>
      )}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}

function ResumeReview({ findings, id }) {
  const visibleFindings = findings.slice(0, 3);
  return (
    <section className="fe-resume-review" aria-labelledby={id}>
      <div className="fe-resume-review-heading">
        <h2 id={id}>Resume review</h2>
        <span>{findings.length ? `${findings.length} to review` : 'Looking complete'}</span>
      </div>
      {visibleFindings.length ? (
        <ul>
          {visibleFindings.map(finding => (
            <li key={finding.id} className={`is-${finding.level}`}>
              <strong>{finding.title}</strong>
              <span>{finding.message}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>Core resume details are present. Review each section for relevance before exporting.</p>
      )}
      {findings.length > visibleFindings.length && <p className="fe-resume-review-more">+{findings.length - visibleFindings.length} more helpful checks</p>}
    </section>
  );
}

function FinalizeActionButtons({ generating, onDownload, onPrint, onEmail, onFinish, onPreview }) {
  return (
    <div className="fe-action-buttons">
      {onPreview && (
        <button className="btn btn-outline-dark fe-action-button fe-preview-button" onClick={onPreview}>
          <ResumeIcon name="preview" size={18} />Preview resume
        </button>
      )}
      <button className="btn btn-outline-dark fe-action-button fe-export-button fe-docx-button" onClick={() => onDownload('docx')} disabled={Boolean(generating)} aria-label="Download DOCX" title="Download DOCX">
        <ResumeIcon name="download" size={18} />{generating === 'docx' ? 'Preparing...' : 'DOCX'}
      </button>
      <button className="btn btn-primary fe-action-button fe-export-button fe-pdf-button" onClick={() => onDownload('pdf')} disabled={Boolean(generating)} aria-label="Download PDF" title="Download a vector PDF of your resume">
        <ResumeIcon name="download" size={18} />{generating === 'pdf' ? 'Preparing...' : 'PDF'}
      </button>
      <div className="fe-utility-actions" aria-label="Other resume actions">
        <button className="btn btn-outline-dark fe-action-button" onClick={onPrint} disabled={Boolean(generating)}><ResumeIcon name="print" size={17} />{generating === 'print' ? 'Preparing...' : 'Print'}</button>
        <button className="btn btn-outline-dark fe-action-button" onClick={onEmail} disabled={Boolean(generating)}><ResumeIcon name="email" size={17} />Email</button>
      </div>
      <button className="btn btn-ghost fe-action-button fe-finish-button" onClick={onFinish}><ResumeIcon name="finish" size={17} />Finish</button>
    </div>
  );
}

function SectionQuickActions({ sectionName, canEdit, onEdit, onDelete, onRename, onReorder }) {
  return (
    <div className="fe-section-quick-actions" role="toolbar" aria-label={`Actions for ${sectionName}`}>
      <span className="fe-section-selected-label">
        <span className="fe-section-selected-prefix">Selected:</span>
        <span className="fe-section-selected-name" title={sectionName}>{sectionName}</span>
      </span>
      <span className="fe-section-action-controls">
        {canEdit && <button type="button" className="btn btn-sm btn-outline-dark" onClick={onEdit} title={`View or edit ${sectionName}`} aria-label={`View or edit ${sectionName}`}><ResumeIcon name="edit" size={16} /><span className="fe-quick-action-label">Edit</span></button>}
        <button type="button" className="btn btn-sm btn-outline-dark" onClick={onRename} title="Rename section" aria-label={`Rename ${sectionName}`}><ResumeIcon name="rename" size={16} /><span className="fe-quick-action-label">Rename</span></button>
        <button type="button" className="btn btn-sm btn-outline-dark" onClick={onReorder} title="Open section reorder controls" aria-label="Reorder resume sections"><ResumeIcon name="reorder" size={16} /><span className="fe-quick-action-label">Reorder</span></button>
        <button type="button" className="btn btn-sm fe-section-delete-btn" onClick={onDelete} title={`Delete ${sectionName}`} aria-label={`Delete ${sectionName}`}><ResumeIcon name="delete" size={16} /></button>
      </span>
    </div>
  );
}

function SectionDialog({ title, description, confirmLabel, onCancel, onConfirm }) {
  return (
    <div className="fe-section-dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <div className="fe-section-dialog" role="dialog" aria-modal="true" aria-labelledby="section-dialog-title" onMouseDown={event => event.stopPropagation()}>
        <h2 id="section-dialog-title">{title}</h2>
        <p>{description}</p>
        <div className="fe-section-dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn fe-section-delete-btn" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function DesignRange({ label, value, min = '0', max = '100', step = '1', unit = '%', onChange }) {
  return (
    <label className="fe-design-range">
      <span>{label}<output>{value}{unit}</output></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} />
    </label>
  );
}

const ADD_SECTION_OPTIONS = [
  { id: 'languages', label: 'Languages', route: 'languages' },
  { id: 'websites', label: 'Websites, Portfolios, Profiles', route: 'websites' },
  { id: 'certifications', label: 'Certifications', route: 'certifications' },
  { id: 'projects', label: 'Projects', route: 'custom-sections' },
  { id: 'achievements', label: 'Achievements', route: 'custom-sections' },
  { id: 'awards', label: 'Awards', route: 'custom-sections' },
  { id: 'publications', label: 'Publications', route: 'custom-sections' },
  { id: 'custom', label: 'Custom Section', route: 'custom-sections', allowMultiple: true },
];

function AddSectionButton({ option, added, onAdd }) {
  return (
    <button
      type="button"
      className={`fe-section-add-btn ${added ? 'is-added' : ''}`}
      onClick={() => onAdd(option)}
      disabled={added}
      aria-label={added ? `${option.label} already added` : `Add ${option.label}`}
    >
      <span className="fe-section-add-icon" aria-hidden="true"><ResumeIcon name={added ? 'finish' : 'add'} size={20} /></span>
      <span className="fe-section-add-label">{option.label}</span>
      {added && <span className="fe-section-added-state">Added</span>}
    </button>
  );
}

const SECTION_LAYOUT_COLUMNS = [
  { id: 'sidebar', label: 'Left column', description: 'Sidebar' },
  { id: 'main', label: 'Right column', description: 'Main content' },
];

const sectionColumnDropId = column => `section-column-${column}`;

function SortableItem({
  id,
  label,
  index,
  count,
  column,
  selected,
  hovered,
  onMove,
  onMoveToColumn,
  onSelect,
  onHover,
  registerItem,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id });
  const moveTarget = column === 'sidebar' ? 'main' : 'sidebar';
  const moveTargetLabel = column === 'sidebar' ? 'right column' : 'left column';
  const setRefs = (node) => {
    setNodeRef(node);
    registerItem?.(node);
  };
  return (
    <div
      ref={setRefs}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1, zIndex: isDragging ? 10 : 1 }}
      className={`fe-sortable-item ${selected ? 'is-selected' : ''} ${hovered ? 'is-hovered' : ''} ${isDragging ? 'is-dragging' : ''} ${isOver && !isDragging ? 'is-drop-target' : ''}`}
      data-section-id={id}
      onClick={() => onSelect?.(id)}
      onMouseEnter={() => onHover?.(id)}
      onMouseLeave={() => onHover?.('')}
      {...attributes}
    >
      <span className="fe-drag-handle" {...listeners} title="Drag to reorder"><ResumeIcon name="drag" size={18} /></span>
      <span className="fe-sortable-label">{label}</span>
      <span className="fe-section-move-controls" aria-label={`Move ${label}`}>
        <button type="button" className="btn btn-icon btn-ghost fe-section-move-btn" onClick={() => onMove(id, -1)} disabled={index === 0} aria-label={`Move ${label} up`} title={`Move ${label} up`}><ResumeIcon name="arrowUp" size={15} /></button>
        <button type="button" className="btn btn-icon btn-ghost fe-section-move-btn fe-section-move-down" onClick={() => onMove(id, 1)} disabled={index === count - 1} aria-label={`Move ${label} down`} title={`Move ${label} down`}><ResumeIcon name="arrowUp" size={15} /></button>
      </span>
      {onMoveToColumn && (
        <button type="button" className="btn btn-icon btn-ghost fe-section-column-btn" onClick={() => onMoveToColumn(id, moveTarget)} aria-label={`Move ${label} to the ${moveTargetLabel}`} title={`Move to ${moveTargetLabel}`}>
          <ResumeIcon name={column === 'sidebar' ? 'arrowRight' : 'arrowLeft'} size={15} />
        </button>
      )}
    </div>
  );
}

function SectionColumn({
  column,
  items,
  state,
  selectedSection,
  hoveredSection,
  onMove,
  onMoveToColumn,
  onSectionSelect,
  onSectionHover,
  registerItem,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: sectionColumnDropId(column.id) });
  return (
    <section ref={setNodeRef} className={`fe-section-layout-column ${isOver ? 'is-drop-zone-active' : ''}`} aria-label={`${column.label}: ${column.description}`}>
      <header className="fe-section-layout-column-header">
        <span>{column.label}</span>
        <small>{column.description}</small>
      </header>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="fe-section-layout-column-items">
          {items.map((id, index) => (
            <SortableItem
              key={id}
              id={id}
              label={getSectionDisplayName(state, id)}
              index={index}
              count={items.length}
              column={column.id}
              selected={id === selectedSection}
              hovered={id === hoveredSection}
              onMove={(sectionId, direction) => onMove(column.id, sectionId, direction)}
              onMoveToColumn={onMoveToColumn}
              onSelect={onSectionSelect}
              onHover={onSectionHover}
              registerItem={node => registerItem(id, node)}
            />
          ))}
          {!items.length && <p className="fe-section-layout-empty">Drop a section here</p>}
        </div>
      </SortableContext>
    </section>
  );
}

function SectionOrderList({
  state,
  dispatch,
  selectedSection = '',
  hoveredSection = '',
  onSectionSelect,
  onSectionHover,
  scrollContainerRef,
}) {
  const sectionOrder = getOrderedSectionIds(state);
  const selectedTemplate = TEMPLATES.find(template => template.id === state.meta?.templateId);
  const supportsColumns = selectedTemplate?.layout === '2-column';
  const sectionColumns = getSectionColumns(state);
  const [activeId, setActiveId] = useState(null);
  const itemRefs = useRef(new Map());
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const registerItem = (sectionId, node) => {
    if (node) itemRefs.current.set(sectionId, node);
    else itemRefs.current.delete(sectionId);
  };

  const scrollSectionItemIntoView = useCallback((sectionId) => {
    const item = itemRefs.current.get(sectionId);
    const container = scrollContainerRef?.current;
    if (!item) return;

    if (!container) {
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const padding = 12;
    const isOutsideView = itemRect.top < containerRect.top + padding
      || itemRect.bottom > containerRect.bottom - padding;
    if (!isOutsideView) return;

    const targetTop = container.scrollTop
      + (itemRect.top - containerRect.top)
      - ((container.clientHeight - item.offsetHeight) / 2);
    container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  }, [scrollContainerRef]);

  useEffect(() => {
    if (selectedSection) scrollSectionItemIntoView(selectedSection);
  }, [scrollSectionItemIntoView, selectedSection]);

  useEffect(() => {
    if (hoveredSection) scrollSectionItemIntoView(hoveredSection);
  }, [hoveredSection, scrollSectionItemIntoView]);

  const updateTwoColumnLayout = (columns) => {
    const nextColumns = Object.fromEntries([
      ...columns.sidebar.map(id => [id, 'sidebar']),
      ...columns.main.map(id => [id, 'main']),
    ]);
    dispatch({
      type: 'UPDATE_SECTION_LAYOUT',
      payload: { sectionOrder: [...columns.sidebar, ...columns.main], sectionColumns: nextColumns },
    });
  };

  const columnForDropId = (dropId) => {
    if (dropId === sectionColumnDropId('sidebar')) return 'sidebar';
    if (dropId === sectionColumnDropId('main')) return 'main';
    if (sectionColumns.sidebar.includes(dropId)) return 'sidebar';
    if (sectionColumns.main.includes(dropId)) return 'main';
    return null;
  };

  const handleDragEnd = ({ active, over }) => {
    if (!over) {
      setActiveId(null);
      return;
    }

    if (active.id === over.id) {
      setActiveId(null);
      return;
    }

    if (!supportsColumns) {
      const newOrder = arrayMove(sectionOrder, sectionOrder.indexOf(active.id), sectionOrder.indexOf(over.id));
      dispatch({ type: 'REORDER_SECTIONS', payload: newOrder });
    }

    if (supportsColumns) {
      const activeColumn = columnForDropId(active.id);
      const targetColumn = columnForDropId(over.id);
      if (activeColumn && targetColumn) {
        const nextLayout = {
          sidebar: [...sectionColumns.sidebar],
          main: [...sectionColumns.main],
        };
        const activeIndex = nextLayout[activeColumn].indexOf(active.id);

        if (activeIndex >= 0) {
          nextLayout[activeColumn].splice(activeIndex, 1);
          const targetItems = nextLayout[targetColumn];
          const overIndex = over.id === sectionColumnDropId(targetColumn)
            ? targetItems.length
            : targetItems.indexOf(over.id);
          targetItems.splice(overIndex < 0 ? targetItems.length : overIndex, 0, active.id);
          updateTwoColumnLayout(nextLayout);
        }
      }
    }
    setActiveId(null);
  };

  const moveSection = (sectionId, direction) => {
    const currentIndex = sectionOrder.indexOf(sectionId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= sectionOrder.length) return;
    dispatch({ type: 'REORDER_SECTIONS', payload: arrayMove(sectionOrder, currentIndex, nextIndex) });
  };

  const moveWithinColumn = (column, sectionId, direction) => {
    const items = sectionColumns[column];
    const currentIndex = items.indexOf(sectionId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= items.length) return;
    updateTwoColumnLayout({
      ...sectionColumns,
      [column]: arrayMove(items, currentIndex, nextIndex),
    });
  };

  const moveToColumn = (sectionId, targetColumn) => {
    const sourceColumn = sectionColumns.sidebar.includes(sectionId) ? 'sidebar' : 'main';
    if (sourceColumn === targetColumn) return;
    updateTwoColumnLayout({
      ...sectionColumns,
      [sourceColumn]: sectionColumns[sourceColumn].filter(id => id !== sectionId),
      [targetColumn]: [...sectionColumns[targetColumn], sectionId],
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => {
        setActiveId(active.id);
        onSectionSelect?.(active.id);
      }}
      onDragCancel={() => {
        setActiveId(null);
        onSectionHover?.('');
      }}
      onDragEnd={handleDragEnd}
    >
      {supportsColumns ? (
        <div className="fe-section-layout-manager">
          {SECTION_LAYOUT_COLUMNS.map(column => (
            <SectionColumn
              key={column.id}
              column={column}
              items={sectionColumns[column.id]}
              state={state}
              selectedSection={selectedSection}
              hoveredSection={hoveredSection}
              onMove={moveWithinColumn}
              onMoveToColumn={moveToColumn}
              onSectionSelect={onSectionSelect}
              onSectionHover={onSectionHover}
              registerItem={registerItem}
            />
          ))}
        </div>
      ) : (
        <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
          {sectionOrder.map((id, index) => (
            <SortableItem
              key={id}
              id={id}
              label={getSectionDisplayName(state, id)}
              index={index}
              count={sectionOrder.length}
              selected={id === selectedSection}
              hovered={id === hoveredSection}
              onMove={moveSection}
              onSelect={onSectionSelect}
              onHover={onSectionHover}
              registerItem={node => registerItem(id, node)}
            />
          ))}
        </SortableContext>
      )}
      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }}>
        {activeId ? <div className="fe-sortable-item fe-drag-overlay"><span className="fe-drag-handle"><ResumeIcon name="drag" size={18} /></span><span className="fe-sortable-label">{getSectionDisplayName(state, activeId)}</span></div> : null}
      </DragOverlay>
    </DndContext>
  );
}

function SectionReorderDialog({
  state,
  dispatch,
  selectedSection,
  hoveredSection,
  onSectionSelect,
  onSectionHover,
  onClose,
}) {
  const selectedTemplate = TEMPLATES.find(template => template.id === state.meta?.templateId);
  const supportsColumns = selectedTemplate?.layout === '2-column';
  const reorderListRef = useRef(null);
  return (
    <div className="fe-section-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="fe-section-dialog fe-reorder-dialog" role="dialog" aria-modal="true" aria-labelledby="reorder-section-title" onMouseDown={event => event.stopPropagation()}>
        <div className="fe-reorder-dialog-header">
          <div>
            <h2 id="reorder-section-title">{supportsColumns ? 'Arrange sections' : 'Reorder sections'}</h2>
            <p>{supportsColumns
              ? 'Drag between the left sidebar and right content column, or use the arrow controls. Changes appear in the preview immediately.'
              : 'Drag a section or use the arrow controls to change its position. Changes appear in the preview immediately.'}
            </p>
          </div>
          <button type="button" className="btn btn-icon btn-ghost fe-reorder-close" onClick={onClose} aria-label="Close reorder sections" title="Close"><ResumeIcon name="close" size={18} /></button>
        </div>
        <div className="fe-reorder-list" ref={reorderListRef}>
          <SectionOrderList
            state={state}
            dispatch={dispatch}
            selectedSection={selectedSection}
            hoveredSection={hoveredSection}
            onSectionSelect={onSectionSelect}
            onSectionHover={onSectionHover}
            scrollContainerRef={reorderListRef}
          />
        </div>
        <div className="fe-section-dialog-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </section>
    </div>
  );
}

function SectionsPanel({
  state,
  dispatch,
  selectedSection,
  hoveredSection,
  onSectionSelect,
  onSectionHover,
  scrollContainerRef,
}) {
  const navigate = useNavigate();
  const selectedSections = state.extraSections?.selected || [];

  const isAdded = (id) => {
    if (selectedSections.includes(id)) return true;
    if (id === 'languages') return state.languages?.some(item => item.language);
    if (id === 'websites') return state.websites?.some(item => item.url);
    if (id === 'certifications') return Boolean(state.certifications?.content);
    return state.extraSections?.custom?.some(item => item.id === id && (item.content || item.title));
  };

  const addSection = (option) => {
    if (!option.allowMultiple && isAdded(option.id)) return;
    if (option.route === 'custom-sections') {
      dispatch({
        type: 'ADD_CUSTOM_SECTION',
        payload: option.allowMultiple ? { title: option.label } : { id: option.id, title: option.label },
      });
    } else {
      dispatch({
        type: 'SET_EXTRA_SECTIONS',
        payload: { selected: [...selectedSections, option.id] },
      });
    }
    navigate(`/builder/${option.route}`);
  };

  return (
    <div className="fe-sections-panel">
      <h3>Add a Section</h3>
      <div className="fe-add-section-actions">
        {ADD_SECTION_OPTIONS.map(option => (
          <AddSectionButton key={option.id} option={option} added={!option.allowMultiple && isAdded(option.id)} onAdd={addSection} />
        ))}
      </div>
      <div className="fe-add-section-list">
        <button className="btn btn-outline fe-section-add-btn" onClick={() => navigate('/builder/languages')}>➕ Languages</button>
        <button className="btn btn-outline fe-section-add-btn" onClick={() => navigate('/builder/websites')}>➕ Websites, Portfolios, Profiles</button>
        <button className="btn btn-outline fe-section-add-btn" onClick={() => navigate('/builder/certifications')}>➕ Certifications</button>
      </div>
      <hr className="fe-section-divider" />
      <h3>Reorder Sections</h3>
      <p className="fe-section-help">Drag a section, or use the arrow controls, to reorder your resume.</p>
      <SectionOrderList
        state={state}
        dispatch={dispatch}
        selectedSection={selectedSection}
        hoveredSection={hoveredSection}
        onSectionSelect={onSectionSelect}
        onSectionHover={onSectionHover}
        scrollContainerRef={scrollContainerRef}
      />
    </div>
  );
}
