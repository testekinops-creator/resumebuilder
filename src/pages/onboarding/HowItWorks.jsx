import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import './Onboarding.css';

export default function HowItWorks() {
  return (
    <div className="onboarding-page">
      <Navbar />
      <main id="main-content" className="onboarding-container">
        <div className="onboarding-content">
          <h1>How does it work?</h1>
          <p className="onboarding-subtitle">It's simple! Just follow these 3 easy steps to create your professional resume.</p>

          <div className="how-steps">
            <div className="how-step">
              <div className="how-step-number">1</div>
              <div className="how-step-info">
                <h3>Select a template</h3>
                <p>Choose from our professionally designed resume templates. Each one is crafted to highlight your strengths.</p>
              </div>
            </div>
            <div className="how-step">
              <div className="how-step-number">2</div>
              <div className="how-step-info">
                <h3>Build your resume</h3>
                <p>Fill in your details step by step. We'll guide you with expert suggestions and AI-powered writing assistance.</p>
              </div>
            </div>
            <div className="how-step">
              <div className="how-step-number">3</div>
              <div className="how-step-info">
                <h3>Customize and download</h3>
                <p>Fine-tune your design, change colors and fonts, then download as a polished PDF ready for employers.</p>
              </div>
            </div>
          </div>

          <Link to="/experience-level" className="btn btn-accent btn-lg" style={{ marginTop: 'var(--space-8)' }}>
            Next
          </Link>
        </div>
        <div className="onboarding-visual">
          <div className="mini-resume-preview">
            <div className="mrp-header"></div>
            <div className="mrp-body">
              <div className="mrp-line w80"></div>
              <div className="mrp-line w60"></div>
              <div className="mrp-line w90"></div>
              <div className="mrp-line w70"></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
