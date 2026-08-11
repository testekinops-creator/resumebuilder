import { useState, useCallback } from 'react';
import { useResume } from '../../context/ResumeContext';
import { useTheme } from '../../hooks/useTheme';
import Navbar from '../../components/Navbar';
import DOMPurify from 'dompurify';
import './CoverLetter.css';

const TEMPLATES = [
  { id: 'professional', name: 'Professional', color: '#1A1F36' },
  { id: 'modern', name: 'Modern', color: '#3B82F6' },
  { id: 'creative', name: 'Creative', color: '#E84D39' },
];

const TONE_OPTIONS = [
  { id: 'formal', label: 'Formal', icon: '🎩' },
  { id: 'friendly', label: 'Friendly', icon: '😊' },
  { id: 'confident', label: 'Confident', icon: '💪' },
];

export default function CoverLetter() {
  const { state } = useResume();
  const { isDark, toggle } = useTheme();

  const [step, setStep] = useState(1);
  const [letterData, setLetterData] = useState({
    recipientName: '',
    companyName: '',
    jobTitle: '',
    tone: 'formal',
    templateId: 'professional',
    openingParagraph: '',
    bodyParagraph: '',
    closingParagraph: '',
  });

  const userName = `${state.contact.firstName || 'Your'} ${state.contact.surname || 'Name'}`;

  const generateParagraphs = useCallback(() => {
    const { jobTitle, companyName, tone } = letterData;
    const skills = state.skills?.ratings?.map(s => s.name).join(', ') || 'relevant skills';
    const experience = state.workHistory?.[0];

    const openers = {
      formal: `I am writing to express my strong interest in the ${jobTitle || '[Job Title]'} position at ${companyName || '[Company]'}. With my background in ${experience?.jobTitle || 'the field'}, I am confident that my qualifications align well with your requirements.`,
      friendly: `I was thrilled to see the ${jobTitle || '[Job Title]'} opening at ${companyName || '[Company]'}! Having followed your company's impressive work, I'm excited about the opportunity to contribute my skills and passion to your team.`,
      confident: `As an accomplished professional with proven expertise in ${skills}, I am the ideal candidate for the ${jobTitle || '[Job Title]'} role at ${companyName || '[Company]'}. My track record speaks directly to what your team needs.`,
    };

    const bodies = {
      formal: `In my current role as ${experience?.jobTitle || 'a professional'} at ${experience?.employer || 'my current company'}, I have developed expertise in ${skills}. I bring a combination of technical proficiency and collaborative approach that would be an asset to ${companyName || 'your organization'}.`,
      friendly: `During my time at ${experience?.employer || 'my current company'}, I've had the chance to work on some amazing projects using ${skills}. I especially love the challenge of solving complex problems and creating meaningful impact — something I know ${companyName || 'your team'} values too.`,
      confident: `My experience at ${experience?.employer || 'leading organizations'} has equipped me with advanced capabilities in ${skills}. I have consistently delivered results that exceed expectations, and I am ready to bring the same excellence to ${companyName || 'your team'}.`,
    };

    const closings = {
      formal: `I would welcome the opportunity to discuss how my experience and skills would benefit ${companyName || 'your organization'}. Thank you for your time and consideration. I look forward to hearing from you.`,
      friendly: `I'd love the chance to chat more about how I can contribute to ${companyName || 'your team'}. Thanks so much for considering my application — I'm genuinely excited about this opportunity!`,
      confident: `I am eager to bring my proven track record to ${companyName || 'your team'} and drive meaningful results from day one. I welcome the opportunity to discuss my candidacy at your earliest convenience.`,
    };

    setLetterData(prev => ({
      ...prev,
      openingParagraph: openers[tone] || openers.formal,
      bodyParagraph: bodies[tone] || bodies.formal,
      closingParagraph: closings[tone] || closings.formal,
    }));
  }, [letterData.jobTitle, letterData.companyName, letterData.tone, state]);

  const handleChange = (field, value) => {
    setLetterData(prev => ({ ...prev, [field]: value }));
  };

  const handleNextStep = () => {
    if (step === 1) {
      generateParagraphs();
    }
    setStep(prev => Math.min(prev + 1, 3));
  };

  const handlePrint = () => window.print();

  const handleDownload = () => {
    const content = document.querySelector('.cl-preview-page');
    if (content) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html><head><title>Cover Letter</title>
        <style>body{font-family:'Inter',sans-serif;padding:48px;max-width:700px;margin:0 auto;color:#1E293B;line-height:1.7}
        h2{font-size:24px;margin-bottom:4px}p{margin-bottom:16px;font-size:15px}.cl-date{color:#64748B;font-size:14px;margin-bottom:24px}</style>
        </head><body>${content.innerHTML}</body></html>`);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const selectedTemplate = TEMPLATES.find(t => t.id === letterData.templateId) || TEMPLATES[0];

  return (
    <div className="cover-letter-page">
      <Navbar />

      <div className="cl-container">
        {/* Steps sidebar */}
        <div className="cl-sidebar">
          <h2>Cover Letter Builder</h2>
          <div className="cl-steps">
            {['Details', 'Write', 'Preview'].map((label, i) => (
              <div key={label} className={`cl-step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}
                onClick={() => setStep(i + 1)}>
                <div className="cl-step-number">{step > i + 1 ? '✓' : i + 1}</div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="cl-content">
          {step === 1 && (
            <div className="cl-form-section">
              <h3>Letter Details</h3>
              <p className="cl-form-desc">Tell us about the job you're applying for.</p>

              <div className="cl-form-group">
                <label>Recipient Name</label>
                <input className="form-input" value={letterData.recipientName}
                  onChange={e => handleChange('recipientName', e.target.value)}
                  placeholder="e.g. Jane Smith, Hiring Manager" />
              </div>

              <div className="cl-form-group">
                <label>Company Name <span className="required">*</span></label>
                <input className="form-input" value={letterData.companyName}
                  onChange={e => handleChange('companyName', e.target.value)}
                  placeholder="e.g. Google, Microsoft" />
              </div>

              <div className="cl-form-group">
                <label>Job Title <span className="required">*</span></label>
                <input className="form-input" value={letterData.jobTitle}
                  onChange={e => handleChange('jobTitle', e.target.value)}
                  placeholder="e.g. Senior Frontend Developer" />
              </div>

              <div className="cl-form-group">
                <label>Tone</label>
                <div className="cl-tone-options">
                  {TONE_OPTIONS.map(t => (
                    <button key={t.id}
                      className={`cl-tone-btn ${letterData.tone === t.id ? 'active' : ''}`}
                      onClick={() => handleChange('tone', t.id)}>
                      <span>{t.icon}</span> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="cl-form-group">
                <label>Template</label>
                <div className="cl-template-options">
                  {TEMPLATES.map(t => (
                    <button key={t.id}
                      className={`cl-template-btn ${letterData.templateId === t.id ? 'active' : ''}`}
                      onClick={() => handleChange('templateId', t.id)}>
                      <div className="cl-template-swatch" style={{ background: t.color }} />
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="cl-form-section">
              <h3>Write Your Letter</h3>
              <p className="cl-form-desc">Edit the generated paragraphs or write your own.</p>

              <div className="cl-form-group">
                <label>Opening Paragraph</label>
                <textarea className="form-textarea" rows={4} value={letterData.openingParagraph}
                  onChange={e => handleChange('openingParagraph', e.target.value)} />
              </div>

              <div className="cl-form-group">
                <label>Body Paragraph</label>
                <textarea className="form-textarea" rows={5} value={letterData.bodyParagraph}
                  onChange={e => handleChange('bodyParagraph', e.target.value)} />
              </div>

              <div className="cl-form-group">
                <label>Closing Paragraph</label>
                <textarea className="form-textarea" rows={3} value={letterData.closingParagraph}
                  onChange={e => handleChange('closingParagraph', e.target.value)} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="cl-preview-section">
              <div className="cl-preview-actions">
                <button className="btn btn-primary" onClick={handleDownload}>📄 Download</button>
                <button className="btn btn-ghost" onClick={handlePrint}>🖨️ Print</button>
              </div>

              <div className="cl-preview-page" style={{ borderTop: `4px solid ${selectedTemplate.color}` }}>
                <h2 style={{ color: selectedTemplate.color }}>{userName}</h2>
                <p style={{ fontSize: '14px', color: '#64748B' }}>
                  {state.contact.email} • {state.contact.phone} • {state.contact.city}
                </p>

                <p className="cl-date">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

                {letterData.recipientName && <p>Dear {letterData.recipientName},</p>}
                {!letterData.recipientName && <p>Dear Hiring Manager,</p>}

                <p>{letterData.openingParagraph}</p>
                <p>{letterData.bodyParagraph}</p>
                <p>{letterData.closingParagraph}</p>

                <p>Sincerely,<br /><strong>{userName}</strong></p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="cl-nav">
            {step > 1 && (
              <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>← Back</button>
            )}
            {step < 3 && (
              <button className="btn btn-primary" onClick={handleNextStep}
                disabled={step === 1 && (!letterData.companyName || !letterData.jobTitle)}>
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
