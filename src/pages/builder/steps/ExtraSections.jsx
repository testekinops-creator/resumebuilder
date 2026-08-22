import { useResume } from '../../../context/ResumeContext';
import { EXTRA_SECTION_OPTIONS } from '../../../data/templates';
import { getFirstOptionalSectionPath } from '../../../utils/optionalSections';
import StepNavigation from '../../../components/StepNavigation';
import ResumeIcon from '../../../components/ResumeIcon';

export default function ExtraSections() {
  const { state, dispatch } = useResume();
  const selected = state.extraSections.selected || [];

  const toggleSection = (sectionId) => {
    const newSelected = selected.includes(sectionId)
      ? selected.filter(s => s !== sectionId)
      : [...selected, sectionId];
    dispatch({ type: 'SET_EXTRA_SECTIONS', payload: { selected: newSelected } });
  };

  return (
    <div className="step-page">
      <h1>Do you have anything else to add?</h1>
      <p className="step-subtitle">
        These optional sections can make your resume stand out. Select any that apply.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
        {EXTRA_SECTION_OPTIONS.map(section => (
          <label key={section.id} className="form-checkbox-group" style={{
            padding: 'var(--space-4)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', background: 'var(--color-surface)',
            transition: 'all 0.15s ease',
            borderColor: selected.includes(section.id) ? 'var(--color-primary)' : 'var(--color-border)',
          }}>
            <input type="checkbox" className="form-checkbox"
              checked={selected.includes(section.id)}
              onChange={() => toggleSection(section.id)} />
            <span style={{ fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}><ResumeIcon name={section.icon} size={17} />{section.label}</span>
            {section.isNew && <span className="badge badge-new">NEW</span>}
          </label>
        ))}
      </div>

      <StepNavigation
        backPath="/builder/summary-editor"
        nextPath={getFirstOptionalSectionPath(selected)}
        nextLabel="Next"
      />
    </div>
  );
}
