import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './LandingPage.css';

const FAQ_ITEMS = [
  { q: 'What is an AI resume builder?', a: 'An AI resume builder uses artificial intelligence to help you create a professional resume. It suggests bullet points, optimizes your content for ATS (Applicant Tracking Systems), and provides industry-specific phrasing to make your resume stand out.' },
  { q: 'Should I download my new resume as a PDF or text file?', a: 'We recommend downloading as PDF. PDF preserves your formatting exactly as designed, looks professional, and is widely accepted by employers and ATS systems. Our builder generates high-quality PDFs at 300 DPI.' },
  { q: 'How can I use Resume Builder for free?', a: 'Resume Builder is completely free with no hidden fees. You can create unlimited resumes, use all 6 templates, and download as many PDFs as you want. Your data stays on your device — no account required.' },
  { q: 'How do I use the cover letter builder?', a: 'Navigate to the Cover Letter Builder from the landing page or dashboard. Choose a tone (Formal, Friendly, or Confident), enter the company and job details, and our builder will generate a customized cover letter that you can edit and download.' },
  { q: 'Can I create multiple resumes?', a: 'Yes! Use the Dashboard to create and manage multiple resumes. Each resume can use a different template and be tailored for different job applications. You can duplicate, edit, or export any resume at any time.' },
  { q: 'Is my data safe and private?', a: 'Absolutely. Resume Builder runs entirely in your browser. Your data is stored locally on your device using localStorage and IndexedDB. We never send your personal information to any server.' },
  { q: 'What templates are available?', a: 'We offer 6 professionally designed templates: Classic, Modern, Professional, Creative, Minimal, and Executive. Each template supports customizable colors, fonts, and layouts to match your personal style and industry.' },
];

function FaqItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <button className="faq-question" onClick={() => setOpen(!open)}>
        <span>{item.q}</span>
        <span className="faq-icon">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="faq-answer"><p>{item.a}</p></div>}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="landing">
      <Navbar />

      <main id="main-content" className="landing-hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              The Best Online<br />
              <span className="hero-title-accent">Resume Builder</span>
            </h1>
            <p className="hero-subtitle">
              Create a professional resume in minutes. Our builder helps you craft
              the perfect resume with expert suggestions, beautiful templates, and
              instant PDF download.
            </p>
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-arrow">↑</span>
                <span className="stat-value">38%</span>
                <span className="stat-label">more interviews</span>
              </div>
              <div className="stat">
                <span className="stat-arrow">↑</span>
                <span className="stat-value">23%</span>
                <span className="stat-label">more job offers</span>
              </div>
            </div>
            <div className="hero-actions">
              <Link to="/get-started" className="btn btn-primary btn-lg">
                Create My Resume
              </Link>
              <Link to="/upload-resume" className="btn btn-outline btn-lg">
                Import Resume
              </Link>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-resume-mockup">
              <div className="mockup-header">
                <div className="mockup-avatar"></div>
                <div className="mockup-lines">
                  <div className="mockup-line w60"></div>
                  <div className="mockup-line w40"></div>
                </div>
              </div>
              <div className="mockup-body">
                <div className="mockup-section">
                  <div className="mockup-section-title"></div>
                  <div className="mockup-line w90"></div>
                  <div className="mockup-line w80"></div>
                  <div className="mockup-line w70"></div>
                </div>
                <div className="mockup-section">
                  <div className="mockup-section-title"></div>
                  <div className="mockup-line w85"></div>
                  <div className="mockup-line w75"></div>
                </div>
                <div className="mockup-section">
                  <div className="mockup-section-title"></div>
                  <div className="mockup-skills">
                    <div className="mockup-skill"></div>
                    <div className="mockup-skill"></div>
                    <div className="mockup-skill"></div>
                    <div className="mockup-skill"></div>
                  </div>
                </div>
              </div>
            </div>
            {/* Floating elements */}
            <div className="float-badge float-1">✓ ATS Optimized</div>
            <div className="float-badge float-2">⭐ Expert Reviewed</div>
            <div className="float-badge float-3">📄 PDF Ready</div>
          </div>
        </div>
      </main>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="section-container">
          <h2 className="section-title">Build Your Resume in 3 Easy Steps</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-card-number">1</div>
              <div className="step-card-icon">📝</div>
              <h3>Select a Template</h3>
              <p>Choose from our professionally designed templates that fit your style and industry.</p>
            </div>
            <div className="step-card">
              <div className="step-card-number">2</div>
              <div className="step-card-icon">✨</div>
              <h3>Fill in Your Details</h3>
              <p>Our guided builder walks you through each section with expert suggestions and AI assistance.</p>
            </div>
            <div className="step-card">
              <div className="step-card-number">3</div>
              <div className="step-card-icon">🚀</div>
              <h3>Download & Apply</h3>
              <p>Download your polished resume as PDF, print it, or email it directly to employers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="section-container">
          <h2 className="section-title">Why Choose Our Resume Builder?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎨</div>
              <h3>Beautiful Templates</h3>
              <p>6 professionally designed templates with customizable colors and fonts.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>AI-Powered Suggestions</h3>
              <p>Get expert-recommended bullet points and summaries tailored to your job title.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👁️</div>
              <h3>Live Preview</h3>
              <p>See your resume update in real-time as you type. No surprises.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Mobile Friendly</h3>
              <p>Build your resume on any device — desktop, tablet, or phone.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>100% Private</h3>
              <p>Your data stays on your device. No account required, no data sent to servers.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>Completely Free</h3>
              <p>No hidden fees, no watermarks, no premium tiers. Everything is free.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials">
        <div className="section-container">
          <h2 className="section-title">What Our Users Say</h2>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-stars">★★★★★</div>
              <p>"I landed 3 interviews in my first week after rebuilding my resume with this tool. The AI suggestions were incredibly helpful."</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">S</div>
                <div>
                  <strong>Sarah K.</strong>
                  <span>Software Engineer</span>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-stars">★★★★★</div>
              <p>"The easiest resume builder I've ever used. Beautiful templates and the live preview is a game-changer. Highly recommended!"</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">M</div>
                <div>
                  <strong>Michael R.</strong>
                  <span>Marketing Director</span>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-stars">★★★★★</div>
              <p>"As a recent graduate, this tool helped me create a professional resume that stood out. Got my dream job within a month!"</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">A</div>
                <div>
                  <strong>Aisha T.</strong>
                  <span>Data Analyst</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <div className="section-container">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <div className="faq-list">
            {FAQ_ITEMS.map((item, i) => (
              <FaqItem key={i} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="section-container">
          <h2>Ready to Build Your Perfect Resume?</h2>
          <p>Join thousands of job seekers who landed their dream jobs with our builder.</p>
          <Link to="/get-started" className="btn btn-primary btn-lg">
            Get Started — It's Free
          </Link>
          <div className="cta-links">
            <Link to="/examples" className="cta-link">📋 Browse Examples</Link>
            <Link to="/cover-letter" className="cta-link">✉️ Cover Letter</Link>
            <Link to="/compare" className="cta-link">🔀 Compare Templates</Link>
            <Link to="/career" className="cta-link">🎯 Career Center</Link>
            <Link to="/dashboard" className="cta-link">📂 My Resumes</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
