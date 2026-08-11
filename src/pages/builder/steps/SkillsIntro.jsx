import StepNavigation from '../../../components/StepNavigation';

export default function SkillsIntro() {
  return (
    <div className="step-page">
      <h1>Next, let's take care of your Skills</h1>
      <p className="step-subtitle">
        Employers scan skills quickly — highlight the most relevant ones for your target role.
        Our AI-powered suggestions will help you find the right skills.
      </p>

      <div className="callout callout-ai" style={{ marginTop: 'var(--space-6)' }}>
        <span style={{ fontSize: '1.5rem' }}>✦</span>
        <div>
          <strong>AI Writing Assistant:</strong> Search for your job title and we'll suggest the most
          in-demand skills for that role, backed by data from thousands of successful resumes.
        </div>
      </div>

      <StepNavigation
        backPath="/builder/education-summary"
        nextPath="/builder/skills-editor"
        nextLabel="Next"
      />
    </div>
  );
}
