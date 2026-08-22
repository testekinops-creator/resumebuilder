import { useEffect, useMemo, useState } from 'react';
import ResumePreview from '../components/ResumePreview';
import { TEMPLATES } from '../data/templates';
import { getResumeLayout } from '../utils/resumeSections';
import './PdfExportPage.css';

const BORDER_WIDTHS = { none: '0px', thin: '1px', medium: '2px', thick: '4px' };

function readExportPayload() {
  const payload = window.__RESUME_EXPORT_STATE__;
  return payload && typeof payload === 'object' && payload.state ? payload : null;
}

/**
 * The PDF route deliberately renders one unmodified ResumePreview.
 *
 * Earlier versions built a second, Creative-only page splitter that copied a
 * subset of state into page fragments. That caused reordered/custom/sidebar
 * sections to diverge from the editor and sometimes reserved a blank page.
 * Browser pagination now operates on the same normalized layout and DOM as
 * the editor for every template.
 */
export default function PdfExportPage() {
  const payload = useMemo(readExportPayload, []);
  const [ready, setReady] = useState(false);
  const state = payload?.state;
  const template = TEMPLATES.find(item => item.id === state?.meta?.templateId);
  const accentColor = state?.design?.colorScheme || template?.defaultColor || '#6B21A8';
  const layout = useMemo(() => (state ? getResumeLayout(state) : null), [state]);
  const pageBorder = BORDER_WIDTHS[state?.design?.pageBorder] ?? BORDER_WIDTHS.none;

  useEffect(() => {
    if (!state) return undefined;
    let active = true;
    const markReady = () => {
      if (active) setReady(true);
    };

    if (document.fonts?.ready) {
      document.fonts.ready.then(markReady, markReady);
    } else {
      markReady();
    }

    return () => { active = false; };
  }, [state]);

  if (!state) {
    return <main className="pdf-export-error" data-pdf-error="true">Missing resume export data.</main>;
  }

  return (
    <main
      className="pdf-export-document"
      data-layout-family={layout?.family || 'classic'}
      data-pdf-ready={ready ? 'true' : 'false'}
      style={{
        '--print-page-border-width': pageBorder,
        '--print-page-border-color': accentColor,
      }}
    >
      <ResumePreview data={state} scale={1} className="pdf-export-preview" />
    </main>
  );
}
