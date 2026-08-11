import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StepNavigation from '../../../components/StepNavigation';

export default function ResumePurpose() {
  const [purpose, setPurpose] = useState('');
  const navigate = useNavigate();

  const handleSelect = (value) => {
    setPurpose(value);
    setTimeout(() => navigate('/builder/work-history'), 300);
  };

  return (
    <div className="step-page">
      <h1>Why do you need a resume?</h1>
      <p className="step-subtitle">This helps us tailor suggestions to your situation.</p>

      <div className="selection-grid">
        <div
          className={`selection-card ${purpose === 'job' ? 'selected' : ''}`}
          onClick={() => handleSelect('job')}
          role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && handleSelect('job')}
        >
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>💼</div>
          <h3>I'm looking for a job</h3>
          <p>Create a resume optimized for job applications</p>
        </div>

        <div
          className={`selection-card ${purpose === 'other' ? 'selected' : ''}`}
          onClick={() => handleSelect('other')}
          role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && handleSelect('other')}
        >
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>📋</div>
          <h3>A different reason</h3>
          <p>Academic, freelance, portfolio, or other purposes</p>
        </div>
      </div>

      <StepNavigation
        backPath="/builder/contact"
        nextPath="/builder/work-history"
        nextLabel="Next"
        disabled={!purpose}
      />
    </div>
  );
}
