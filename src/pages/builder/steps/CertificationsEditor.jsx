import { useState, useCallback } from 'react';
import { useResume } from '../../../context/ResumeContext';
import { searchSuggestions } from '../../../data/suggestions';
import StepNavigation from '../../../components/StepNavigation';
import RichTextEditor from '../../../components/RichTextEditor';
import { getOptionalSectionPath } from '../../../utils/optionalSections';
import ResumeIcon from '../../../components/ResumeIcon';

export default function CertificationsEditor() {
  const { state, dispatch } = useResume();
  const [searchQuery, setSearchQuery] = useState(state.workHistory[0]?.jobTitle || '');
  const [suggestions, setSuggestions] = useState(null);
  const [content, setContent] = useState(state.certifications.content || '');
  const selected = state.extraSections.selected || [];

  const handleSearch = useCallback(() => {
    setSuggestions(searchSuggestions('certifications', searchQuery));
  }, [searchQuery]);

  const addCertification = (text) => {
    const newContent = content ? `${content}<p>${text}</p>` : `<p>${text}</p>`;
    setContent(newContent);
    dispatch({ type: 'SET_CERTIFICATIONS', payload: { content: newContent } });
  };

  return (
    <div className="step-page">
      <h1>Certifications</h1>
      <p className="step-subtitle">Add any professional certifications, licenses, or training you've completed.</p>

      <div className="two-panel">
        <div className="panel">
          <div className="form-group">
            <label className="form-label">Search certifications by job title</label>
            <div className="builder-search-row">
              <input className="form-input" type="text" placeholder="e.g. Project Manager"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()} />
              <button className="btn btn-primary btn-sm" onClick={handleSearch} style={{ borderRadius: 'var(--radius-md)' }} title="Search certification examples" aria-label="Search certification examples"><ResumeIcon name="search" size={18} /></button>
            </div>
          </div>

          {suggestions && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {suggestions.map((cert, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)', cursor: 'pointer',
                  background: 'var(--color-surface)',
                }} onClick={() => addCertification(cert)}>
                  <span><ResumeIcon name="add" size={18} /></span>
                  <p style={{ fontSize: 'var(--font-size-sm)' }}>{cert}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <RichTextEditor
            content={content}
            onChange={(html) => {
              setContent(html);
              dispatch({ type: 'SET_CERTIFICATIONS', payload: { content: html } });
            }}
            placeholder="Add your certifications here..."
            minHeight={250}
          />
        </div>
      </div>

      <StepNavigation
        backPath={getOptionalSectionPath(selected, 'certifications', 'back')}
        nextPath={getOptionalSectionPath(selected, 'certifications')}
        nextLabel="Next"
      />
    </div>
  );
}
