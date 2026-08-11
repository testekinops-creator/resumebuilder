import { useState, useCallback } from 'react';
import { useResume } from '../../../context/ResumeContext';
import { searchSuggestions, relatedJobTitles } from '../../../data/suggestions';
import RichTextEditor from '../../../components/RichTextEditor';
import StepNavigation from '../../../components/StepNavigation';

export default function WorkHistoryEditor() {
  const { state, dispatch } = useResume();
  const currentWork = state.workHistory[state.workHistory.length - 1];
  const [searchQuery, setSearchQuery] = useState(currentWork?.jobTitle || '');
  const [suggestions, setSuggestions] = useState(null);
  const [selectedBullets, setSelectedBullets] = useState([]);
  const [content, setContent] = useState(currentWork?.description || '');

  const handleSearch = useCallback(() => {
    const results = searchSuggestions('work', searchQuery);
    setSuggestions(results);
  }, [searchQuery]);

  const toggleBullet = (bullet) => {
    let newSelected;
    if (selectedBullets.includes(bullet)) {
      newSelected = selectedBullets.filter(b => b !== bullet);
    } else {
      newSelected = [...selectedBullets, bullet];
    }
    setSelectedBullets(newSelected);
    const html = '<ul>' + newSelected.map(b => `<li>${b}</li>`).join('') + '</ul>';
    setContent(html);
    if (currentWork) {
      dispatch({ type: 'UPDATE_WORK', payload: { id: currentWork.id, description: html } });
    }
  };

  const handleEditorChange = (html) => {
    setContent(html);
    if (currentWork) {
      dispatch({ type: 'UPDATE_WORK', payload: { id: currentWork.id, description: html } });
    }
  };

  const titles = searchQuery
    ? (relatedJobTitles[searchQuery.toLowerCase()] || relatedJobTitles.default)
    : relatedJobTitles.default;

  return (
    <div className="step-page">
      <h1>What did you do as a {currentWork?.jobTitle || 'professional'}?</h1>
      <p className="step-subtitle">Choose from our pre-written examples below or write your own.</p>

      <div className="two-panel">
        <div className="panel">
          <div className="form-group">
            <label className="form-label">Search by job title for pre-written examples</label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input className="form-input" type="text" placeholder="e.g. Manager"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()} />
              <button className="btn btn-primary btn-sm" onClick={handleSearch} style={{ borderRadius: 'var(--radius-md)' }}>🔍</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Related Job Titles</span>
            {titles.map(title => (
              <button key={title} className="tag" onClick={() => { setSearchQuery(title); }}>
                🔍 {title}
              </button>
            ))}
          </div>

          {suggestions && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: 400, overflowY: 'auto', marginTop: 'var(--space-3)' }}>
              {suggestions.expert && (
                <>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    Showing results for <strong>{searchQuery}</strong>
                  </span>
                  {suggestions.expert.map((bullet, i) => (
                    <div key={`e-${i}`} className="suggestion-card" style={{
                      background: selectedBullets.includes(bullet) ? 'var(--color-surface-tertiary)' : 'var(--color-surface)',
                    }} onClick={() => toggleBullet(bullet)}>
                      <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>
                        {selectedBullets.includes(bullet) ? '✅' : '⊕'}
                      </span>
                      <div>
                        <span className="badge badge-expert" style={{ marginBottom: 4, display: 'inline-flex' }}>⭐ Expert Recommended</span>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: selectedBullets.includes(bullet) ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)' }}>
                          {bullet}
                        </p>
                      </div>
                    </div>
                  ))}
                  {suggestions.regular?.map((bullet, i) => (
                    <div key={`r-${i}`} className="suggestion-card" style={{
                      background: selectedBullets.includes(bullet) ? 'var(--color-surface-tertiary)' : 'var(--color-surface)',
                    }} onClick={() => toggleBullet(bullet)}>
                      <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>
                        {selectedBullets.includes(bullet) ? '✅' : '⊕'}
                      </span>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: selectedBullets.includes(bullet) ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)' }}>
                        {bullet}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div className="panel">
          <RichTextEditor
            content={content}
            onChange={handleEditorChange}
            placeholder="Add your experience here..."
            minHeight={280}
            showEnhanceBtn
          />
        </div>
      </div>

      <StepNavigation
        backPath="/builder/work-history"
        nextPath="/builder/work-summary"
        nextLabel="Next"
      />
    </div>
  );
}
