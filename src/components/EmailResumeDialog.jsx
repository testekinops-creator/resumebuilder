import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  downloadResumeExport,
  emailResume,
  prepareResumeExport,
} from '../utils/pdfGenerator';
import { DOCX_PREPARING_LABEL, docxExportFailureFeedback, docxExportFailureText, logDocxExportFailure } from '../utils/docxExportFeedback';
import { useDialogFocus } from '../hooks/useDialogFocus';
import ResumeIcon from './ResumeIcon';
import './EmailResumeDialog.css';

const FORMAT_OPTIONS = [
  {
    id: 'pdf',
    label: 'PDF',
    description: 'Best for sharing and preserving the selected design.',
  },
  {
    id: 'docx',
    label: 'DOCX',
    description: 'An editable Microsoft Word document.',
  },
];

function notifySafely(onNotify, notification) {
  if (typeof onNotify !== 'function') return;
  try {
    onNotify(notification);
  } catch (error) {
    // Notifications are optional and must never interrupt the export workflow.
    console.error('Unable to show the resume export notification:', error);
  }
}

function supportsFileSharing(artifact) {
  if (
    !artifact?.file
    || typeof navigator === 'undefined'
    || typeof navigator.share !== 'function'
    || typeof navigator.canShare !== 'function'
  ) {
    return false;
  }

  try {
    return navigator.canShare({ files: [artifact.file] });
  } catch {
    return false;
  }
}

/**
 * Prepares and shares a resume without pretending that mailto links support
 * attachments. Native sharing is offered only when the browser confirms file
 * support. The universal fallback downloads the file first, then opens an
 * honest email draft that reminds the user to attach that exact filename.
 */
