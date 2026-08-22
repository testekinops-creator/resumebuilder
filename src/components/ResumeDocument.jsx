import ResumePreview from './ResumePreview';
import { TEMPLATES } from '../data/templates';
import { getResumeLayout } from '../utils/resumeSections';
import './ResumeDocument.css';

const BORDER_WIDTHS = { none: '0px', thin: '1px', medium: '2px', thick: '4px' };

/**
 * Canonical export document shared by Chromium PDF rendering and browser
 * printing. It deliberately renders the same ResumePreview tree as Finalize.
 */
export default function ResumeDocument({ state, className = '', ready = true }) {
  const template = TEMPLATES.find(item => item.id === state?.meta?.templateId);
  const accentColor = state?.design?.colorScheme || template?.defaultColor || '#6B21A8';
  const layout = state ? getResumeLayout(state) : null;
  const pageBorder = BORDER_WIDTHS[state?.design?.pageBorder] ?? BORDER_WIDTHS.none;

  if (!state) return null;

  return (
    <main
      className={`resume-document ${className}`.trim()}
      data-layout-family={layout?.family || 'classic'}
      data-pdf-ready={ready ? 'true' : 'false'}
      style={{
        '--print-page-border-width': pageBorder,
        '--print-page-border-color': accentColor,
      }}
    >
      <ResumePreview data={state} scale={1} className="resume-document-preview" />
    </main>
  );
}
