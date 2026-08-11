import { Link } from 'react-router-dom';
import StepNavigation from '../../../components/StepNavigation';

export default function SmartApply() {
  return (
    <div className="step-page">
      <h1>Your Resume is Ready!</h1>
      <p className="step-subtitle">
        Congratulations! You've completed all sections. Now let's fine-tune the design
        and export your professional resume.
      </p>

      <div style={{
        background: 'linear-gradient(135deg, #F5F3FF, #EEF2FF)',
        borderRadius: 'var(--radius-xl)', padding: 'var(--space-8)',
        border: '1px solid #DDD6FE', marginTop: 'var(--space-6)',
      }}>
        <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          🎯 ATS-Optimized Resume
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 'var(--line-height-relaxed)' }}>
          Your resume has been built with ATS (Applicant Tracking System) optimization in mind:
        </p>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[
            'Clean, parsable format that ATS systems can read',
            'Keyword-rich content based on your job title',
            'Professional formatting that passes automated screening',
            'Standard section headers recognized by hiring software',
          ].map((benefit, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
              <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>✓</span>
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-8)' }}>
        <Link to="/finalize" className="btn btn-accent btn-lg" style={{ padding: 'var(--space-5) var(--space-12)' }}>
          🚀 Finalize &amp; Download Resume
        </Link>
      </div>
    </div>
  );
}
