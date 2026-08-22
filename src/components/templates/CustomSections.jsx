import { sanitizeHTML } from '../../utils/sanitize';

export default function CustomSections({ state, themeColor, spacing, sectionIds }) {
  const sections = Array.isArray(state.extraSections?.custom)
    ? state.extraSections.custom.filter(section => section.content)
    : [];
  const requestedIds = Array.isArray(sectionIds) ? new Set(sectionIds) : null;
  const visibleSections = requestedIds
    ? sections.filter(section => requestedIds.has(section.id))
    : sections;

  if (!visibleSections.length) return null;

  return visibleSections.map(section => (
    <section className={`tmpl-section${section._pdfContinuation ? ' pdf-section-continuation' : ''}`} data-resume-section-id={section.id} style={{ marginBottom: spacing }} key={section.id}>
      {!section._pdfContinuation && (
        <h2 className="tmpl-heading" style={{ color: themeColor, borderBottom: `2px solid ${themeColor}` }}>{section.title}</h2>
      )}
      <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(section.content) }} />
    </section>
  ));
}
