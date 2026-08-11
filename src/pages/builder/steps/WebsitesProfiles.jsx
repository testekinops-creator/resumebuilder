import { useResume } from '../../../context/ResumeContext';
import { isValidURL } from '../../../utils/sanitize';
import StepNavigation from '../../../components/StepNavigation';

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

  const getNextPath = () => {
    const selected = state.extraSections.selected || [];
    if (selected.includes('certifications')) return '/builder/certifications';
    return '/builder/smart-apply';
  };

  return (
    <div className="step-page">
      <h1>Websites, Portfolios &amp; Profiles</h1>
      <p className="step-subtitle">
        Add links to your professional profiles and portfolios. These help employers learn more about you.
      </p>

      <div className="callout callout-tip" style={{ marginBottom: 'var(--space-6)' }}>
        <span style={{ fontSize: '1.5rem' }}>💡</span>
        <div>
          <strong>Pro Tip:</strong> A LinkedIn profile is viewed by 87% of recruiters.
          Make sure yours is up to date!
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {websites.map((site, index) => (
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
                  {site.url && isValidURL(site.url) && <span className="validation-icon valid">✓</span>}
                </div>
              </div>
              <button className="entry-action-btn delete" onClick={() => deleteWebsite(site.id)} title="Remove">✕</button>
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
        + Add another link
      </button>

      <StepNavigation
        backPath="/builder/personal-details"
        nextPath={getNextPath()}
        nextLabel="Next"
      />
    </div>
  );
}
