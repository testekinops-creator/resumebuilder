import StepNavigation from '../../../components/StepNavigation';

export default function EducationIntro() {
  return (
    <div className="step-page">
      <h1>Great, let's work on your Education</h1>
      <p className="step-subtitle">
        Here's what you need to know: employers quickly scan your education section.
        Make sure to include your most relevant degrees and certifications.
      </p>

      <div className="callout callout-tip" style={{ marginTop: 'var(--space-6)' }}>
        <span style={{ fontSize: '1.5rem' }}>💡</span>
        <div>
          <strong>Pro Tip:</strong> Include your GPA if it's 3.5 or above. For experienced professionals,
          education is less important than work history — keep it concise.
        </div>
      </div>

      <StepNavigation
        backPath="/builder/work-summary"
        nextPath="/builder/education-level"
        nextLabel="Next"
      />
    </div>
  );
}
