import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useResume } from '../../context/ResumeContext';
import { TEMPLATES, COLOR_SCHEMES, FONT_FAMILIES } from '../../data/templates';
import ResumePreview from '../../components/ResumePreview';
import { generatePDF, printResume, emailResume } from '../../utils/pdfGenerator';
import { exportResumeJSON } from '../../utils/storage';
import AuthModal from '../../components/AuthModal';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './FinalEditor.css';

export default function FinalEditor() {
  const { state, dispatch, completeness, canUndo, canRedo } = useResume();
  const [activeTab, setActiveTab] = useState('templates');
  const [zoom, setZoom] = useState(100);
  const [resumeName, setResumeName] = useState(state.meta.name || 'My Resume');
  const [showMenu, setShowMenu] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const previewRef = useRef(null);

  const handleDownload = async () => {
    await generatePDF();
  };

  const handlePrint = () => {
    printResume();
  };

  const handleEmail = () => emailResume(resumeName);

  const handleNameChange = (e) => {
    const name = e.target.value.slice(0, 50);
    setResumeName(name);
    dispatch({ type: 'SET_META', payload: { name } });
  };

  const tabs = [
    { id: 'templates', label: '🎨 Templates', icon: '🎨' },
    { id: 'design', label: '⚙️ Design', icon: '⚙️' },
    { id: 'sections', label: '➕ Sections', icon: '➕' },
  ];

  const scoreColor = completeness >= 80 ? 'var(--color-success)' : completeness >= 50 ? 'var(--color-warning)' : 'var(--color-error)';

  return (
    <div className="final-editor">
      {/* Top Bar */}
      <header className="fe-topbar">
        <div className="fe-topbar-left">
          <Link to="/builder/smart-apply" className="fe-back-link">← Back</Link>
          <input className="fe-resume-name" type="text" value={resumeName}
            onChange={handleNameChange} maxLength={50} aria-label="Resume name" />
          <div className="fe-menu-wrapper">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowMenu(!showMenu)}>
              ⋯ More
            </button>
            {showMenu && (
              <div className="fe-dropdown">
                <button onClick={() => { exportResumeJSON(state); setShowMenu(false); }}>💾 Export JSON Backup</button>
                <button onClick={() => { dispatch({ type: 'RESET' }); setShowMenu(false); }}>🗑️ Start New Resume</button>
              </div>
            )}
          </div>
        </div>
        <div className="fe-topbar-center">
          <button className="btn btn-icon btn-ghost" disabled={!canUndo} onClick={() => dispatch({ type: 'UNDO' })} title="Undo">↩</button>
          <button className="btn btn-icon btn-ghost" disabled={!canRedo} onClick={() => dispatch({ type: 'REDO' })} title="Redo">↪</button>
          <span className="fe-divider" />
          <button className="btn btn-icon btn-ghost" onClick={() => setZoom(z => Math.max(z - 10, 50))} title="Zoom out">−</button>
          <span className="fe-zoom">{zoom}%</span>
          <button className="btn btn-icon btn-ghost" onClick={() => setZoom(z => Math.min(z + 10, 150))} title="Zoom in">+</button>
        </div>
        <div className="fe-topbar-right">
          <span className="fe-saved">✓ Saved</span>
        </div>
      </header>

      <div className="fe-body">
        {/* Left Tool Panel */}
        <aside className="fe-tools">
          <div className="fe-tool-tabs">
            {tabs.map(tab => (
              <button key={tab.id}
                className={`fe-tool-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="fe-tool-content">
            {activeTab === 'templates' && (
              <div className="fe-templates-panel">
                <h3>Colors</h3>
                <div className="fe-color-swatches">
                  {COLOR_SCHEMES.map(color => (
                    <button key={color.id}
                      className={`fe-swatch ${state.design.colorScheme === color.value ? 'active' : ''}`}
                      style={{ backgroundColor: color.value, border: color.value === '#FFFFFF' ? '2px solid var(--color-border)' : 'none' }}
                      onClick={() => dispatch({ type: 'SET_DESIGN', payload: { colorScheme: color.value } })}
                      title={color.label}
                      aria-label={`Color ${color.label}`}
                    />
                  ))}
                </div>

                <h3 style={{ marginTop: 'var(--space-6)' }}>All templates</h3>
                <div className="fe-template-grid">
                  {TEMPLATES.map(template => (
                    <div key={template.id}
                      className={`fe-template-thumb ${state.meta.templateId === template.id ? 'active' : ''}`}
                      onClick={() => dispatch({ type: 'SET_META', payload: { templateId: template.id } })}>
                      <div className="fe-thumb-preview" style={{ '--t-color': state.design.colorScheme || template.defaultColor }}>
                        <div className="ftp-header" style={{ backgroundColor: state.design.colorScheme || template.defaultColor }}></div>
                        <div className="ftp-body">
                          <div className="ftp-line"></div>
                          <div className="ftp-line short"></div>
                          <div className="ftp-line"></div>
                        </div>
                      </div>
                      <span className="fe-thumb-name">{template.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'design' && (
              <div className="fe-design-panel">
                <h3>Font Family</h3>
                <select className="form-input form-select" value={state.design.fontFamily}
                  onChange={e => dispatch({ type: 'SET_DESIGN', payload: { fontFamily: e.target.value } })}>
                  {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>

                <h3 style={{ marginTop: 'var(--space-6)' }}>Font Size</h3>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {['small', 'normal', 'large'].map(size => (
                    <button key={size}
                      className={`btn btn-sm ${state.design.fontStyle === size ? 'btn-accent' : 'btn-outline'}`}
                      onClick={() => dispatch({ type: 'SET_DESIGN', payload: { fontStyle: size } })}
                      style={{ borderRadius: 'var(--radius-md)', flex: 1, textTransform: 'uppercase', fontSize: 'var(--font-size-xs)' }}>
                      {size[0].toUpperCase()}
                    </button>
                  ))}
                </div>

                <h3 style={{ marginTop: 'var(--space-6)' }}>Section Spacing</h3>
                <input type="range" min="0" max="100" value={state.design.sectionSpacing}
                  onChange={e => dispatch({ type: 'SET_DESIGN', payload: { sectionSpacing: +e.target.value } })}
                  style={{ width: '100%' }} />

                <h3 style={{ marginTop: 'var(--space-4)' }}>Paragraph Spacing</h3>
                <input type="range" min="0" max="100" value={state.design.paragraphSpacing}
                  onChange={e => dispatch({ type: 'SET_DESIGN', payload: { paragraphSpacing: +e.target.value } })}
                  style={{ width: '100%' }} />

                <h3 style={{ marginTop: 'var(--space-4)' }}>Line Spacing</h3>
                <input type="range" min="0" max="100" value={state.design.lineSpacing}
                  onChange={e => dispatch({ type: 'SET_DESIGN', payload: { lineSpacing: +e.target.value } })}
                  style={{ width: '100%' }} />

                <button className="btn btn-ghost btn-sm" style={{ marginTop: 'var(--space-6)', width: '100%' }}
                  onClick={() => dispatch({ type: 'SET_DESIGN', payload: { fontFamily: 'Inter', fontStyle: 'normal', sectionSpacing: 50, paragraphSpacing: 50, lineSpacing: 50 } })}>
                  ↺ Reset to Default
                </button>
              </div>
            )}

            {activeTab === 'sections' && (
              <SectionsPanel state={state} dispatch={dispatch} />
            )}
          </div>
        </aside>

        {/* Main Resume Area */}
        <main className="fe-main">
          <div className="fe-resume-wrapper" ref={previewRef} style={{ transform: `scale(${zoom / 100})` }}>
            <ResumePreview scale={1} />
          </div>
        </main>

        {/* Right Actions */}
        <aside className="fe-actions">
          {/* Resume Score */}
          <div className="fe-score-card">
            <div className="fe-score-circle" style={{ '--score-color': scoreColor, '--score-pct': completeness }}>
              <svg viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="35" fill="none" stroke="var(--color-border)" strokeWidth="5" />
                <circle cx="40" cy="40" r="35" fill="none" stroke={scoreColor} strokeWidth="5"
                  strokeDasharray={`${completeness * 2.2} 220`} strokeLinecap="round"
                  transform="rotate(-90, 40, 40)" style={{ transition: 'stroke-dasharray 0.5s ease' }} />
              </svg>
              <span className="fe-score-value">{completeness}</span>
            </div>
            <span className="fe-score-label">Resume Score</span>
          </div>

          <div className="fe-action-buttons">
            <button className="btn btn-primary" onClick={handleDownload} disabled={generating} style={{ width: '100%' }}>
              {generating ? '⏳ Generating...' : '📥 Download PDF'}
            </button>
            <button className="btn btn-outline-dark" onClick={handlePrint} style={{ width: '100%' }}>
              🖨️ Print
            </button>
            <button className="btn btn-outline-dark" onClick={handleEmail} style={{ width: '100%' }}>
              ✉️ Email
            </button>
            <button className="btn btn-ghost" onClick={() => setShowAuthModal(true)} style={{ width: '100%', justifyContent: 'center' }}>
              ✅ Finish
            </button>
          </div>
        </aside>
      </div>

      {/* Loading overlay */}
      {generating && (
        <div className="loading-overlay">
          <div className="spinner" />
          <p>Generating your PDF...</p>
        </div>
      )}
      {/* Welcome overlay */}
      {showWelcome && (
        <div className="mobile-preview-overlay" style={{ zIndex: 1000 }} onClick={() => setShowWelcome(false)}>
          <div className="mobile-preview-content" style={{ maxWidth: 500, padding: 'var(--space-6)', textAlign: 'center', background: 'white', borderRadius: 'var(--radius-lg)' }} onClick={e => e.stopPropagation()}>
            <button className="fe-close-btn" onClick={() => setShowWelcome(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
            <h2 style={{ fontSize: 24, marginBottom: 'var(--space-2)' }}>Great work, {state.contact.firstName || 'there'}!</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>Your resume is looking good. We're just one step away from finalizing it!</p>
            <button className="btn btn-primary" onClick={() => setShowWelcome(false)} style={{ padding: '12px 32px', borderRadius: 30 }}>Got it</button>
          </div>
        </div>
      )}

      {/* Auth Modal overlay */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}

const SECTION_LABELS = {
  summary: 'Summary',
  workHistory: 'Work History',
  education: 'Education',
  skills: 'Skills',
  personalDetails: 'Personal Details',
  websites: 'Websites',
  certifications: 'Certifications',
  languages: 'Languages',
};

function SortableItem({ id }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="fe-sortable-item" {...attributes}>
      <span className="fe-drag-handle" {...listeners}>⋮⋮</span>
      <span style={{ fontSize: 'var(--font-size-sm)', flex: 1 }}>{SECTION_LABELS[id] || id}</span>
    </div>
  );
}

function SectionsPanel({ state, dispatch }) {
  const navigate = useNavigate();
  const sectionOrder = state.design.sectionOrder || Object.keys(SECTION_LABELS);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = sectionOrder.indexOf(active.id);
      const newIndex = sectionOrder.indexOf(over.id);
      const newOrder = arrayMove(sectionOrder, oldIndex, newIndex);
      dispatch({ type: 'REORDER_SECTIONS', payload: newOrder });
    }
  };

  const handleAddSection = (route) => {
    navigate(`/builder/${route}`);
  };

  return (
    <div className="fe-sections-panel">
      <h3>Add a Section</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        <button className="btn btn-outline" onClick={() => handleAddSection('languages')} style={{ justifyContent: 'flex-start' }}>➕ Languages</button>
        <button className="btn btn-outline" onClick={() => handleAddSection('websites')} style={{ justifyContent: 'flex-start' }}>➕ Websites, Portfolios, Profiles</button>
        <button className="btn btn-outline" onClick={() => handleAddSection('certifications')} style={{ justifyContent: 'flex-start' }}>➕ Certifications</button>
      </div>

      <hr style={{ borderColor: 'var(--color-border)', margin: 'var(--space-4) 0' }} />

      <h3>Reorder Sections</h3>
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
        Drag to reorder sections on your resume.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
          {sectionOrder.map(id => (
            <SortableItem key={id} id={id} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
