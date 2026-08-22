import { Link } from 'react-router-dom';
import ResumeIcon from '../../../components/ResumeIcon';

export default function SmartApply() {
  return (
    <div className="step-page">
      <h1>Your Resume is Ready!</h1>
      <p className="step-subtitle">
        Congratulations! You've completed all sections. Now let's fine-tune the design
        and export your professional resume.
      </p>

      <section className="ats-callout">
        <h2 className="ats-callout-title">
          <ResumeIcon name="finish" size={21} />ATS-Optimized Resume
        </h2>
        <p className="ats-callout-copy">
          Your resume has been built with ATS (Applicant Tracking System) optimization in mind:
        </p>
        <ul className="ats-callout-list">
          {[
            'Clean, parsable format that ATS systems can read',
            'Keyword-rich content based on your job title',
            'Professional formatting that passes automated screening',
            'Standard section headers recognized by hiring software',
          ].map((benefit, i) => (
            <li key={i}>
              <span className="ats-callout-check"><ResumeIcon name="finish" size={16} /></span>
              {benefit}
            </li>
          ))}
        </ul>
      </section>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-8)' }}>
        <Link to="/finalize" className="btn btn-accent btn-lg" style={{ padding: 'var(--space-5) var(--space-12)' }}>
          <ResumeIcon name="download" size={20} />Finalize &amp; Download Resume
        </Link>
      </div>
    </div>
  );
}
