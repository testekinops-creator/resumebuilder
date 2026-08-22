import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResume } from '../../context/ResumeContext';
import Navbar from '../../components/Navbar';
import ResumeIcon from '../../components/ResumeIcon';
import { normalizeImportFailure, prepareResumeImport } from '../../utils/resumeFileImport';
import './Onboarding.css';

function resumeNameFromFile(file) {
  return String(file?.name || 'Imported Resume')
    .replace(/\.[^.]+$/, '')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50) || 'Imported Resume';
}

function hasExistingResumeData(state) {
  const hasText = value => String(value || '').replace(/<[^>]*>/g, '').trim().length > 0;
  return Boolean(
    Object.values(state.contact || {}).some(Boolean)
    || hasText(state.summary?.content)
    || hasText(state.skills?.textContent)
    || state.workHistory?.length
    || state.education?.length
    || state.languages?.length
    || state.websites?.length
    || hasText(state.certifications?.content)
    || state.extraSections?.custom?.length
  );
}

function importReviewSummary(parsed) {
  const summary = parsed.summary || {};
  const parts = [
    summary.contact ? 'contact details' : '',
    summary.summary ? 'summary' : '',
    summary.skills ? 'skills' : '',
    summary.workHistory ? `${summary.workHistory} experience ${summary.workHistory === 1 ? 'entry' : 'entries'}` : '',
    summary.education ? `${summary.education} education ${summary.education === 1 ? 'entry' : 'entries'}` : '',
    summary.certifications ? 'certifications' : '',
    summary.languages ? `${summary.languages} languages` : '',
    summary.additionalSections ? `${summary.additionalSections} additional ${summary.additionalSections === 1 ? 'section' : 'sections'}` : '',
  ].filter(Boolean);
  return parts.join(', ');
}

export default function UploadOrScratch() {
  const navigate = useNavigate();
  const { state, dispatch } = useResume();
  const [uploading, setUploading] = useState(false);
  const [progressLabel, setProgressLabel] = useState('Processing resume...');
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const fileInputRef = useRef(null);
  const processingRef = useRef(false);

  const finishImport = (parsed, file) => {
    const resumeName = resumeNameFromFile(file);
    dispatch({ type: 'IMPORT_RESUME_DATA', payload: { ...parsed.patch, resumeName } });
    navigate('/builder/contact', {
      state: {
        importReview: {
          fileName: resumeName,
          summary: importReviewSummary(parsed),
          review: parsed.review,
        },
      },
    });
  };

  const handleFiles = async (files) => {
    const selectedFiles = Array.from(files || []);
    setUploadError('');
    setDragActive(false);

    if (processingRef.current || pendingImport) return;
    if (selectedFiles.length !== 1) {
      setUploadError(selectedFiles.length > 1
        ? 'Please upload one resume at a time.'
        : 'Choose a PDF, DOCX, or TXT resume to upload.');
      return;
    }

    const [file] = selectedFiles;
    processingRef.current = true;
    setUploading(true);
    setProgressLabel('Validating your resume...');

    try {
      const parsed = await prepareResumeImport(file, { onProgress: setProgressLabel });

      if (hasExistingResumeData(state)) {
        setPendingImport({ parsed, file });
      } else {
        finishImport(parsed, file);
      }
    } catch (error) {
      setUploadError(error?.code === 'EMPTY_RESUME'
        ? 'We could not find editable resume details in that file. Try a text-based PDF/DOCX/TXT resume or start from scratch.'
        : normalizeImportFailure(error));
    } finally {
      processingRef.current = false;
      setUploading(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    handleFiles(event.dataTransfer.files);
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    if (!uploading && !pendingImport && event.dataTransfer.types.includes('Files')) setDragActive(true);
  };

  const handleDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setDragActive(false);
  };

  const isBusy = uploading || Boolean(pendingImport);

  return (
    <div className="onboarding-page">
      <Navbar />
      <main id="main-content" className="onboarding-container onboarding-centered">
        <div className="onboarding-content upload-page-content">
          <h1>Do you have an existing resume?</h1>
          <p className="onboarding-subtitle">
            You can upload your current resume to get started faster, or build one from scratch.
          </p>

          <div className="upload-choice-grid">
            <button type="button" className="upload-choice-card" onClick={() => navigate('/builder/contact')} disabled={isBusy}>
              <div className="badge badge-recommended upload-recommended">Recommended</div>
              <div className="upload-icon"><ResumeIcon name="document" size={36} /></div>
              <h3>Start from scratch</h3>
              <p>Build your resume step by step with our guided builder and expert suggestions.</p>
            </button>

            <button
              type="button"
              className={`upload-choice-card ${dragActive ? 'drag-active' : ''}`}
              onClick={() => !isBusy && fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragEnter={handleDragEnter}
              onDragOver={event => event.preventDefault()}
              onDragLeave={handleDragLeave}
              disabled={isBusy}
              aria-describedby="upload-format-help"
              aria-busy={uploading}
            >
              <div className="upload-icon"><ResumeIcon name="upload" size={36} /></div>
              <h3>Upload your resume</h3>
              <p>Drag & drop your PDF, DOCX, or TXT file here, or click to browse.</p>
              <p id="upload-format-help" className="upload-helper-text">Max 10MB · Supported: PDF, DOCX, TXT</p>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={event => {
              // FileList is live in some browsers. Copy it before clearing the
              // input so choosing a file does not turn into an empty upload.
              const files = Array.from(event.target.files || []);
              event.target.value = '';
              handleFiles(files);
            }}
            tabIndex={-1}
            aria-hidden="true"
            className="upload-file-input"
          />

          {uploading && (
            <div className="upload-status" role="status" aria-live="polite">
              <div className="spinner spinner-sm" />
              <span>{progressLabel}</span>
            </div>
          )}

          {uploadError && (
            <div className="upload-error" role="alert">
              <ResumeIcon name="info" size={18} /> <span>{uploadError}</span>
            </div>
          )}

          {pendingImport && (
            <section className="upload-replace-confirmation" role="dialog" aria-modal="true" aria-labelledby="replace-resume-title">
              <h2 id="replace-resume-title">Replace the current resume?</h2>
              <p>Importing <strong>{resumeNameFromFile(pendingImport.file)}</strong> will replace the current editable resume. Your existing resume remains available through Undo after import.</p>
              <div className="upload-confirm-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setPendingImport(null)}>Keep current resume</button>
                <button type="button" className="btn btn-primary" onClick={() => finishImport(pendingImport.parsed, pendingImport.file)}>Replace and review import</button>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
