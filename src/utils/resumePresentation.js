import { getTemplateById, getTemplateTheme } from '../data/templates.js';
import { getResumeLayout, getSectionDisplayName } from './resumeSections.js';

const FONT_SIZE_PX = { small: 10, normal: 11, large: 12 };
const PAGE_BORDER_PX = { none: 0, thin: 1, medium: 2, thick: 4 };
const clamp = (value, min, max, fallback) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(min, Math.min(max, numeric)) : fallback;
};

/** Resolve a color token or an sRGB color mix without depending on app theme. */
export function resolvePresentationColor(presentation, value, fallback = '#333333') {
  if (!value) return fallback;
  if (typeof value === 'object') {
    const foreground = resolvePresentationColor(presentation, value.color, fallback);
    const background = resolvePresentationColor(presentation, value.background || '#FFFFFF', '#FFFFFF');
    const amount = clamp(value.amount, 0, 1, 1);
    const channel = (source, offset) => Number.parseInt(source.slice(offset, offset + 2), 16);
    return `#${[1, 3, 5].map(offset => Math.round(channel(foreground, offset) * amount + channel(background, offset) * (1 - amount)).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  }
  if (value.startsWith('$')) return presentation.colors[value.slice(1)] || fallback;
  if (/^#[\da-f]{6}$/i.test(value)) return value.toUpperCase();
  if (/^#[\da-f]{3}$/i.test(value)) return `#${value.slice(1).split('').map(char => char + char).join('').toUpperCase()}`;
  return fallback;
}

/**
 * Current, renderer-neutral presentation. Preview and DOCX use the same
 * template identity, theme selection, per-template layout and CSS-pixel units.
 */
export function getTemplatePresentation(state = {}, templateId = state.meta?.templateId, overrides = {}) {
  const template = getTemplateById(templateId);
  const design = state.design || {};
  const capabilities = template.presentation;
  const selectedTheme = getTemplateTheme(template, design.themePreset, {
    accent: overrides.accentColor || design.colorScheme,
    heading: design.headingColor, sidebar: design.sidebarColor, divider: design.dividerColor,
  });
  const layout = getResumeLayout(state, template.id);
  const bodyFontPx = FONT_SIZE_PX[design.fontStyle] || FONT_SIZE_PX.normal;
  const requestedFont = design.fontFamily || 'Inter, sans-serif';
  const fontFamily = capabilities.replaceDefaultInterFont && /^inter(?:\s*,|$)/i.test(requestedFont)
    ? capabilities.defaultFontFamily
    : requestedFont;
  const pageMarginPx = clamp(design.pageMargin ?? 32, 0, 144, 32);
  const spacing = {
    sectionPx: capabilities.density.sectionGapPx ?? Number.parseFloat(layout.tokens.sectionGap),
    entryPx: Number.parseFloat(layout.tokens.entryGap),
    headingPx: Number.parseFloat(layout.tokens.headingGap),
    paragraphPx: Number.parseFloat(layout.tokens.paragraphGap),
    listPx: Number.parseFloat(layout.tokens.listGap),
  };
  return {
    template, templateId: template.id, family: template.baseTemplate || template.id,
    signature: template.designSignature, capabilities, layout,
    colors: selectedTheme.colors, theme: selectedTheme,
    fontFamily, docxFontFamily: fontFamily.split(',')[0].trim().replace(/^['"]|['"]$/g, ''),
    bodyFontPx, lineHeight: 1.35 + clamp(design.lineSpacing ?? 50, 0, 100, 50) / 100 * 0.5,
    pageMarginPx, headingLetterSpacingPx: clamp(design.headingLetterSpacing ?? 0.5, -5, 20, 0.5),
    pageBorderPx: PAGE_BORDER_PX[design.pageBorder] || 0, spacing,
  };
}

/** Template labels are defaults only; renames and custom titles always win. */
export function getTemplateSectionTitle(state, sectionId, templateId = state.meta?.templateId) {
  const renamed = state.design?.sectionTitles?.[sectionId]?.trim();
  const custom = state.extraSections?.custom?.find(section => section.id === sectionId);
  return renamed || custom?.title || getTemplateById(templateId).presentation.heading.labels[sectionId]
    || getSectionDisplayName(state, sectionId);
}

const cssPixels = (value, fallback = 0) => `${Number.isFinite(Number(value)) ? Number(value) : fallback}px`;
const cssBorderStyle = (style) => style === 'single' ? 'solid' : style || 'solid';

function cssRule(presentation, definition) {
  return {
    width: cssPixels(definition?.widthPx),
    color: resolvePresentationColor(presentation, definition?.color, 'transparent'),
    style: cssBorderStyle(definition?.style),
  };
}

function cssPadding(definition = {}) {
  const raw = Array.isArray(definition.paddingPx)
    ? definition.paddingPx
    : definition.paddingPx !== undefined
      ? [definition.paddingPx, definition.paddingPx, definition.paddingPx, definition.paddingPx]
      : [definition.paddingTopPx, definition.paddingRightPx, definition.paddingBottomPx, definition.paddingLeftPx];
  return raw.map(value => cssPixels(value)).join(' ');
}

/**
 * CSS variables for a template section heading. Custom sections intentionally
 * use `customHeading`, which defaults to the complete native descriptor rather
 * than a generic accent-and-rule fallback.
 */
export function getPresentationHeadingCSSVariables(presentation, { custom = false } = {}) {
  const { capabilities, bodyFontPx, fontFamily, headingLetterSpacingPx, spacing } = presentation;
  const definition = custom
    ? capabilities.customHeading || capabilities.heading
    : capabilities.heading;
  const prefix = custom ? '--presentation-custom-heading' : '--presentation-heading';
  const fontPx = bodyFontPx * definition.fontScale;
  const sidebarFontPx = bodyFontPx * definition.sidebarFontScale;
  const letterSpacing = definition.letterSpacingPx ?? (definition.letterSpacingEm === undefined
    ? headingLetterSpacingPx
    : fontPx * definition.letterSpacingEm);
  const sidebarLetterSpacing = definition.letterSpacingPx ?? (definition.letterSpacingEm === undefined
    ? headingLetterSpacingPx
    : sidebarFontPx * definition.letterSpacingEm);
  const bottom = {
    width: cssPixels(definition.borderWidthPx),
    color: resolvePresentationColor(presentation, definition.borderColor, 'transparent'),
    style: cssBorderStyle(definition.borderStyle),
  };
  const top = cssRule(presentation, definition.top);
  const left = cssRule(presentation, definition.left);
  const outline = cssRule(presentation, definition.outline);
  const sectionTop = cssRule(presentation, definition.sectionTop);
  const sectionOutline = cssRule(presentation, definition.sectionOutline);
  const sectionPadding = definition.sectionPaddingPx ?? 0;

  return {
    [`${prefix}-display`]: definition.inline ? 'inline-flex' : 'block',
    [`${prefix}-color`]: resolvePresentationColor(presentation, definition.color),
    [`${prefix}-sidebar-color`]: resolvePresentationColor(presentation, definition.sidebarColor || definition.color),
    [`${prefix}-background`]: resolvePresentationColor(presentation, definition.fill, 'transparent'),
    [`${prefix}-font-family`]: definition.fontFamily || fontFamily,
    [`${prefix}-font-size`]: cssPixels(fontPx),
    [`${prefix}-sidebar-font-size`]: cssPixels(sidebarFontPx),
    [`${prefix}-font-weight`]: definition.weight,
    [`${prefix}-line-height`]: definition.lineHeight,
    [`${prefix}-letter-spacing`]: cssPixels(letterSpacing),
    [`${prefix}-sidebar-letter-spacing`]: cssPixels(sidebarLetterSpacing),
    [`${prefix}-text-transform`]: definition.transform,
    [`${prefix}-text-align`]: definition.alignment || 'left',
    [`${prefix}-justify-content`]: definition.alignment === 'center' ? 'center' : 'flex-start',
    [`${prefix}-gap`]: cssPixels(definition.gapPx ?? spacing.headingPx),
    [`${prefix}-padding`]: cssPadding(definition),
    [`${prefix}-border-bottom-width`]: bottom.width,
    [`${prefix}-border-bottom-color`]: bottom.color,
    [`${prefix}-border-bottom-style`]: bottom.style,
    [`${prefix}-sidebar-border-bottom-color`]: resolvePresentationColor(presentation, definition.sidebarBorderColor || definition.borderColor, 'transparent'),
    [`${prefix}-border-top-width`]: top.width,
    [`${prefix}-border-top-color`]: top.color,
    [`${prefix}-border-top-style`]: top.style,
    [`${prefix}-border-left-width`]: left.width,
    [`${prefix}-border-left-color`]: left.color,
    [`${prefix}-border-left-style`]: left.style,
    [`${prefix}-border-radius`]: cssPixels(definition.borderRadiusPx),
    [`${prefix}-outline-width`]: outline.width,
    [`${prefix}-outline-color`]: outline.color,
    [`${prefix}-outline-style`]: outline.style,
    [`${prefix}-section-top-width`]: sectionTop.width,
    [`${prefix}-section-top-color`]: sectionTop.color,
    [`${prefix}-section-top-style`]: sectionTop.style,
    [`${prefix}-section-outline-width`]: sectionOutline.width,
    [`${prefix}-section-outline-color`]: sectionOutline.color,
    [`${prefix}-section-outline-style`]: sectionOutline.style,
    [`${prefix}-section-padding-top`]: cssPixels(definition.sectionPaddingTopPx ?? sectionPadding),
    [`${prefix}-section-padding-right`]: cssPixels(sectionPadding),
    [`${prefix}-section-padding-bottom`]: cssPixels(sectionPadding),
    [`${prefix}-section-padding-left`]: cssPixels(sectionPadding),
  };
}

/** CSS adapter for the same primitive geometry consumed by the Word renderer. */
export function getPresentationCSSVariables(presentation) {
  const { capabilities: { header, heading, columns, page }, bodyFontPx, pageMarginPx } = presentation;
  const color = value => resolvePresentationColor(presentation, value);
  const sidebarFraction = columns.sidebarFraction;
  const leftFraction = columns.sidebarPosition === 'right' ? 1 - sidebarFraction : sidebarFraction;
  const rightFraction = 1 - leftFraction;
  const inset = page.horizontalInsetPx ?? pageMarginPx * page.horizontalInsetMultiplier;
  const headInset = header.horizontalInsetPx ?? pageMarginPx * header.horizontalInsetMultiplier;
  const nameSpacing = header.nameLetterSpacingPx ?? header.nameLetterSpacingEm * bodyFontPx * header.nameScale;
  return {
    '--presentation-body-color': color(presentation.capabilities.bodyColor),
    '--presentation-header-top': `${header.paddingTopPx ?? pageMarginPx * (header.paddingTopMultiplier || 1)}px`,
    '--presentation-header-bottom': `${header.paddingBottomPx ?? pageMarginPx}px`,
    '--presentation-header-inset': `${headInset}px`,
    '--presentation-name-size': `${bodyFontPx * header.nameScale}px`,
    '--presentation-name-weight': header.nameWeight,
    '--presentation-name-spacing': `${nameSpacing}px`,
    '--presentation-name-line-height': header.nameLineHeight,
    '--presentation-monogram-size': `${header.monogramSizePx}px`,
    '--presentation-heading-size': `${bodyFontPx * heading.fontScale}px`,
    '--presentation-sidebar-heading-size': `${bodyFontPx * heading.sidebarFontScale}px`,
    '--presentation-column-left': `${leftFraction}fr`,
    '--presentation-column-right': `${rightFraction}fr`,
    '--presentation-column-left-width': `${leftFraction * 100}%`,
    '--presentation-column-right-width': `${rightFraction * 100}%`,
    '--presentation-column-gap': `${columns.gapPx}px`,
    '--presentation-body-inset': `${inset}px`,
    '--presentation-body-top': `${page.bodyTopPx ?? pageMarginPx}px`,
    '--presentation-body-bottom': `${page.bodyBottomPx ?? pageMarginPx}px`,
    '--presentation-body-left-inset': `${inset * page.bodyLeftMultiplier}px`,
  };
}
