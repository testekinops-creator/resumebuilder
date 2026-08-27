import { useLayoutEffect, useRef, useState } from 'react';
import { useResume } from '../context/ResumeContext';
import ClassicTemplate from './templates/ClassicTemplate';
import ModernTemplate from './templates/ModernTemplate';
import ProfessionalTemplate from './templates/ProfessionalTemplate';
import CreativeTemplate from './templates/CreativeTemplate';
import MinimalTemplate from './templates/MinimalTemplate';
import ExecutiveTemplate from './templates/ExecutiveTemplate';
import AccountantTemplate from './templates/AccountantTemplate';
import DeveloperTemplate from './templates/DeveloperTemplate';
import BlueprintTemplate from './templates/BlueprintTemplate';
import { AtsSerifTemplate, EditorialTemplate, TimelineTemplate } from './templates/ReferenceTemplates';
import { getTemplateById, getTemplateTheme } from '../data/templates';
import { applyPreviewSectionTitles, getPreviewSectionId, getResumeLayout, getSectionDisplayName } from '../utils/resumeSections';
import './ResumePreview.css';

const TEMPLATE_MAP = {
  classic: ClassicTemplate,
  modern: ModernTemplate,
  professional: ProfessionalTemplate,
  creative: CreativeTemplate,
  minimal: MinimalTemplate,
  executive: ExecutiveTemplate,
  accountant: AccountantTemplate,
  developer: DeveloperTemplate,
  timeline: TimelineTemplate,
  editorial: EditorialTemplate,
  'ats-serif': AtsSerifTemplate,
  blueprint: BlueprintTemplate,
};

// Templates lay out at the native CSS A4 size so the print stylesheet can use
// the exact same DOM and computed styles. The editor then scales that A4 canvas
// down to the legacy 595px preview footprint (72 / 96).
const PRINT_LAYOUT_SCALE = 0.75;
const A4_PAGE_HEIGHT_PX = 1123;

