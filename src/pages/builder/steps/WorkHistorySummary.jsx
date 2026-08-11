import { useNavigate } from 'react-router-dom';
import { useResume } from '../../../context/ResumeContext';
import { sanitizeHTML } from '../../../utils/sanitize';
import StepNavigation from '../../../components/StepNavigation';

export default function WorkHistorySummary() {
  const navigate = useNavigate();
  const { state, dispatch } = useResume();

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this position?')) {
      dispatch({ type: 'DELETE_WORK', payload: id });
    }
  };

  const handleAddAnother = () => navigate('/builder/work-history');

  return (
    <div className="step-page">
      <h1>Work history summary</h1>
      <p className="step-subtitle">Review your work history below. You can edit, delete, or add more positions.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {state.workHistory.map((job, index) => (
          <div key={job.id} className="entry-card">
            <div className="entry-number">{index + 1}</div>
            <div className="entry-content">
              <div className="entry-title">{job.jobTitle || 'Untitled Position'}</div>
              <div className="entry-subtitle">
                {job.employer}{job.location ? ` | ${job.location}` : ''}
                {job.startDate ? ` | ${job.startDate}` : ''}
                {job.endDate ? ` - ${job.endDate}` : job.currentJob ? ' - Present' : ''}
              </div>
              {job.description && (
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(job.description) }} />
              )}
            </div>
            <div className="entry-actions">
              <button type="button" className="entry-action-btn" title="Edit" onClick={() => navigate('/builder/work-editor')}>✏️</button>
              <button type="button" className="entry-action-btn delete" title="Delete" onClick={(e) => { e.preventDefault(); handleDelete(job.id); }}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="add-another-btn" onClick={handleAddAnother} style={{ marginTop: 'var(--space-4)' }}>
        + Add another position
      </button>

      <StepNavigation
        backPath="/builder/work-editor"
        nextPath="/builder/education-intro"
        nextLabel="Next: Education"
      />
    </div>
  );
}
