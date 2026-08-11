import { useNavigate } from 'react-router-dom';
import { useResume } from '../../../context/ResumeContext';
import StepNavigation from '../../../components/StepNavigation';

export default function EducationSummary() {
  const navigate = useNavigate();
  const { state, dispatch } = useResume();

  const handleDelete = (id) => {
    if (window.confirm('Delete this education entry?')) {
      dispatch({ type: 'DELETE_EDUCATION', payload: id });
    }
  };

  return (
    <div className="step-page">
      <h1>Education summary</h1>
      <p className="step-subtitle">Review your education entries below.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {state.education.map((edu, index) => (
          <div key={edu.id} className="entry-card">
            <div className="entry-number">{index + 1}</div>
            <div className="entry-content">
              <div className="entry-title">{edu.degree || edu.level || 'Education'} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}</div>
              <div className="entry-subtitle">
                {edu.schoolName}{edu.location ? ` | ${edu.location}` : ''}
                {edu.graduationDate ? ` | Expected ${edu.graduationDate}` : ''}
              </div>
              {!edu.coursework && (
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-error)', marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-error)', display: 'inline-block' }}></span>
                  Missing coursework description
                </div>
              )}
            </div>
            <div className="entry-actions">
              <button type="button" className="entry-action-btn" title="Edit">✏️</button>
              <button type="button" className="entry-action-btn delete" title="Delete" onClick={(e) => { e.preventDefault(); handleDelete(edu.id); }}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="add-another-btn" onClick={() => navigate('/builder/education-form')} style={{ marginTop: 'var(--space-4)' }}>
        + Add another education
      </button>

      <StepNavigation
        backPath="/builder/education-form"
        nextPath="/builder/skills-intro"
        nextLabel="Next: Skills"
      />
    </div>
  );
}
