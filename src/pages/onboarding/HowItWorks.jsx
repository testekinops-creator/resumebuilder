import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import ResumeIcon from '../../components/ResumeIcon';
import './Onboarding.css';

const STEPS = [
  { number: '01', icon: 'template', title: 'Select a template', description: 'Start with a professionally designed layout that puts your experience in the best light.' },
  { number: '02', icon: 'edit', title: 'Build your resume', description: 'Add your details with guided suggestions and focused AI writing support whenever you need it.' },
  { number: '03', icon: 'design', title: 'Customize & download', description: 'Refine the design, colors and fonts, then download a polished, employer-ready resume.' },
];

export default function HowItWorks() {
  return (
    <div className="onboarding-page">
      <Navbar />
      <main id="main-content" className="onboarding-container how-it-works-layout">
        <section className="onboarding-content how-it-works-content" aria-labelledby="how-it-works-title">
          <p className="how-eyebrow"><ResumeIcon name="sparkle" size={16} /> Guided resume setup</p>
          <div className="how-heading-row">
            <div>
              <h1 id="how-it-works-title">How does it work?</h1>
              <p className="onboarding-subtitle">Build a professional resume with a clear, guided flow that stays in your control.</p>
            </div>
            <p className="how-context"><span>3 guided steps</span><i aria-hidden="true" /> Usually under 10 minutes</p>
          </div>

          <div className="how-steps">
            {STEPS.map(step => (
              <article className="how-step" key={step.number}>
                <span className="how-step-number" aria-hidden="true">{step.number}</span>
                <span className="how-step-icon" aria-hidden="true"><ResumeIcon name={step.icon} size={21} /></span>
                <div className="how-step-info">
                  <p className="how-step-label">Step {step.number}</p>
                  <h2>{step.title}</h2>
                  <p>{step.description}</p>
                </div>
              </article>
            ))}
          </div>

          <Link to="/experience-level" className="btn btn-accent btn-lg how-next-button">
            Continue <ResumeIcon name="arrowRight" size={19} />
          </Link>
        </section>

        <aside className="onboarding-visual" aria-label="Resume Builder workflow preview">
          <div className="workflow-visual">
            <div className="workflow-chip workflow-chip-template"><ResumeIcon name="template" size={15} /> Template</div>
            <div className="workflow-chip workflow-chip-ai"><ResumeIcon name="sparkle" size={15} /> AI enhance</div>
            <div className="workflow-chip workflow-chip-design"><ResumeIcon name="design" size={15} /> Design</div>
            <div className="workflow-chip workflow-chip-download"><ResumeIcon name="download" size={15} /> PDF ready</div>
            <div className="workflow-backdrop" aria-hidden="true"><span /><span /><span /></div>
            <div className="mini-resume-preview">
              <div className="workflow-topbar"><span /><span /><span /><b>Resume Builder</b></div>
              <div className="workflow-template-strip" aria-hidden="true"><span className="active" /><span /><span /><i /></div>
              <div className="workflow-paper">
                <header className="workflow-paper-header">
                  <span className="workflow-avatar">AM</span>
                  <div><strong>Alex Morgan</strong><small>Product Designer</small><em>alex@email.com &nbsp; • &nbsp; Remote</em></div>
                </header>
                <section className="workflow-paper-section">
                  <h3>Professional summary <ResumeIcon name="edit" size={12} /></h3>
                  <p>Designing clear, thoughtful products that make work simpler.</p>
                </section>
                <section className="workflow-paper-section workflow-skills"><h3>Skills</h3><span>UX strategy</span><span>Figma</span><span>Research</span></section>
                <section className="workflow-paper-section workflow-experience"><h3>Experience</h3><div><b>Senior Product Designer</b><small>2022 — Present</small></div><p>Leading end-to-end product design across a growing platform.</p></section>
                <section className="workflow-paper-section workflow-education"><h3>Education</h3><p>BA, Interaction Design</p></section>
              </div>
              <div className="workflow-footer" aria-hidden="true"><span /><span /><b><ResumeIcon name="download" size={14} /> Download</b></div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
