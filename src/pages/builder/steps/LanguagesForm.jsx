import { useState } from 'react';
import { useResume } from '../../../context/ResumeContext';
import StepNavigation from '../../../components/StepNavigation';
import { getOptionalSectionPath } from '../../../utils/optionalSections';
import ResumeIcon from '../../../components/ResumeIcon';

const COMMON_LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Mandarin', 'Arabic', 'Hindi', 'Portuguese'];

export default function LanguagesForm() {
  const { state, dispatch } = useResume();
  const languages = state.languages || [];
  const [newLang, setNewLang] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleAdd = () => {
    const language = newLang.trim();
    if (!language) return;
    dispatch({ type: 'ADD_LANGUAGE', payload: { language } });
    setNewLang('');
    setIsEditing(false);
  };

  const handleRemove = (id) => {
    dispatch({ type: 'DELETE_LANGUAGE', payload: id });
  };

  const selected = state.extraSections.selected || [];

  return (
    <div className="step-page">
      <h1>Languages</h1>
      <p className="step-subtitle">Include your native language and additional languages you speak.</p>

      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
        {COMMON_LANGUAGES.map(lang => (
          <button key={lang} className="btn btn-outline btn-sm"
            style={{ borderRadius: '30px' }}
            onClick={() => {
              dispatch({ type: 'ADD_LANGUAGE', payload: { language: lang } });
            }}>
            {lang} <ResumeIcon name="add" size={15} />
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
            <strong>{lang.language}</strong>
            <button className="entry-action-btn delete" onClick={() => handleRemove(lang.id)} title="Remove language" aria-label={`Remove ${lang.language}`}><ResumeIcon name="delete" size={17} /></button>
          </div>
        ))}
      </div>

      {!isEditing ? (
        <button className="btn btn-ghost" onClick={() => setIsEditing(true)} style={{ color: 'var(--color-text-link)', fontWeight: 600 }}>
          <ResumeIcon name="add" size={18} />Add new language
        </button>
      ) : (
        <div className="language-editor-row" style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end', background: 'var(--color-surface-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Language</label>
            <input className="form-input" value={newLang} onChange={e => setNewLang(e.target.value)} placeholder="e.g. English" autoFocus />
          </div>
          <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd}>Save</button>
        </div>
      )}

      <StepNavigation
        backPath={getOptionalSectionPath(selected, 'languages', 'back')}
        nextPath={getOptionalSectionPath(selected, 'languages')}
        nextLabel="Next"
      />
    </div>
  );
}
