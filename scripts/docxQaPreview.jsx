import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import ResumePreview from '../src/components/ResumePreview.jsx';
import { TEMPLATES } from '../src/data/templates.js';
import { createDocxFixture } from './fixtures/docxResumeFixtures.mjs';
import '../src/index.css';
import './docxQaPreview.css';

/** A development-only fixture viewer. Never mounts the autosaving provider. */
export function FixtureViewer() {
  const query = new URLSearchParams(window.location.search);
  const [templateId, setTemplateId] = useState(query.get('template') || 'metro');
  const [size, setSize] = useState(query.get('size') || 'small');
  const [scale, setScale] = useState(Number(query.get('scale')) || 0.85);
  const state = createDocxFixture(templateId, size);
  return (
    <main className="docx-fixture-viewer">
      <header className="docx-fixture-toolbar">
        <label>Template <select aria-label="Template" value={templateId} onChange={event => setTemplateId(event.target.value)}>
          {TEMPLATES.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
        </select></label>
        <label>Fixture <select aria-label="Fixture" value={size} onChange={event => setSize(event.target.value)}>
          {['small', 'medium', 'large', 'customized', 'longText'].map(value => <option key={value}>{value}</option>)}
        </select></label>
        <label>Scale <input aria-label="Scale" type="number" step="0.1" min="0.2" max="1.5" value={scale} onChange={event => setScale(Number(event.target.value) || 1)} /></label>
        <a href={`/tmp/docx-fidelity/current/${size}/${templateId}.docx`}>Open generated DOCX</a>
        <span>Read-only fixture · no saved-resume changes</span>
      </header>
      <ResumePreview data={state} viewerScale={scale} />
    </main>
  );
}

createRoot(document.getElementById('root')).render(<FixtureViewer />);
