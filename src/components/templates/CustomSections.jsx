import { sanitizeHTML } from '../../utils/sanitize';
import { getPresentationHeadingCSSVariables, getTemplatePresentation } from '../../utils/resumePresentation';

export default function CustomSections({ state, spacing, sectionIds }) {
  const sections = Array.isArray(state.extraSections?.custom)
    ? state.extraSections.custom.filter(section => section.content)
    : [];
  const requestedIds = Array.isArray(sectionIds) ? new Set(sectionIds) : null;
  const visibleSections = requestedIds
    ? sections.filter(section => requestedIds.has(section.id))
    : sections;
  // Resolve from the same saved design state used by every other presentation
  // consumer. Some callers pass a local sidebar foreground color as
  // `themeColor`; treating that as an accent override would make a custom
  // heading diverge from the selected template.
  const presentation = getTemplatePresentation(state);
  const headingVariables = getPresentationHeadingCSSVariables(presentation, { custom: true });
  const templateClassName = `tmpl-custom-section-${presentation.templateId}`;

  if (!visibleSections.length) return null;

  return visibleSections.map(section => (
    <section className={`tmpl-section tmpl-custom-section ${templateClassName}${section._pdfContinuation ? ' pdf-section-continuation' : ''}`} data-resume-section-id={section.id} style={{ ...headingVariables, marginBottom: spacing }} key={section.id}>
      {!section._pdfContinuation && (
        <h2 className="tmpl-heading tmpl-custom-heading">{section.title}</h2>
      )}
      <div className="tmpl-content" dangerouslySetInnerHTML={{ __html: sanitizeHTML(section.content) }} />
    </section>
  ));
}
