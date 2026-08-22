import { useResume } from '../../../context/ResumeContext';
import { isValidURL } from '../../../utils/sanitize';
import StepNavigation from '../../../components/StepNavigation';
import { getOptionalSectionPath } from '../../../utils/optionalSections';
import ResumeIcon from '../../../components/ResumeIcon';

export default function WebsitesProfiles() {
  const { state, dispatch } = useResume();
  const websites = state.websites || [];

  const addWebsite = () => {
    dispatch({ type: 'ADD_WEBSITE', payload: { url: '', addToHeader: false } });
  };

  const updateWebsite = (id, field, value) => {
    dispatch({ type: 'UPDATE_WEBSITE', payload: { id, [field]: value } });
  };

  const deleteWebsite = (id) => {
    dispatch({ type: 'DELETE_WEBSITE', payload: id });
  };

  const selected = state.extraSections.selected || [];

  return (
    <div className="step-page">
      <h1>Websites, Portfolios &amp; Profiles</h1>
      <p className="step-subtitle">
        Add links to your professional profiles and portfolios. These help employers learn more about you.
      </p>

      <div className="callout callout-tip" style={{ marginBottom: 'var(--space-6)' }}>
        <ResumeIcon name="info" size={24} />
        <div>
          <strong>Pro Tip:</strong> A LinkedIn profile is viewed by 87% of recruiters.
          Make sure yours is up to date!
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {websites.map(site => (
          <div key={site.id} style={{
            padding: 'var(--space-4)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)',
            display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ flex: 1 }}>
                <div className="input-wrapper">
                  <input className={`form-input ${site.url && !isValidURL(site.url) ? 'error' : site.url && isValidURL(site.url) ? 'success' : ''}`}
                    type="url" placeholder="https://linkedin.com/in/yourname"
                    value={site.url} onChange={e => updateWebsite(site.id, 'url', e.target.value)} />
                  {site.url && isValidURL(site.url) && <span className="validation-icon valid"><ResumeIcon name="finish" size={15} /></span>}
                </div>
              </div>
              <button className="entry-action-btn delete" onClick={() => deleteWebsite(site.id)} title="Remove" aria-label="Remove link"><ResumeIcon name="delete" size={17} /></button>
            </div>
            <label className="form-checkbox-group">
              <input type="checkbox" className="form-checkbox"
                checked={site.addToHeader}
                onChange={e => updateWebsite(site.id, 'addToHeader', e.target.checked)} />
              <span style={{ fontSize: 'var(--font-size-sm)' }}>Add to resume header</span>
            </label>
          </div>
        ))}
      </div>

      <button className="add-another-btn" onClick={addWebsite} style={{ marginTop: 'var(--space-4)' }}>
        <ResumeIcon name="add" size={18} />Add another link
      </button>

      <StepNavigation
        backPath={getOptionalSectionPath(selected, 'websites', 'back')}
        nextPath={getOptionalSectionPath(selected, 'websites')}
        nextLabel="Next"
      />
    </div>
  );
}
