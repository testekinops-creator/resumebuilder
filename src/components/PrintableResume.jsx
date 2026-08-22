import { createPortal } from 'react-dom';
import ResumeDocument from './ResumeDocument';

export default function PrintableResume({ state }) {
  if (!state || typeof document === 'undefined') return null;

  return createPortal(
    <div id="resume-print-root" aria-hidden="true">
      <ResumeDocument state={state} className="resume-print-document" />
    </div>,
    document.body,
  );
}
