import { useState, useCallback } from 'react';
import { useResume } from '../../../context/ResumeContext';
import { searchSuggestions } from '../../../data/suggestions';
import { useNavigate } from 'react-router-dom';
import RichTextEditor from '../../../components/RichTextEditor';
import StepNavigation from '../../../components/StepNavigation';
import ResumeIcon from '../../../components/ResumeIcon';

export default function SummaryEditor() {
  const { state, dispatch } = useResume();
  const [searchQuery, setSearchQuery] = useState(state.workHistory[0]?.jobTitle || '');
  const [suggestions, setSuggestions] = useState(null);
  const [content, setContent] = useState(state.summary.content || '');
  const [showEmptyModal, setShowEmptyModal] = useState(false);
  const navigate = useNavigate();

  const handleSearch = useCallback(() => {
    setSuggestions(searchSuggestions('summary', searchQuery));
  }, [searchQuery]);

  const selectSuggestion = (text) => {
    const html = `<p>${text}</p>`;
    setContent(html);
    dispatch({ type: 'SET_SUMMARY', payload: { content: html } });
  };

  const handleEditorChange = (html) => {
    setContent(html);
    dispatch({ type: 'SET_SUMMARY', payload: { content: html } });
  };

  const handleNext = () => {
    if (!content.replace(/<[^>]*>?/gm, '').trim()) {
      setShowEmptyModal(true);
      return false;
    }
    return true;
  };

  const handleSkip = () => {
    navigate('/builder/extra-sections');
  };

  return (
    <div className="step-page">
      <h1>Briefly tell us about your background</h1>
      <p className="step-subtitle">Choose from our pre-written examples or write your own professional summary.</p>

      <div className="two-panel">
        <div className="panel">
          <div className="form-group">
            <label className="form-label">Search by job title</label>
            <div className="builder-search-row">
              <input className="form-input" type="text" placeholder="e.g. Manager"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()} />
              <button className="btn btn-primary btn-sm" onClick={handleSearch} style={{ borderRadius: 'var(--radius-md)' }} title="Search summary examples" aria-label="Search summary examples"><ResumeIcon name="search" size={18} /></button>
            </div>
          </div>

          {suggestions && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxHeight: 400, overflowY: 'auto' }}>
              {suggestions.map((text, i) => (
                <div key={i} className="suggestion-card column"
                  onClick={() => selectSuggestion(text)}>
                  {i === 0 && (
                    <span className="badge badge-personalized" style={{ marginBottom: 'var(--space-2)', display: 'inline-flex' }}>
                      <ResumeIcon name="sparkle" size={14} />PERSONALIZED FOR YOU
                    </span>
                  )}
                  <p style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.6 }}>{text}</p>
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 'var(--space-2)', alignSelf: 'flex-start' }}>
                    <ResumeIcon name="add" size={16} />Use this summary
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <RichTextEditor
            content={content}
            onChange={handleEditorChange}
            placeholder="Write your professional summary here..."
            minHeight={260}
          />
        </div>
      </div>

      <StepNavigation
        backPath="/builder/summary-intro"
        nextPath="/builder/extra-sections"
        nextLabel="Next: Finalize"
        onNext={handleNext}
      />

      {/* Empty State Modal */}
      {showEmptyModal && (
        <div className="mobile-preview-overlay" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="mobile-preview-content builder-empty-dialog" style={{ maxWidth: 400, width: '100%', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', position: 'relative' }}>
            <button className="fe-close-btn" onClick={() => setShowEmptyModal(false)} aria-label="Close message" title="Close message" style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}><ResumeIcon name="close" size={22} /></button>
            
            <h3 style={{ fontSize: 20, marginBottom: 'var(--space-3)' }}>Are you sure you want to skip your professional summary?</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)', fontSize: 'var(--font-size-sm)' }}>
              A summary is the perfect place to highlight your best achievements and catch the hiring manager's eye right away.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <button className="btn btn-primary" onClick={() => setShowEmptyModal(false)} style={{ borderRadius: 30, padding: '12px', background: '#D91277', border: 'none' }}>
                Add summary
              </button>
              <button className="btn btn-ghost" onClick={handleSkip} style={{ color: 'var(--color-text-link)', fontWeight: 600, textDecoration: 'underline' }}>
                No thanks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
