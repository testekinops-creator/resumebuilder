import { useState } from 'react';
import { useResume } from '../../../context/ResumeContext';
import { getOptionalSectionPath } from '../../../utils/optionalSections';
import StepNavigation from '../../../components/StepNavigation';
import RichTextEditor from '../../../components/RichTextEditor';
import ResumeIcon from '../../../components/ResumeIcon';

export default function CustomSectionsEditor() {
  const { state, dispatch } = useResume();
  const selected = state.extraSections.selected || [];
  const customSections = Array.isArray(state.extraSections.custom) ? state.extraSections.custom : [];
  const [sectionPendingRemoval, setSectionPendingRemoval] = useState('');

  const sectionFor = (id) => customSections.find(section => section.id === id);
  const titleFor = (id) => sectionFor(id)?.title ?? 'Custom Section';
  const displayTitleFor = (id) => titleFor(id).trim() || 'Custom Section';
  const contentFor = (id) => sectionFor(id)?.content || '';

  const updateContent = (id, content) => {
    dispatch({ type: 'UPDATE_CUSTOM_SECTION', payload: { id, content } });
  };

  const updateTitle = (id, title) => {
    dispatch({ type: 'UPDATE_CUSTOM_SECTION', payload: { id, title } });
  };

  const confirmRemoveSection = () => {
    if (!sectionPendingRemoval) return;
    dispatch({ type: 'REMOVE_CUSTOM_SECTION', payload: sectionPendingRemoval });
    setSectionPendingRemoval('');
  };

  return (
    <div className="step-page">
      <h1>Additional Resume Sections</h1>
      <p className="step-subtitle">Add details that strengthen your application. Each selected section is included in your resume preview.</p>

      <div className="custom-section-editor-list">
        {customSections.map(section => (
          <section key={section.id} className="panel custom-section-editor-card">
            <div className="custom-section-editor-card-header">
              <h2 title={displayTitleFor(section.id)}>{displayTitleFor(section.id)}</h2>
              <button type="button" className="btn btn-sm custom-section-remove-btn" onClick={() => setSectionPendingRemoval(section.id)} aria-label={`Remove ${displayTitleFor(section.id)}`}>
                <ResumeIcon name="delete" size={16} />Remove
              </button>
            </div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
              Section title
              <input className="form-input" value={titleFor(section.id)} onChange={event => updateTitle(section.id, event.target.value)} maxLength={60} />
            </label>
            <RichTextEditor
              fieldId={`custom-section-content-${section.id}`}
              content={contentFor(section.id)}
              onChange={content => updateContent(section.id, content)}
              placeholder={`Add your ${displayTitleFor(section.id).toLowerCase()} here...`}
              minHeight={160}
            />
          </section>
        ))}
      </div>

      {sectionPendingRemoval && (
        <div className="custom-section-remove-backdrop" role="presentation" onMouseDown={() => setSectionPendingRemoval('')}>
          <div className="custom-section-remove-dialog" role="dialog" aria-modal="true" aria-labelledby="custom-section-remove-title" onMouseDown={event => event.stopPropagation()}>
            <h2 id="custom-section-remove-title">Remove {displayTitleFor(sectionPendingRemoval)}?</h2>
            <p>This permanently removes its title and content from your resume.</p>
            <div className="custom-section-remove-dialog-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setSectionPendingRemoval('')}>Cancel</button>
              <button type="button" className="btn custom-section-remove-btn" onClick={confirmRemoveSection}>Remove section</button>
            </div>
          </div>
        </div>
      )}

      <StepNavigation
        backPath={getOptionalSectionPath(selected, 'customSections', 'back')}
        nextPath={getOptionalSectionPath(selected, 'customSections')}
        nextLabel="Next"
      />
    </div>
  );
}
