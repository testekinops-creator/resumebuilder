import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EDUCATION_LEVELS } from '../../../data/templates';
import StepNavigation from '../../../components/StepNavigation';

export default function EducationLevel() {
  const [selected, setSelected] = useState('');
  const navigate = useNavigate();

  const handleSelect = (levelId) => {
    setSelected(levelId);
    setTimeout(() => navigate('/builder/education-form'), 300);
  };

  return (
    <div className="step-page">
      <h1>What is your highest level of education?</h1>
      <p className="step-subtitle">Select your highest degree or qualification.</p>

      <div className="selection-grid selection-grid-3">
        {EDUCATION_LEVELS.map(level => (
          <div
            key={level.id}
            className={`selection-card ${selected === level.id ? 'selected' : ''}`}
            onClick={() => handleSelect(level.id)}
            role="button" tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && handleSelect(level.id)}
          >
            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>{level.icon}</div>
            <h3>{level.label}</h3>
          </div>
        ))}
      </div>

      <button className="btn btn-ghost" onClick={() => navigate('/builder/education-form')}
        style={{ marginTop: 'var(--space-4)' }}>
        Prefer not to answer
      </button>

      <StepNavigation
        backPath="/builder/education-intro"
        nextPath="/builder/education-form"
        nextLabel="Next"
        disabled={!selected}
      />
    </div>
  );
}
