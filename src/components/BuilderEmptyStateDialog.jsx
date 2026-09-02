import { useId, useRef } from 'react';
import ResumeIcon from './ResumeIcon';
import { useDialogFocus } from '../hooks/useDialogFocus';

/**
 * Shared confirmation shown when a builder step is intentionally skipped.
 * Keeping it in one component ensures every step gets the same focus trap,
 * Escape handling, body scroll lock, and mobile-safe dialog bounds.
 */
export default function BuilderEmptyStateDialog({
  title,
  description,
  continueLabel,
  onContinue,
  onSkip,
  skipLabel = 'No thanks',
}) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useDialogFocus(dialogRef, {
    onClose: onContinue,
    initialFocusRef: closeRef,
  });

  return (
    <div
      className="mobile-preview-overlay builder-empty-dialog-backdrop"
      role="presentation"
      onMouseDown={onContinue}
    >
      <section
        ref={dialogRef}
        className="mobile-preview-content builder-empty-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onMouseDown={event => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="builder-empty-dialog-close"
          onClick={onContinue}
          aria-label="Close message"
          title="Close message"
        >
          <ResumeIcon name="close" size={22} />
        </button>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
        <div className="builder-empty-dialog-actions">
          <button type="button" className="btn btn-primary" onClick={onContinue}>
            {continueLabel}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onSkip}>
            {skipLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
