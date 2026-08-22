import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useResume } from '../../../context/ResumeContext';
import { searchSuggestions, getJobTitleSuggestions } from '../../../data/suggestions';
import RichTextEditor from '../../../components/RichTextEditor';
import StepNavigation from '../../../components/StepNavigation';
import ResumeIcon from '../../../components/ResumeIcon';

export default function WorkHistoryEditor() {
  const { state, dispatch } = useResume();
  const location = useLocation();
  const currentWork = state.workHistory.find(work => work.id === location.state?.workId) || state.workHistory[state.workHistory.length - 1];
  const [searchQuery, setSearchQuery] = useState(currentWork?.jobTitle || '');
  const [suggestions, setSuggestions] = useState(null);
  const [searchedTitle, setSearchedTitle] = useState('');
  const [isTitleMenuOpen, setIsTitleMenuOpen] = useState(false);
  const [activeTitleIndex, setActiveTitleIndex] = useState(-1);
  const [selectedBullets, setSelectedBullets] = useState([]);
  const [content, setContent] = useState(currentWork?.description || '');

  const titleSuggestions = getJobTitleSuggestions(searchQuery);
  const aiWorkSource = suggestions || searchSuggestions('work', searchQuery || currentWork?.jobTitle || 'Professional');
  const aiWorkSuggestions = [...(aiWorkSource?.expert || []), ...(aiWorkSource?.regular || [])];

  const handleSearch = useCallback((requestedTitle = searchQuery) => {
    const title = requestedTitle.trim();
    if (!title) {
      setSuggestions(null);
      setSearchedTitle('');
      setIsTitleMenuOpen(false);
      return;
    }

    const results = searchSuggestions('work', title);
    setSearchQuery(title);
    setSearchedTitle(title);
    setSuggestions(results);
    setIsTitleMenuOpen(false);
    setActiveTitleIndex(-1);
  }, [searchQuery]);

  const handleTitleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (titleSuggestions.length) {
        setIsTitleMenuOpen(true);
        setActiveTitleIndex(index => Math.min(index + 1, titleSuggestions.length - 1));
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (titleSuggestions.length) {
        setIsTitleMenuOpen(true);
        setActiveTitleIndex(index => (index <= 0 ? titleSuggestions.length - 1 : index - 1));
      }
      return;
    }

    if (event.key === 'Escape') {
      setIsTitleMenuOpen(false);
      setActiveTitleIndex(-1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const selectedTitle = isTitleMenuOpen && titleSuggestions.length
        ? titleSuggestions[Math.max(activeTitleIndex, 0)]
        : searchQuery;
      handleSearch(selectedTitle);
    }
  };

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

  return (
    <div className="step-page">
      <h1>What did you do as a {currentWork?.jobTitle || 'professional'}?</h1>
      <p className="step-subtitle">Choose from our pre-written examples below or write your own.</p>

      <div className="two-panel work-editor-layout">
        <div className="panel work-suggestions-panel">
          <div className="form-group">
            <label className="form-label">Search by job title for pre-written examples</label>
            <div className="work-title-search-area">
              <div className="work-title-search">
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Manager"
                  value={searchQuery}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls="job-title-suggestions"
                  aria-expanded={isTitleMenuOpen}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setIsTitleMenuOpen(Boolean(event.target.value.trim()));
                    setActiveTitleIndex(-1);
                  }}
                  onFocus={() => searchQuery.trim() && setIsTitleMenuOpen(true)}
                  onBlur={() => {
                    setIsTitleMenuOpen(false);
                    setActiveTitleIndex(-1);
                  }}
                  onKeyDown={handleTitleKeyDown}
                />
                <button className="btn btn-primary btn-sm" onClick={() => handleSearch()} style={{ borderRadius: 'var(--radius-md)' }} title="Search job examples" aria-label="Search job examples"><ResumeIcon name="search" size={18} /></button>
              </div>

              {isTitleMenuOpen && searchQuery.trim() && (
                <div id="job-title-suggestions" className="work-title-suggestion-menu" role="listbox" aria-label="Related job titles">
                  {titleSuggestions.length ? titleSuggestions.map((title, index) => (
                    <button
                      key={title}
                      type="button"
                      className={`work-title-suggestion-option${index === activeTitleIndex ? ' is-active' : ''}`}
                      role="option"
                      aria-selected={index === activeTitleIndex}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSearch(title)}
                    >
                      {title}
                    </button>
                  )) : (
                    <p className="work-title-suggestion-empty">No related job titles found</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {suggestions && (
            <div className="work-search-results">
              <span className="work-search-results-title">
                Showing results for <strong>{searchedTitle}</strong>
              </span>
              {suggestions.expert && (
                <>
                  {suggestions.expert.map((bullet, i) => (
                    <div key={`e-${i}`} className="suggestion-card" style={{
                      background: selectedBullets.includes(bullet) ? 'var(--color-surface-tertiary)' : 'var(--color-surface)',
                    }} onClick={() => toggleBullet(bullet)}>
                      <span style={{ flexShrink: 0 }}><ResumeIcon name={selectedBullets.includes(bullet) ? 'finish' : 'add'} size={18} /></span>
                      <div>
                        <span className="badge badge-expert" style={{ marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}><ResumeIcon name="award" size={14} />Expert Recommended</span>
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
                      <span style={{ flexShrink: 0 }}><ResumeIcon name={selectedBullets.includes(bullet) ? 'finish' : 'add'} size={18} /></span>
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

        <div className="panel work-editor-panel">
          <RichTextEditor
            content={content}
            onChange={handleEditorChange}
            placeholder="Add your experience here..."
            minHeight={360}
            maxHeight={520}
            showEnhanceBtn
            aiSuggestions={aiWorkSuggestions}
            aiTitle="Experience recommendations"
            aiDescription="Choose achievement-focused bullets for this role. You can edit them directly after adding them."
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
