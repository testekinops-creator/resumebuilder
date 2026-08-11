import { useNavigate } from 'react-router-dom';
import { useResume } from '../../context/ResumeContext';
import { EXPERIENCE_LEVELS } from '../../data/templates';
import Navbar from '../../components/Navbar';
import './Onboarding.css';

export default function ExperienceLevel() {
  const navigate = useNavigate();
  const { state, dispatch } = useResume();

  const handleSelect = (levelId) => {
    dispatch({ type: 'SET_META', payload: { experienceLevel: levelId } });
    navigate('/choose-template');
  };

  return (
    <div className="onboarding-page">
      <Navbar />
      <main id="main-content" className="onboarding-container onboarding-centered">
        <div className="onboarding-content" style={{ maxWidth: 600 }}>
          <h1>How many years of experience do you have?</h1>
          <p className="onboarding-subtitle">We'll find the best templates for your experience level.</p>

          <div className="experience-grid">
            {EXPERIENCE_LEVELS.map(level => (
              <button
                key={level.id}
                className={`experience-card ${state.meta.experienceLevel === level.id ? 'selected' : ''}`}
                onClick={() => handleSelect(level.id)}
              >
                <span className="experience-label">{level.label}</span>
                <span className="experience-desc">{level.description}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