export default function EmailResumeDialog({ state, resumeName, onClose, onNotify }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const firstRadioRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const operationRef = useRef('');
  const prepareControllerRef = useRef(null);
  const preparedActionsRef = useRef(null);
  const mountedRef = useRef(true);
  const [format, setFormat] = useState('pdf');
  const [artifact, setArtifact] = useState(null);
  const [busy, setBusy] = useState('');
  const [downloaded, setDownloaded] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const dismiss = useCallback(() => {
    prepareControllerRef.current?.abort();
    onCloseRef.current?.();
  }, []);

  useDialogFocus(dialogRef, { onClose: dismiss, initialFocusRef: firstRadioRef });

  const canShareFile = supportsFileSharing(artifact);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      prepareControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!artifact) return undefined;
    const focusTimer = window.setTimeout(() => {
      preparedActionsRef.current?.querySelector('button:not([disabled])')?.focus();
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [artifact]);

  const resetPreparedFile = (nextFormat) => {
    if (operationRef.current) return;
    setFormat(nextFormat);
    setArtifact(null);
    setDownloaded(false);
    setStatus('');
    setError('');
  };

  const prepareFile = async () => {
    if (operationRef.current) return;
    operationRef.current = 'prepare';
    setBusy('prepare');
    setError('');
    setStatus(format === 'docx' ? DOCX_PREPARING_LABEL : `Preparing ${format.toUpperCase()}…`);
    const prepareController = typeof AbortController === 'function' ? new AbortController() : null;
    prepareControllerRef.current = prepareController;

    try {
      const prepared = await prepareResumeExport({
        format,
        state,
        resumeName,
        signal: prepareController?.signal,
      });
      if (!mountedRef.current) return;
      setArtifact(prepared);
      setDownloaded(false);
      setStatus(`${prepared.filename} is ready.`);
    } catch (prepareError) {
      if (!mountedRef.current) return;
      if (prepareError?.cause?.name === 'AbortError' || prepareError?.name === 'AbortError') return;
      if (format === 'docx') logDocxExportFailure(prepareError, { templateId: state.meta?.templateId, resumeId: state.meta?.id });
      const docxFeedback = format === 'docx' ? docxExportFailureFeedback(prepareError) : null;
      const message = format === 'docx'
        ? docxExportFailureText(prepareError)
        : prepareError?.message || `We could not prepare the ${format.toUpperCase()} file. Please try again.`;
      setArtifact(null);
      setStatus('');
      setError(message);
      notifySafely(onNotify, {
        type: 'error',
        title: docxFeedback?.title || 'Resume preparation failed',
        message: docxFeedback?.message || message,
      });
    } finally {
      if (prepareControllerRef.current === prepareController) prepareControllerRef.current = null;
      operationRef.current = '';
      if (mountedRef.current) setBusy('');
    }
  };

  const shareFile = async () => {
    if (operationRef.current || !artifact || !canShareFile) return;
    operationRef.current = 'share';
    setBusy('share');
    setError('');
    setStatus('Opening the share menu…');

    try {
      await navigator.share({
        files: [artifact.file],
        title: `Resume - ${resumeName?.trim() || 'Resume'}`,
        text: `Resume file: ${artifact.filename}`,
      });
      if (!mountedRef.current) return;
      setStatus(`${artifact.filename} was shared.`);
      notifySafely(onNotify, {
        type: 'success',
        title: 'Resume shared',
        message: `${artifact.filename} was shared successfully.`,
      });
    } catch (shareError) {
      if (!mountedRef.current) return;
      if (shareError?.name === 'AbortError') {
        setStatus('Sharing was cancelled. Your prepared file is still available below.');
      } else {
        const message = 'The browser could not share this file. Download it below and attach it in your email app.';
        setStatus('');
        setError(message);
        notifySafely(onNotify, {
          type: 'error',
          title: 'Sharing failed',
          message,
        });
      }
    } finally {
      operationRef.current = '';
      if (mountedRef.current) setBusy('');
    }
  };

  const downloadFile = () => {
    if (operationRef.current || !artifact) return;
    operationRef.current = 'download';
    setError('');

    try {
      downloadResumeExport(artifact);
      setDownloaded(true);
      setStatus(`Downloaded ${artifact.filename}. Open your email app below and attach this exact file before sending.`);
      notifySafely(onNotify, {
        type: 'success',
        title: 'Resume downloaded',
        message: `Attach ${artifact.filename} to your email before sending.`,
      });
    } catch (downloadError) {
      if (artifact.format === 'docx') logDocxExportFailure(downloadError, { templateId: state.meta?.templateId, resumeId: state.meta?.id, stage: 'download' });
      const docxFeedback = artifact.format === 'docx' ? docxExportFailureFeedback(downloadError) : null;
      const message = artifact.format === 'docx'
        ? docxExportFailureText(downloadError)
        : downloadError?.message || 'The resume could not be downloaded. Please try again.';
      setError(message);
      setStatus('');
      notifySafely(onNotify, {
        type: 'error',
        title: docxFeedback?.title || 'Download failed',
        message: docxFeedback?.message || message,
      });
    } finally {
      operationRef.current = '';
    }
  };

  const openEmailApp = () => {
    if (operationRef.current || !artifact || !downloaded) return;
    operationRef.current = 'email';
    setError('');

    try {
      emailResume(resumeName, artifact.filename);
      setStatus(`Email draft opened. Attach ${artifact.filename} before sending.`);
    } catch (emailError) {
      const message = emailError?.message || 'The email app could not be opened. Please create an email and attach the downloaded resume.';
      setError(message);
      setStatus('');
      notifySafely(onNotify, {
        type: 'error',
        title: 'Email app unavailable',
        message,
      });
    } finally {
      operationRef.current = '';
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="email-resume-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget) return;
        dismiss();
      }}
    >
      <section
        ref={dialogRef}
        className="email-resume-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={Boolean(busy)}
        tabIndex={-1}
      >
        <header className="email-resume-dialog__header">
          <div>
            <p className="email-resume-dialog__eyebrow">Share your resume</p>
            <h2 id={titleId}>Email resume</h2>
          </div>
          <button
            type="button"
            className="email-resume-dialog__close"
            onClick={dismiss}
            aria-label="Close email resume dialog"
            title="Close"
          >
            <ResumeIcon name="close" size={20} />
          </button>
        </header>

        <p id={descriptionId} className="email-resume-dialog__description">
          Choose a format and prepare the file. You can then share it directly where supported,
          or download it and attach it yourself.
        </p>

        <fieldset className="email-resume-dialog__formats" disabled={Boolean(busy)}>
          <legend>Resume format</legend>
          <div className="email-resume-dialog__format-grid">
            {FORMAT_OPTIONS.map((option, index) => (
              <label
                key={option.id}
                className={`email-resume-dialog__format ${format === option.id ? 'is-selected' : ''}`}
              >
                <input
                  ref={index === 0 ? firstRadioRef : undefined}
                  type="radio"
                  name="email-resume-format"
                  value={option.id}
                  checked={format === option.id}
                  onChange={() => resetPreparedFile(option.id)}
                />
                <span className="email-resume-dialog__format-icon" aria-hidden="true">
                  <ResumeIcon name={option.id === 'pdf' ? 'pdf' : 'docx'} size={22} />
                </span>
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {!artifact ? (
          <button
            type="button"
            className="email-resume-dialog__button email-resume-dialog__button--primary"
            onClick={prepareFile}
            disabled={Boolean(busy)}
          >
            <ResumeIcon name="download" size={18} />
            {busy === 'prepare' ? (format === 'docx' ? DOCX_PREPARING_LABEL : `Preparing ${format.toUpperCase()}…`) : 'Prepare resume'}
          </button>
        ) : (
          <div ref={preparedActionsRef} className="email-resume-dialog__prepared">
            <div className="email-resume-dialog__file" aria-label={`Prepared file ${artifact.filename}`}>
              <ResumeIcon name={artifact.format === 'pdf' ? 'pdf' : 'docx'} size={22} />
              <span>
                <strong>{artifact.filename}</strong>
                <small>{Math.max(1, Math.ceil(artifact.size / 1024))} KB</small>
              </span>
            </div>

            {canShareFile && (
              <div className="email-resume-dialog__share-option">
                <button
                  type="button"
                  className="email-resume-dialog__button email-resume-dialog__button--primary"
                  onClick={shareFile}
                  disabled={Boolean(busy)}
                >
                  <ResumeIcon name="upload" size={18} />
                  {busy === 'share' ? 'Opening share menu…' : 'Share resume'}
                </button>
                <p>Uses your device share menu and includes the prepared file.</p>
              </div>
            )}

            <div className="email-resume-dialog__fallback">
              <div className="email-resume-dialog__fallback-heading">
                <h3>{canShareFile ? 'Or use email manually' : 'Email the resume manually'}</h3>
                <p>Download first, then attach the exact file shown above in your email app.</p>
              </div>
              <div className="email-resume-dialog__fallback-actions">
                <button
                  type="button"
                  className="email-resume-dialog__button email-resume-dialog__button--secondary"
                  onClick={downloadFile}
                  disabled={Boolean(busy)}
                >
                  <ResumeIcon name="download" size={18} />
                  {downloaded ? 'Download again' : 'Download resume'}
                </button>
                <button
                  type="button"
                  className="email-resume-dialog__button email-resume-dialog__button--secondary"
                  onClick={openEmailApp}
                  disabled={Boolean(busy) || !downloaded}
                  aria-describedby={!downloaded ? `${descriptionId}-email-disabled` : undefined}
                >
                  <ResumeIcon name="email" size={18} />
                  Open email app
                </button>
              </div>
              {!downloaded && (
                <p id={`${descriptionId}-email-disabled`} className="email-resume-dialog__hint">
                  Download {artifact.filename} to enable the email button.
                </p>
              )}
            </div>
          </div>
        )}

        {status && (
          <p className="email-resume-dialog__message email-resume-dialog__message--status" role="status">
            {status}
          </p>
        )}
        {error && (
          <div className="email-resume-dialog__message email-resume-dialog__message--error" role="alert">
            <ResumeIcon name="info" size={18} />
            <span>{error}</span>
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}
