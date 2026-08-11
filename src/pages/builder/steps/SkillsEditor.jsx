import { useState, useCallback } from 'react';
import { useResume } from '../../../context/ResumeContext';
import { skillsSuggestions } from '../../../data/suggestions';
import { useNavigate } from 'react-router-dom';
import StepNavigation from '../../../components/StepNavigation';
import RichTextEditor from '../../../components/RichTextEditor';

export default function SkillsEditor() {
  const { state, dispatch } = useResume();
  const [activeTab, setActiveTab] = useState('text');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [content, setContent] = useState(state.skills.textContent || '');
  const [ratings, setRatings] = useState(state.skills.ratings || []);
  const [showEmptyModal, setShowEmptyModal] = useState(false);
  const navigate = useNavigate();

  const handleSearch = useCallback(() => {
    const q = searchQuery.toLowerCase().trim();
    const match = Object.keys(skillsSuggestions).find(key => key.includes(q) || q.includes(key));
    setSuggestions(skillsSuggestions[match] || skillsSuggestions.default);
  }, [searchQuery]);

  const toggleSkill = (skill) => {
    let newSelected;
    if (selectedSkills.includes(skill)) {
      newSelected = selectedSkills.filter(s => s !== skill);
    } else {
      newSelected = [...selectedSkills, skill];
    }
    setSelectedSkills(newSelected);
    const html = '<ul>' + newSelected.map(s => `<li>${s}</li>`).join('') + '</ul>';
    setContent(html);
    dispatch({ type: 'SET_SKILLS', payload: { textContent: html } });
  };

  const handleEditorChange = (html) => {
    setContent(html);
    dispatch({ type: 'SET_SKILLS', payload: { textContent: html } });
  };

  const addRatingSkill = () => {
    const newSkill = { id: Date.now().toString(), name: '', rating: 3 };
    const newRatings = [...ratings, newSkill];
    setRatings(newRatings);
    dispatch({ type: 'SET_SKILLS', payload: { ratings: newRatings } });
  };

  const updateRating = (id, field, value) => {
    const newRatings = ratings.map(r => r.id === id ? { ...r, [field]: value } : r);
    setRatings(newRatings);
    dispatch({ type: 'SET_SKILLS', payload: { ratings: newRatings } });
  };

  const removeRating = (id) => {
    const newRatings = ratings.filter(r => r.id !== id);
    setRatings(newRatings);
    dispatch({ type: 'SET_SKILLS', payload: { ratings: newRatings } });
  };

  const maxSkills = 10;
  const skillCount = selectedSkills.length;

  const handleNext = () => {
    const isTextEmpty = !content.replace(/<[^>]*>?/gm, '').trim();
    const isRatingsEmpty = ratings.length === 0 || ratings.every(r => !r.name.trim());
    
    if (activeTab === 'text' ? isTextEmpty : isRatingsEmpty) {
      setShowEmptyModal(true);
      return false;
    }
    return true;
  };

  const handleSkip = () => {
    navigate('/builder/summary-intro');
  };
  const progress = Math.min((skillCount / maxSkills) * 100, 100);

  return (
    <div className="step-page">
      <h1>What skills would you like to highlight?</h1>
      <p className="step-subtitle">Choose from our suggestions or add your own. Aim for 6-10 skills.</p>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 'var(--space-6)' }}>
        <button className={`tab ${activeTab === 'text' ? 'active' : ''}`} onClick={() => setActiveTab('text')}>
          Text Editor
        </button>
        <button className={`tab ${activeTab === 'rating' ? 'active' : ''}`} onClick={() => setActiveTab('rating')}>
          Skills Rating
        </button>
      </div>

      {activeTab === 'text' && (
        <div className="two-panel">
          <div className="panel">
            <div className="form-group">
              <label className="form-label">Search by job title</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input className="form-input" type="text" placeholder="e.g. Software Engineer"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()} />
                <button className="btn btn-primary btn-sm" onClick={handleSearch} style={{ borderRadius: 'var(--radius-md)' }}>🔍</button>
              </div>
            </div>

            {suggestions && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: 350, overflowY: 'auto' }}>
                {suggestions.expert?.map((skill, i) => (
                  <div key={`e-${i}`} style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                    padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)', cursor: 'pointer',
                    background: selectedSkills.includes(skill) ? 'var(--color-surface-tertiary)' : 'var(--color-surface)',
                  }} onClick={() => toggleSkill(skill)}>
                    <span>{selectedSkills.includes(skill) ? '✅' : '⊕'}</span>
                    <div>
                      <span className="badge badge-expert" style={{ fontSize: 10, marginBottom: 2, display: 'inline-flex' }}>⭐ Expert</span>
                      <p style={{ fontSize: 'var(--font-size-sm)' }}>{skill}</p>
                    </div>
                  </div>
                ))}
                {suggestions.regular?.map((skill, i) => (
                  <div key={`r-${i}`} style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                    padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)', cursor: 'pointer',
                    background: selectedSkills.includes(skill) ? 'var(--color-surface-tertiary)' : 'var(--color-surface)',
                  }} onClick={() => toggleSkill(skill)}>
                    <span>{selectedSkills.includes(skill) ? '✅' : '⊕'}</span>
                    <p style={{ fontSize: 'var(--font-size-sm)' }}>{skill}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Skills: {skillCount}/{maxSkills}</span>
              <button className="btn btn-sm" style={{
                background: 'linear-gradient(135deg, #8B5CF6, #6366F1)', color: 'white',
                borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)',
              }}>✦ Enhance with AI</button>
            </div>
            <div className="progress-bar" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <RichTextEditor
              content={content}
              onChange={handleEditorChange}
              placeholder="Add your skills here..."
              minHeight={250}
              showEnhanceBtn
            />
          </div>
        </div>
      )}

      {activeTab === 'rating' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          {ratings.map(skill => (
            <div key={skill.id} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
              padding: 'var(--space-3)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', background: 'var(--color-surface)',
            }}>
              <input className="form-input" type="text" placeholder="Skill name"
                value={skill.name} onChange={e => updateRating(skill.id, 'name', e.target.value)}
                style={{ flex: 1, maxWidth: 200 }} maxLength={50} />
              <div style={{ display: 'flex', gap: 2 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star}
                    style={{ fontSize: '1.4rem', cursor: 'pointer', background: 'none', border: 'none', color: star <= skill.rating ? '#F59E0B' : '#D1D5DB' }}
                    onClick={() => updateRating(skill.id, 'rating', star)}
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                  >★</button>
                ))}
              </div>
              <button className="entry-action-btn delete" onClick={() => removeRating(skill.id)} title="Remove">✕</button>
            </div>
          ))}
          <button className="add-another-btn" onClick={addRatingSkill}>
            + Add skill
          </button>
        </div>
      )}

      <StepNavigation
        backPath="/builder/skills-intro"
        nextPath="/builder/summary-intro"
        nextLabel="Next: Summary"
        onNext={handleNext}
      />

      {/* Empty State Modal */}
      {showEmptyModal && (
        <div className="mobile-preview-overlay" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="mobile-preview-content" style={{ maxWidth: 400, width: '100%', padding: 'var(--space-6)', background: 'white', borderRadius: 'var(--radius-lg)', position: 'relative' }}>
            <button className="fe-close-btn" onClick={() => setShowEmptyModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--color-text-secondary)' }}>×</button>
            
            <h3 style={{ fontSize: 20, marginBottom: 'var(--space-3)' }}>Are you sure you don't want to add any skills?</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)', fontSize: 'var(--font-size-sm)' }}>
              A strong skills section helps you pass applicant tracking systems (ATS) and catch recruiters' attention.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <button className="btn btn-primary" onClick={() => setShowEmptyModal(false)} style={{ borderRadius: 30, padding: '12px', background: '#D91277', border: 'none' }}>
                Add skills
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