export default function ResumePreview({
  data,
  templateId: templateIdOverride,
  accentColor,
  highlightSection: _highlightSection = '',
  scale = 0.38,
  className = '',
  interactive = false,
  selectedSection = '',
  hoveredSection = '',
  focusSection = '',
  focusRequest = 0,
  onSectionSelect,
  onSectionHover,
  onPageCountChange,
  viewerScale,
}) {
  const { state: contextState } = useResume();
  const state = data || contextState;
  const previewPageRef = useRef(null);
  const lastFocusRequestRef = useRef(0);
  const [pageHeight, setPageHeight] = useState(A4_PAGE_HEIGHT_PX);
  const { design = {} } = state;
  const templateId = templateIdOverride || state.meta?.templateId || 'classic';
  const template = getTemplateById(templateId);
  const selectedTheme = getTemplateTheme(template, design.themePreset, {
    accent: accentColor || design.colorScheme,
    heading: design.headingColor,
    sidebar: design.sidebarColor,
    divider: design.dividerColor,
  });
  const themeColor = selectedTheme.colors.accent;
  
  const fontSizeMap = { small: '10px', normal: '11px', large: '12px' };
  const fontSize = fontSizeMap[design.fontStyle] || '11px';
  const fontFamily = design.fontFamily || 'Inter, sans-serif';
  const pageMargin = `${design.pageMargin ?? 32}px`;
  const headingLetterSpacing = `${design.headingLetterSpacing ?? 0.5}px`;

  const TemplateComponent = TEMPLATE_MAP[template?.baseTemplate || templateId] || ClassicTemplate;
  const templateState = templateId === state.meta?.templateId
    ? state
    : { ...state, meta: { ...state.meta, templateId } };
  const layout = getResumeLayout(templateState, templateId);
  const spacing = layout.tokens.sectionGap;
  const lineHeight = 1.35 + ((design.lineSpacing ?? 50) / 100) * 0.5;
  const paragraphSpacing = `${4 + ((design.paragraphSpacing ?? 50) / 100) * 12}px`;
  const borderWidths = { none: '0px', thin: '1px', medium: '2px', thick: '4px' };
  const pageBorder = borderWidths[design.pageBorder] ?? borderWidths.none;
  const displayScale = viewerScale ?? scale * PRINT_LAYOUT_SCALE;

  // CSS transforms used for scaled previews do not affect normal document flow.
  // Measure the actual resume so the surrounding preview panel can grow/scroll
  // instead of letting controls overlap a long resume.
  useLayoutEffect(() => {
    const page = previewPageRef.current;
    if (!page) return undefined;

    const measure = () => {
      const nextHeight = Math.max(A4_PAGE_HEIGHT_PX, Math.ceil(page.scrollHeight), Math.ceil(page.offsetHeight));
      setPageHeight(current => Math.abs(current - nextHeight) > 1 ? nextHeight : current);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(page);
    return () => observer.disconnect();
  }, [state, templateId, displayScale]);

  useLayoutEffect(() => {
    if (!onPageCountChange) return undefined;
    onPageCountChange(Math.max(1, Math.ceil(pageHeight / A4_PAGE_HEIGHT_PX)));
    return undefined;
  }, [onPageCountChange, pageHeight]);

  useLayoutEffect(() => {
    const page = previewPageRef.current;
    if (!page) return undefined;

    applyPreviewSectionTitles(page, state);
    const sections = [...page.querySelectorAll('.tmpl-section')];
    sections.forEach((sectionElement) => {
      const sectionId = getPreviewSectionId(sectionElement, state);
      const isSelectable = Boolean(interactive && sectionId);
      const isSelected = sectionId === selectedSection;
      const isHovered = sectionId === hoveredSection;

      sectionElement.classList.toggle('resume-section-selected', isSelected);
      sectionElement.classList.toggle('resume-section-hovered', isHovered);
      sectionElement.tabIndex = isSelectable ? 0 : -1;
      if (isSelectable) {
        sectionElement.setAttribute('role', 'button');
        sectionElement.setAttribute('aria-label', `Manage ${getSectionDisplayName(state, sectionId)}`);
      } else {
        sectionElement.removeAttribute('role');
        sectionElement.removeAttribute('aria-label');
      }
    });

    if (!interactive || !focusRequest || lastFocusRequestRef.current === focusRequest) return undefined;

    const focusTarget = focusSection
      ? sections.find(sectionElement => getPreviewSectionId(sectionElement, state) === focusSection)
      : null;
    if (!focusTarget) return undefined;

    lastFocusRequestRef.current = focusRequest;
    focusTarget.classList.add('resume-section-recently-updated');
    focusTarget.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    const clearHighlight = window.setTimeout(() => {
      focusTarget.classList.remove('resume-section-recently-updated');
    }, 1800);
    return () => window.clearTimeout(clearHighlight);
  }, [state, templateId, interactive, selectedSection, hoveredSection, focusSection, focusRequest]);

  const getSectionIdFromEvent = (event) => {
    const sectionElement = event.target?.closest?.('.tmpl-section');
    if (!sectionElement || !previewPageRef.current?.contains(sectionElement)) return '';
    return getPreviewSectionId(sectionElement, state) || '';
  };

  const selectPreviewSection = (event) => {
    if (!interactive) return;
    const sectionId = getSectionIdFromEvent(event);
    if (sectionId) onSectionSelect?.(sectionId);
  };

  const hoverPreviewSection = (event) => {
    if (!interactive) return;
    const sectionId = getSectionIdFromEvent(event);
    if (sectionId) onSectionHover?.(sectionId);
  };

  const clearPreviewSectionHover = (event) => {
    if (!interactive) return;
    const sectionElement = event.target?.closest?.('.tmpl-section');
    const nextSection = event.relatedTarget?.closest?.('.tmpl-section');
    if (sectionElement && sectionElement === nextSection) return;
    onSectionHover?.('');
  };

  const handleSectionKeyDown = (event) => {
    if (!interactive || !['Enter', ' '].includes(event.key)) return;
    const sectionId = getSectionIdFromEvent(event);
    if (sectionId) {
      event.preventDefault();
      onSectionSelect?.(sectionId);
    }
  };

  return (
    <div className={`preview-container ${className}`.trim()} style={{
      '--preview-scale': displayScale,
      '--preview-page-height': `${pageHeight}px`,
      '--resume-page-width': '210mm',
      '--resume-page-min-height': '297mm',
      '--resume-line-height': lineHeight,
      '--resume-paragraph-spacing': paragraphSpacing,
      '--resume-page-padding': pageMargin,
      '--resume-heading-letter-spacing': headingLetterSpacing,
      '--resume-page-border-width': pageBorder,
      '--resume-page-border-color': themeColor,
      '--resume-section-gap': layout.tokens.sectionGap,
      '--resume-entry-gap': layout.tokens.entryGap,
      '--resume-heading-gap': layout.tokens.headingGap,
      '--resume-paragraph-gap': layout.tokens.paragraphGap,
      '--resume-list-gap': layout.tokens.listGap,
      '--theme-color': themeColor,
      '--theme-heading': selectedTheme.colors.heading,
      '--theme-sidebar': selectedTheme.colors.sidebar,
      '--theme-divider': selectedTheme.colors.divider,
    }}>
      <div
        className="preview-page"
        ref={previewPageRef}
        onClick={selectPreviewSection}
        onKeyDown={handleSectionKeyDown}
        onMouseOver={hoverPreviewSection}
        onMouseOut={clearPreviewSectionHover}
      >
        <TemplateComponent
          state={templateState}
          layout={layout}
          themeColor={themeColor}
          fontSize={fontSize}
          fontFamily={fontFamily}
          spacing={spacing} 
        />
      </div>
    </div>
  );
}
