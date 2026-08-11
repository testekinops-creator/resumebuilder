import { useState } from 'react';
import { useResume } from '../../context/ResumeContext';
import { TEMPLATES } from '../../data/templates';
import ResumePreview from '../../components/ResumePreview';
import Navbar from '../../components/Navbar';
import './CompareTemplates.css';

export default function CompareTemplates() {
  const { state } = useResume();
  const [leftTemplate, setLeftTemplate] = useState('classic');
  const [rightTemplate, setRightTemplate] = useState('modern');

  const hasResumeData = state.contact.firstName || state.workHistory.length > 0;

  return (
    <div className="compare-page">
      <Navbar />

      <div className="compare-hero">
        <h1>Compare Templates</h1>
        <p>See your resume side-by-side in different templates to find the perfect fit.</p>
      </div>

      <div className="compare-container">
        {/* Template Selectors */}
        <div className="compare-selectors">
          <div className="compare-selector">
            <label>Template A</label>
            <div className="compare-template-pills">
              {TEMPLATES.map(t => (
                <button key={t.id}
                  className={`compare-pill ${leftTemplate === t.id ? 'active' : ''}`}
                  onClick={() => setLeftTemplate(t.id)}
                  style={{ '--pill-color': t.defaultColor }}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="compare-vs">VS</div>

          <div className="compare-selector">
            <label>Template B</label>
            <div className="compare-template-pills">
              {TEMPLATES.map(t => (
                <button key={t.id}
                  className={`compare-pill ${rightTemplate === t.id ? 'active' : ''}`}
                  onClick={() => setRightTemplate(t.id)}
                  style={{ '--pill-color': t.defaultColor }}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview Comparison */}
        {!hasResumeData ? (
          <div className="compare-empty">
            <div className="compare-empty-icon">📝</div>
            <h3>No resume data yet</h3>
            <p>Start building your resume first, then come back to compare templates side by side.</p>
            <a href="/get-started" className="btn btn-primary">Create My Resume</a>
          </div>
        ) : (
          <div className="compare-previews">
            <div className="compare-preview-panel">
              <div className="compare-preview-header">
                <span className="compare-preview-badge" style={{ background: TEMPLATES.find(t => t.id === leftTemplate)?.defaultColor }}>
                  {TEMPLATES.find(t => t.id === leftTemplate)?.name}
                </span>
                <span className="compare-preview-layout">
                  {TEMPLATES.find(t => t.id === leftTemplate)?.layout}
                </span>
              </div>
              <div className="compare-preview-frame">
                <ResumePreview
                  data={state}
                  templateId={leftTemplate}
                  accentColor={TEMPLATES.find(t => t.id === leftTemplate)?.defaultColor}
                />
              </div>
            </div>

            <div className="compare-divider" />

            <div className="compare-preview-panel">
              <div className="compare-preview-header">
                <span className="compare-preview-badge" style={{ background: TEMPLATES.find(t => t.id === rightTemplate)?.defaultColor }}>
                  {TEMPLATES.find(t => t.id === rightTemplate)?.name}
                </span>
                <span className="compare-preview-layout">
                  {TEMPLATES.find(t => t.id === rightTemplate)?.layout}
                </span>
              </div>
              <div className="compare-preview-frame">
                <ResumePreview
                  data={state}
                  templateId={rightTemplate}
                  accentColor={TEMPLATES.find(t => t.id === rightTemplate)?.defaultColor}
                />
              </div>
            </div>
          </div>
        )}

        {/* Template Info Comparison */}
        {hasResumeData && (
          <div className="compare-info-table">
            <h3>Template Comparison</h3>
            <table>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>{TEMPLATES.find(t => t.id === leftTemplate)?.name}</th>
                  <th>{TEMPLATES.find(t => t.id === rightTemplate)?.name}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Layout</td>
                  <td>{TEMPLATES.find(t => t.id === leftTemplate)?.layout}</td>
                  <td>{TEMPLATES.find(t => t.id === rightTemplate)?.layout}</td>
                </tr>
                <tr>
                  <td>Best For</td>
                  <td>{TEMPLATES.find(t => t.id === leftTemplate)?.recommendedFor.join(', ')} years exp</td>
                  <td>{TEMPLATES.find(t => t.id === rightTemplate)?.recommendedFor.join(', ')} years exp</td>
                </tr>
                <tr>
                  <td>Headshot</td>
                  <td>{TEMPLATES.find(t => t.id === leftTemplate)?.hasHeadshot ? '✅ Yes' : '❌ No'}</td>
                  <td>{TEMPLATES.find(t => t.id === rightTemplate)?.hasHeadshot ? '✅ Yes' : '❌ No'}</td>
                </tr>
                <tr>
                  <td>Style</td>
                  <td>{TEMPLATES.find(t => t.id === leftTemplate)?.description}</td>
                  <td>{TEMPLATES.find(t => t.id === rightTemplate)?.description}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
