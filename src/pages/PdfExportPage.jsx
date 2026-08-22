import { useEffect, useMemo, useState } from 'react';
import ResumeDocument from '../components/ResumeDocument';
import './PdfExportPage.css';

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

  return <ResumeDocument state={state} className="pdf-export-document" ready={ready} />;
}
