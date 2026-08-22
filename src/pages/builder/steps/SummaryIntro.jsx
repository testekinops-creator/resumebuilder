import { useResume } from '../../../context/ResumeContext';
import StepNavigation from '../../../components/StepNavigation';
import ResumeIcon from '../../../components/ResumeIcon';

export default function SummaryIntro() {
  const { state } = useResume();
  const hasWork = state.workHistory.length > 0;
  const hasSkills = state.skills.textContent || state.skills.ratings.length > 0;

  const strengths = [];
  if (state.contact.firstName) strengths.push(state.contact.firstName);
  if (hasWork) strengths.push(`experience as a ${state.workHistory[0]?.jobTitle || 'professional'}`);
  if (hasSkills) strengths.push('relevant skills');
  if (state.education.length > 0) strengths.push(`${state.education[0]?.degree || 'education'} background`);

  return (
    <div className="step-page">
      <h1>Nice job! Now let's work on your Summary</h1>
      <p className="step-subtitle">
        A well-written summary captures the attention of hiring managers in seconds.
        Let us help you craft the perfect introduction.
      </p>

      {strengths.length > 0 && (
        <div className="callout callout-ai" style={{ marginTop: 'var(--space-6)' }}>
          <ResumeIcon name="sparkle" size={24} />
          <div>
            <strong>Based on your resume, here are your key strengths:</strong>
            <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
              You have {strengths.join(', ')}. We'll use these to personalize your summary suggestions.
            </p>
          </div>
        </div>
      )}

      <StepNavigation
        backPath="/builder/skills-editor"
        nextPath="/builder/summary-editor"
        nextLabel="Next"
      />
    </div>
  );
}
