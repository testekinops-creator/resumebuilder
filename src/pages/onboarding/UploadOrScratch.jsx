import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResume } from '../../context/ResumeContext';
import Navbar from '../../components/Navbar';
import './Onboarding.css';

export default function UploadOrScratch() {
  const navigate = useNavigate();
  const { dispatch } = useResume();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const parseTextToResume = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const data = {};

    // Extract email
    const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
    if (emailMatch) data.email = emailMatch[0];

    // Extract phone
    const phoneMatch = text.match(/[\+]?[\d\s\-()]{7,20}/);
    if (phoneMatch) data.phone = phoneMatch[0].trim();

    // Extract name (typically first non-empty line)
    if (lines.length > 0) {
      const nameLine = lines[0].trim();
      if (nameLine.length < 60 && !nameLine.includes('@')) {
        const parts = nameLine.split(/\s+/);
        data.firstName = parts[0] || '';
        data.surname = parts.slice(1).join(' ') || '';
      }
    }

    // Extract sections by common headers
    const sectionHeaders = {
      experience: /^(experience|work\s*history|employment|professional\s*experience)/i,
      education: /^(education|academic|qualification)/i,
      skills: /^(skills|technical\s*skills|competencies|expertise)/i,
      summary: /^(summary|profile|objective|about)/i,
    };

    let currentSection = null;
    const sections = { experience: [], education: [], skills: [], summary: [] };

    for (const line of lines) {
      const trimmed = line.trim();
      let matched = false;
      for (const [key, regex] of Object.entries(sectionHeaders)) {
        if (regex.test(trimmed)) {
          currentSection = key;
          matched = true;
          break;
        }
      }
      if (!matched && currentSection) {
        sections[currentSection].push(trimmed);
      }
    }

    // Apply extracted data
    if (data.email || data.firstName) {
      dispatch({ type: 'SET_CONTACT', payload: data });
    }

    if (sections.summary.length > 0) {
      dispatch({ type: 'SET_SUMMARY', payload: { content: `<p>${sections.summary.join(' ')}</p>` } });
    }

    if (sections.skills.length > 0) {
      const skillsHtml = '<ul>' + sections.skills.slice(0, 15).map(s => `<li>${s}</li>`).join('') + '</ul>';
      dispatch({ type: 'SET_SKILLS', payload: { textContent: skillsHtml } });
    }
  };

  const handleFile = async (file) => {
    setUploadError('');

    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('File is too large (max 10MB).');
      return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'doc', 'txt'].includes(ext)) {
      setUploadError('Unsupported file type. Use PDF, DOCX, or TXT.');
      return;
    }

    setUploading(true);

    try {
      if (ext === 'txt') {
        const text = await file.text();
        parseTextToResume(text);
      } else if (ext === 'pdf') {
        const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map(item => item.str).join(' ') + '\n';
        }
        parseTextToResume(fullText);
      } else if (ext === 'docx') {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        parseTextToResume(result.value);
      } else {
        setUploadError('DOC files are not supported. Please convert to DOCX.');
        setUploading(false);
        return;
      }

      navigate('/builder/contact');
    } catch (err) {
      console.error('File parsing error:', err);
      setUploadError('Failed to parse file. Please try a different file or start from scratch.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  return (
    <div className="onboarding-page">
      <Navbar />
      <main id="main-content" className="onboarding-container onboarding-centered">
        <div className="onboarding-content" style={{ maxWidth: 700 }}>
          <h1>Do you have an existing resume?</h1>
          <p className="onboarding-subtitle">
            You can upload your current resume to get started faster, or build one from scratch.
          </p>

          <div className="upload-choice-grid">
            <div className="upload-choice-card" onClick={() => navigate('/builder/contact')}>
              <div className="badge badge-recommended" style={{ marginBottom: 'var(--space-4)' }}>Recommended</div>
              <div className="upload-icon">📄</div>
              <h3>Start from scratch</h3>
              <p>Build your resume step by step with our guided builder and expert suggestions.</p>
            </div>

            <div
              className={`upload-choice-card ${dragActive ? 'drag-active' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setDragActive(false)}
            >
              <div className="upload-icon">📤</div>
              <h3>Upload your resume</h3>
              <p>Drag & drop your PDF, DOCX, or TXT file here, or click to browse.</p>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-2)' }}>
                Max 10MB • Supported: PDF, DOCX, TXT
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={e => handleFile(e.target.files[0])}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {uploading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-4)', justifyContent: 'center' }}>
              <div className="spinner spinner-sm" />
              <span style={{ color: 'var(--color-text-secondary)' }}>Parsing your resume...</span>
            </div>
          )}

          {uploadError && (
            <div style={{
              marginTop: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-error-light)', border: '1px solid var(--color-error)',
              borderRadius: 'var(--radius-md)', color: 'var(--color-error)',
              fontSize: 'var(--font-size-sm)', textAlign: 'center',
            }}>
              ⚠️ {uploadError}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
