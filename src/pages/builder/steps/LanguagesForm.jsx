import { useState } from 'react';
import { useResume } from '../../../context/ResumeContext';
import StepNavigation from '../../../components/StepNavigation';

const COMMON_LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Mandarin', 'Arabic', 'Hindi', 'Portuguese'];
const LANGUAGE_LEVELS = [
  'Native or Bilingual',
  'Proficient (C2)',
  'Advanced (C1)',
  'Upper Intermediate (B2)',
  'Intermediate (B1)',
  'Pre-Intermediate (A2)',
  'Beginner (A1)'
];

export default function LanguagesForm() {
  const { state, dispatch } = useResume();
  const languages = state.languages || [];
  const [newLang, setNewLang] = useState({ language: '', level: 'Proficient (C2)' });
  const [isEditing, setIsEditing] = useState(false);

  const handleAdd = () => {
    if (!newLang.language) return;
    dispatch({ type: 'ADD_LANGUAGE', payload: newLang });
    setNewLang({ language: '', level: 'Proficient (C2)' });
    setIsEditing(false);
  };

  const handleRemove = (id) => {
    dispatch({ type: 'DELETE_LANGUAGE', payload: id });
  };

  const getNextPath = () => {
    return '/builder/smart-apply';
  };

  return (
    <div className="step-page">
      <h1>Languages</h1>
      <p className="step-subtitle">Include your native language and additional languages you speak.</p>

      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
        {COMMON_LANGUAGES.map(lang => (
          <button key={lang} className="btn btn-outline btn-sm"
            style={{ borderRadius: '30px' }}
            onClick={() => {
              dispatch({ type: 'ADD_LANGUAGE', payload: { language: lang, level: 'Proficient (C2)' } });
            }}>
            {lang} +
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {languages.map(lang => (
          <div key={lang.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: 'var(--space-4)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)'
          }}>
            <div>
              <strong>{lang.language}</strong>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{lang.level}</div>
            </div>
            <button className="entry-action-btn delete" onClick={() => handleRemove(lang.id)}>✕</button>
          </div>
        ))}
      </div>

      {!isEditing ? (
        <button className="btn btn-ghost" onClick={() => setIsEditing(true)} style={{ color: 'var(--color-text-link)', fontWeight: 600 }}>
          + Add new language
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end', background: 'var(--color-surface-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Language</label>
            <input className="form-input" value={newLang.language} onChange={e => setNewLang(prev => ({ ...prev, language: e.target.value }))} placeholder="e.g. English" autoFocus />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">Level</label>
            <select className="form-input form-select" value={newLang.level} onChange={e => setNewLang(prev => ({ ...prev, level: e.target.value }))}>
              {LANGUAGE_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
            </select>
          </div>
          <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd}>Save</button>
        </div>
      )}

      <StepNavigation
        backPath="/builder/personal-details"
        nextPath={getNextPath()}
        nextLabel="Next"
      />
    </div>
  );
}
