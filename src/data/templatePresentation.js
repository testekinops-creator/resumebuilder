/**
 * Renderer-neutral template capabilities. Values are CSS pixels (not points).
 * The catalogue selects these same semantic variants for HTML and editable
 * Word output; an export must never substitute a different template family.
 */
const mix = (color, amount, background = '#FFFFFF') => ({ color, amount, background });
const rule = (widthPx, color = '$divider', style = 'single') => ({ widthPx, color, style });

const STANDARD_LABELS = {
  summary: 'Professional Summary', workHistory: 'Work History', education: 'Education',
  skills: 'Skills', websites: 'Websites & Profiles', personalDetails: 'Personal Details',
  certifications: 'Certifications', languages: 'Languages',
};
const BLUEPRINT_LABELS = {
  summary: 'Profile', workHistory: 'Experience', education: 'Education', skills: 'Capabilities',
  websites: 'Links', personalDetails: 'Details', certifications: 'Credentials', languages: 'Languages',
};
const REFERENCE_LABELS = { ...STANDARD_LABELS, summary: 'Profile', workHistory: 'Professional Experience' };

const DEFAULT_HEADER = {
  variant: 'left', fullBleed: false, identityInSidebar: false,
  contactLayout: 'stacked-right', contactOrder: ['email', 'phone', 'location', 'links'],
  contactLabel: '', contactFontScale: 1, contactLineHeight: 1.35,
  contactGapPx: 5, contactMarginTopPx: 0, contactColor: '#4B5563',
  showHeadline: true, headlineFallback: 'Professional', headlineFromEducation: false,
  headlineScale: 1.05, headlineWeight: 400, headlineColor: '#64748B',
  headlineTransform: 'uppercase', headlineLetterSpacingEm: 0.08, headlineMarginTopPx: 8,
  nameScale: 2.45, nameWeight: 800, nameColor: '$heading', nameTransform: 'none',
  nameLineHeight: 1.02, nameLetterSpacingEm: 0.035,
  paddingTopPx: 38, paddingBottomPx: 22, horizontalInsetPx: null,
  horizontalInsetMultiplier: 1, paddingHorizontalPx: 0, outerTopPx: 0,
  fill: null, top: null, bottom: null, left: null, outline: null,
  monogram: null, monogramSizePx: 46, monogramMarginRightPx: 18, columnGapPx: 24,
};
const DEFAULT_HEADING = {
  variant: 'underline', labels: STANDARD_LABELS, fontScale: 1.4, sidebarFontScale: 1.4,
  weight: 600, transform: 'uppercase', color: '$accent', borderColor: '$accent',
  borderWidthPx: 2, paddingBottomPx: 4, lineHeight: 1.25,
};
const DEFAULT_ENTRY = {
  variant: 'standard', titleScale: 1.1, titleWeight: 700, titleColor: null,
  dateScale: 1.1, dateColor: null, dateStyle: 'right', dateWeight: 400,
  subtitleScale: 1, subtitleColor: '#555555', subtitleItalic: true,
  subtitleSeparator: ', ', subtitleAfterPx: 8,
  metadataOrder: 'subtitle-date',
  educationTitle: 'degree', educationIncludesLocation: false, includeCoursework: false,
};
const DEFAULT_PAGE = {
  widthPx: 210 * 96 / 25.4, heightPx: 297 * 96 / 25.4,
  borderWidthPx: 0, borderColor: '$accent', borderInsetPx: 0, borderRadiusPx: 0,
  frameConsumesSpace: false,
  horizontalInsetPx: null, horizontalInsetMultiplier: 1, bodyLeftMultiplier: 1,
  bodyTopPx: null, bodyBottomPx: null,
};
const DEFAULT_COLUMNS = {
  count: 1, sidebarPosition: 'left', sidebarFraction: 0.35, gapPx: 0,
  sidebarStyle: 'plain', sidebarFill: null, sidebarColor: null,
  sidebarPaddingPx: null, mainPaddingPx: null, divider: null,
  summaryAboveColumns: false, contactInSidebar: false, contactColumn: null,
  semanticSidebarIsWide: false, sidebarFontScale: 1,
};
const DEFAULT_CONTENT = {
  languages: { variant: 'grid', minColumnWidthPx: 150, gapPx: 8, indentPx: 0 },
  websites: { variant: 'list', sidebarVariant: 'list', indentPx: 20, gapPx: 0 },
  personalDetails: {
    variant: 'inline-grid', minColumnWidthPx: 150, gapPx: 8, labelScale: 1,
    labels: { dob: 'DOB', nationality: 'Nationality', maritalStatus: 'Status', gender: 'Gender' },
  },
};

const HEADER_VARIANTS = {
  'left-rule': { left: rule(8, '$accent'), paddingLeftPx: 22 },
  split: { contactFraction: 0.325, bottom: rule(1) },
  compact: { paddingTopPx: 25, paddingBottomPx: 14, bottom: rule(3, '$divider', 'double'), nameScale: 2.05 },
  band: { fullBleed: true, paddingTopPx: 30, paddingBottomPx: 30, fill: '$accent', nameColor: '#FFFFFF', headlineColor: '#FFFFFF', contactColor: '#FFFFFF' },
  grid: { top: rule(10, '$accent'), bottom: rule(1, '#D8DEE8'), monogram: 'center-outline', align: 'center' },
  oversized: { bottom: rule(6), nameScale: 3.4, nameLineHeight: 0.88, nameLetterSpacingEm: -0.025, nameTransform: 'uppercase', align: 'bottom' },
  left: { top: rule(5, '$accent'), bottom: rule(1, '#D4DBE5') },
  'title-band': { outerTopPx: 22, paddingTopPx: 22, paddingBottomPx: 22, paddingHorizontalPx: 24, left: rule(18, '$accent'), fill: mix('$accent', 0.07) },
  rule: { outerTopPx: 24, paddingTopPx: 20, paddingBottomPx: 20, top: rule(2), bottom: rule(2) },
  'centered-serif': { contactLayout: 'inline-center', contactMarginTopPx: 15, nameFontFamily: "Georgia, 'Times New Roman', serif", nameScale: 2.7, nameWeight: 400, bottom: rule(1), align: 'center' },
  'dark-split': { fullBleed: true, paddingTopPx: 32, paddingBottomPx: 32, fill: '#172033', nameColor: '#FFFFFF', headlineColor: '#FFFFFF', contactColor: '#FFFFFF' },
  memo: { paddingTopPx: 28, bottom: rule(1, '#111827'), headlineScale: 0.9 },
  'profile-tile': { monogram: 'left-solid', align: 'center', bottom: rule(8, mix('$divider', 0.22)) },
  'offset-banner': { outerTopPx: 24, paddingTopPx: 25, paddingBottomPx: 25, paddingHorizontalPx: 30, fill: '$accent', nameColor: '#FFFFFF', headlineColor: '#FFFFFF', contactColor: '#FFFFFF', leftInsetMultiplier: 0.55, shadow: { offsetPx: 14, color: mix('$divider', 0.18) } },
  module: { outerTopPx: 22, paddingTopPx: 22, paddingBottomPx: 22, paddingHorizontalPx: 22, monogram: 'left-solid', align: 'center', outline: rule(2) },
  'identity-panel': { fullBleed: true, paddingTopPx: 36, paddingBottomPx: 36, identityFill: '$sidebar', identityFraction: 0.41, nameColor: '#FFFFFF', headlineColor: '#FFFFFF' },
  swiss: { paddingTopPx: 28, top: rule(1, '#111111'), bottom: rule(1, '#111111'), nameLetterSpacingEm: -0.02, nameTransform: 'lowercase' },
  airy: { paddingTopPx: 52, paddingBottomPx: 30, bottom: rule(1, mix('$divider', 0.32)) },
  centered: { paddingTopPx: 54, contactLayout: 'inline-center', contactMarginTopPx: 16, align: 'center' },
  rail: { bottom: rule(1, '#D8DEE5'), left: rule(12, '$accent'), separateAccentRail: true },
  'top-rule': { outerTopPx: 22, top: rule(8, '$accent'), bottom: rule(2, '#111827') },
  executive: { fullBleed: true, paddingTopPx: 34, paddingBottomPx: 34, bottom: rule(4), fill: mix('$accent', 0.07) },
  'black-band': { fullBleed: true, paddingTopPx: 32, paddingBottomPx: 32, fill: '#171717', nameColor: '#FFFFFF', headlineColor: '#FFFFFF', contactColor: '#FFFFFF' },
  framed: { outerTopPx: 22, horizontalInsetPx: 22, paddingTopPx: 24, paddingBottomPx: 24, paddingHorizontalPx: 24, outline: rule(3, '$divider', 'double') },
};

const HEADING_VARIANTS = {
  offset: { borderWidthPx: 1, left: rule(4, '$accent'), offsetLeftPx: -14, paddingLeftPx: 14 },
  boxed: { borderWidthPx: 0, outline: rule(1), inline: true, paddingPx: [5, 10, 5, 10] },
  tab: { borderWidthPx: 0, inline: true, fill: '$heading', color: '#FFFFFF', paddingPx: [5, 12, 5, 12] },
  numbered: { borderWidthPx: 1, marker: 'number', markerColor: '#94A3B8' },
  bracket: { borderWidthPx: 0, prefix: '[', suffix: ']' },
  marker: { borderWidthPx: 0, marker: 'bar', markerWidthPx: 22, markerHeightPx: 5 },
  underline: { borderWidthPx: 1 },
  pill: { borderWidthPx: 0, inline: true, fill: mix('$accent', 0.13), paddingPx: [5, 13, 5, 13], borderRadiusPx: 999 },
  smallcaps: { fontScale: 1, sidebarFontScale: 1, letterSpacingEm: 0.16, top: rule(1), borderWidthPx: 0, paddingTopPx: 7 },
  'serif-rule': { fontFamily: "Georgia, 'Times New Roman', serif", fontScale: 1.35, sidebarFontScale: 1.35, weight: 400, transform: 'none', alignment: 'center' },
  bar: { borderWidthPx: 0, left: rule(10, '$accent'), paddingPx: [3, 0, 3, 10] },
  hairline: { color: '#111827', borderColor: '#111827', borderWidthPx: 1, fontScale: 0.98, sidebarFontScale: 0.98, letterSpacingEm: 0.16 },
  card: { borderWidthPx: 0, sectionOutline: rule(1, mix('$divider', 0.32, '#DFE5EC')), sectionPaddingPx: 14 },
  rounded: { borderWidthPx: 0, inline: true, fill: '$accent', color: '#FFFFFF', paddingPx: [6, 14, 6, 14], borderRadiusPx: 5 },
  notch: { borderWidthPx: 2, suffix: '◆', suffixAlignment: 'right' },
  'soft-rule': { borderColor: mix('$divider', 0.35), borderWidthPx: 1, weight: 650, transform: 'none' },
  'short-rule': { borderWidthPx: 0, alignment: 'center', marker: 'short-rule', markerWidthPx: 34, markerHeightPx: 2 },
  leaf: { borderWidthPx: 0, prefix: '◐' },
  'double-rule': { top: rule(1), borderWidthPx: 3, borderStyle: 'double', paddingTopPx: 6 },
  crest: { borderWidthPx: 0, alignment: 'center', marker: 'crest', markerWidthPx: 18, markerHeightPx: 1 },
  block: { borderWidthPx: 0, fill: '#171717', color: '#FFFFFF', paddingPx: [6, 9, 6, 9] },
  diamond: { borderWidthPx: 1, marker: 'diamond' },
};

const ENTRY_VARIANTS = {
  compact: { gapPx: 11 },
  'date-left': { dateStyle: 'left-column', dateColor: '$accent', dateFraction: 0.3 / 1.3, dateMinimumWidthPx: 92 },
  stacked: { dateStyle: 'below-title', dateBeforePx: 3 },
  cards: { paddingPx: 12, left: rule(4, '$accent'), fill: mix('$accent', 0.05) },
  'split-date': { dateOutline: rule(1), datePaddingPx: [2, 7, 2, 7] },
  academic: { alignment: 'center', dateStyle: 'inline-center' },
  evidence: { bottom: rule(1, '#DBE1E8'), paddingBottomPx: 12 },
  portfolio: { bottom: rule(4, mix('$divider', 0.18)), paddingBottomPx: 12 },
  editorial: { titleFontFamily: "Georgia, 'Times New Roman', serif", titleScale: 1.1 * 1.15 },
  'grid-entry': { dateStyle: 'identity-column', identityFraction: 0.32, gapHorizontalPx: 18 },
  quiet: { titleFontFamily: "Georgia, 'Times New Roman', serif", dateFontFamily: "Georgia, 'Times New Roman', serif" },
  outcome: { left: rule(3, '$accent'), paddingLeftPx: 16 },
  leadership: { titleColor: '$heading', titleScale: 1.1 * 1.12, titleTransform: 'uppercase' },
  impact: { paddingTopPx: 12, paddingBottomPx: 12, top: rule(1, '#111111') },
};

const BLUEPRINT_VARIANT_VALUES = {
  header: new Set(Object.keys(HEADER_VARIANTS)),
  heading: new Set(Object.keys(HEADING_VARIANTS)),
  entry: new Set(['standard', ...Object.keys(ENTRY_VARIANTS)]),
  skills: new Set(['list', 'columns', 'inline', 'chips']),
  density: new Set(['normal', 'compact', 'airy']),
  ratio: new Set(['balanced', 'narrow', 'wide', 'date']),
  sidebarStyle: new Set(['plain', 'solid', 'tint', 'outline']),
  sidebarPosition: new Set(['left', 'right']),
};

function validateBlueprintVariants(template, blueprint) {
  for (const [key, values] of Object.entries(BLUEPRINT_VARIANT_VALUES)) {
    const value = blueprint[key];
    // Omitted options retain the existing defaults. Explicit misspellings must
    // not silently become generic UI/CSS or Word output for a new template.
    if (value !== undefined && !values.has(value)) {
      const description = typeof value === 'string' ? value : value === null ? 'null' : typeof value;
      throw new Error(`Template ${template.id} has unsupported blueprint ${key}: ${description}.`);
    }
  }
}

const LEGACY = {
  classic: {
    bodyColor: '#333333',
    header: { variant: 'classic-banner', fullBleed: true, showHeadline: false, contactLayout: 'inline-center', contactFontScale: 0.9, contactGapPx: 16, contactMarginTopPx: 12, contactColor: '#FFFFFF', contactOpacity: 0.9, fill: '$accent', nameColor: '#FFFFFF', nameScale: 2.2, nameWeight: 600, nameLineHeight: 1.25, nameLetterSpacingPx: 1, paddingTopPx: 24, paddingBottomPx: 24, horizontalInsetPx: 32, align: 'center' },
  },
  modern: {
    bodyColor: '#334155',
    header: { variant: 'modern-split', fullBleed: true, headlineFallback: '', contactFontScale: 0.9, contactGapPx: 4, nameColor: '#0F172A', nameScale: 2.5, nameWeight: 700, nameLineHeight: 1.25, nameLetterSpacingPx: -0.5, headlineScale: 1.2, headlineWeight: 500, headlineTransform: 'none', headlineColor: '$accent', headlineMarginTopPx: 4, headlineLetterSpacingEm: 0, paddingTopPx: null, paddingBottomPx: 16, top: rule(6, '$accent') },
    heading: { variant: 'modern-rule', labels: { ...STANDARD_LABELS, summary: 'Profile', workHistory: 'Experience', skills: 'Expertise', websites: 'Links', personalDetails: 'Personal' }, transform: 'none', borderColor: '#E2E8F0', borderWidthPx: 1, paddingBottomPx: 8 },
    entry: { titleColor: '#1A202C', dateColor: '$accent', dateScale: 0.99, dateWeight: 700, subtitleItalic: false, subtitleWeight: 500, subtitleSeparator: ' • ', education: { dateWeight: 400, subtitleWeight: 400 } },
    page: { bodyTopPx: 0 },
  },
  professional: {
    bodyColor: '#111111',
    header: { variant: 'professional-centered', showHeadline: false, contactLayout: 'inline-center', contactOrder: ['location', 'phone', 'email', 'links'], contactSeparator: ' | ', contactFontScale: 0.9, contactGapPx: 8, contactMarginTopPx: 12, contactColor: '#111111', nameColor: '$accent', nameScale: 2.5, nameWeight: 400, nameLineHeight: 1.25, nameTransform: 'uppercase', nameLetterSpacingPx: 2, paddingTopPx: null, paddingBottomPx: 16, align: 'center' },
    heading: { labels: { ...STANDARD_LABELS, workHistory: 'Work Experience', skills: 'Skills & Core Competencies', websites: 'Links & Publications' }, borderColor: '#333333' },
    entry: { subtitleColor: '#000000', educationTitle: 'school', educationIncludesLocation: true, education: { titleFields: ['schoolName'], subtitleFields: ['degree', 'fieldOfStudy'], subtitleSeparator: ' in ', locationSuffixSeparator: ' - ', subtitleColor: '#555555' } },
    page: { bodyTopPx: 0 },
  },
  creative: {
    bodyColor: '#333333',
    header: { variant: 'creative-sidebar', identityInSidebar: true, showHeadline: false, contactLayout: 'stacked-left', contactFontScale: 0.9, contactGapPx: 6, contactMarginTopPx: 16, contactLineHeight: 1.45, contactColor: '#FFFFFF', contactOpacity: 0.9, nameScale: 2.2, nameWeight: 700, nameLineHeight: 1.1, nameColor: '#FFFFFF', nameLetterSpacingPx: 0, paddingTopPx: 0, paddingBottomPx: 32 },
    heading: { labels: { ...STANDARD_LABELS, summary: 'Profile', workHistory: 'Experience', websites: 'Links', personalDetails: 'Personal' }, sidebarColor: mix('#FFFFFF', 0.9, '$accent'), sidebarBorderColor: mix('#FFFFFF', 0.2, '$accent') },
    entry: { dateColor: '$accent', dateWeight: 500 },
    content: { languages: { variant: 'stacked', gapPx: 8, sidebarGapPx: 6 }, websites: { sidebarVariant: 'plain', sidebarGapPx: 6 }, personalDetails: { variant: 'stacked-labels', gapPx: 8, sidebarGapPx: 6, labelScale: 1 } },
    columns: { count: 2, sidebarFraction: 0.35, sidebarStyle: 'solid', sidebarFill: '$accent', sidebarColor: '#FFFFFF', sidebarInsetMultiplier: 0.75, mainInsetMultiplier: 1, fullBleed: true, sidebarItemLineHeight: 1.45, sidebarItemGapPx: 6 },
    page: { bodyTopPx: 0, bodyBottomPx: 0, horizontalInsetPx: 0 },
  },
  minimal: {
    bodyColor: '#333333',
    header: { variant: 'minimal-left', showHeadline: false, contactLayout: 'inline-left', contactOrder: ['email', 'links', 'phone', 'location'], contactColor: '#666666', contactFontScale: 0.9, contactGapPx: 16, contactMarginTopPx: 16, nameColor: '#111111', nameScale: 3, nameWeight: 300, nameLineHeight: 1.25, nameLetterSpacingPx: -1, paddingTopPx: 40, paddingBottomPx: 24 },
    heading: { variant: 'plain', labels: { ...STANDARD_LABELS, summary: 'Summary', workHistory: 'Experience', websites: 'Links' }, fontScale: 1.2, sidebarFontScale: 1.2, borderWidthPx: 0, paddingBottomPx: 0 },
    entry: { variant: 'left-rule', left: rule(2, '$accent'), marginLeftPx: 4, paddingLeftPx: 16, dateColor: '#666666', dateScale: 0.99 },
    page: { bodyTopPx: 0 },
  },
  executive: {
    bodyColor: '#222222',
    header: { variant: 'executive-framed', fullBleed: true, showHeadline: false, contactLayout: 'inline-left', contactOrder: ['email', 'links', 'phone', 'location'], contactFontFamily: 'Arial, sans-serif', contactColor: '#555555', contactFontScale: 0.9, contactGapPx: 16, contactMarginTopPx: 16, nameColor: '#111111', nameScale: 2.8, nameWeight: 400, nameLineHeight: 1.25, nameLetterSpacingPx: 0, paddingTopPx: null, paddingBottomPx: null, horizontalInsetMultiplier: 1.25, bottom: rule(2, '$accent'), fill: '#FAFAFA' },
    heading: { labels: { ...STANDARD_LABELS, summary: 'Executive Summary', workHistory: 'Professional Experience', skills: 'Core Competencies', websites: 'Websites & Portfolios', personalDetails: 'Personal Information' } },
    entry: { variant: 'executive', titleScale: 1.2, titleColor: '#111111', dateStyle: 'subtitle-right', dateScale: 1, dateColor: '$accent', dateWeight: 600, subtitleColor: '$accent', subtitleWeight: 600, subtitleItalic: false, subtitleAfterPx: 12, gapPx: 24, educationDateStyle: 'right', education: { titleScale: 1.1, dateScale: 1.1, subtitleColor: '#555555', subtitleWeight: 400, subtitleAfterPx: 8, gapPx: null } },
    page: { borderWidthPx: 8, frameConsumesSpace: true, horizontalInsetMultiplier: 1.25 },
  },
  accountant: {
    bodyColor: '#333333',
    header: { variant: 'accountant-band', fullBleed: true, contactLayout: 'body-column', contactOrder: ['phone', 'email', 'location', 'links'], contactLabel: 'Contact', contactGapPx: 7, contactLineHeight: 1.5, contactColor: '#333333', headlineFallback: 'Professional Accountant', headlineScale: 1.45, headlineColor: '#8A857D', headlineTransform: 'none', headlineLetterSpacingEm: 0, headlineMarginTopPx: 7, nameColor: '$accent', nameScale: 2.55, nameWeight: 800, nameLineHeight: 1, nameTransform: 'uppercase', nameLetterSpacingEm: 0.05, paddingTopPx: null, paddingTopMultiplier: 1.15, paddingBottomPx: 18, fill: '#F1F1F0' },
    heading: { variant: 'plain', labels: { ...STANDARD_LABELS, summary: 'About Me', workHistory: 'Work Experience' }, fontScale: 1.32, sidebarFontScale: 1.32, weight: 800, borderWidthPx: 0, paddingBottomPx: 0, letterSpacingEm: 0.08, gapPx: 13 },
    entry: { variant: 'meta-first', dateStyle: 'metadata-inline', titleScale: 1.06, titleColor: '$accent', subtitleScale: 0.93, subtitleColor: '#8A857D', subtitleItalic: false, subtitleAfterPx: 4, titleAfterPx: 5, gapPx: 18, educationIncludesLocation: true, education: { titleFields: ['degree', 'fieldOfStudy'], titleSeparator: ' in ', subtitleFields: ['schoolName', 'location'], subtitleSeparator: ', ' } },
    skills: { textVariant: 'list' },
    content: { languages: { variant: 'list', indentPx: 18, gapPx: 5 }, websites: { indentPx: 18, gapPx: 5 }, personalDetails: { variant: 'stacked-labels', gapPx: 6, labelScale: 0.91, labels: { dob: 'Date of birth', nationality: 'Nationality', maritalStatus: 'Marital status', gender: 'Gender' } } },
    columns: { count: 2, sidebarFraction: 1.58 / 2.44, semanticSidebarIsWide: true, summaryAboveColumns: true, contactColumn: 'main', innerInsetMultiplier: 0.72, divider: rule(2, '#DDDDDB'), top: rule(2, '#DDDDDB'), topMarginPx: 6, topPaddingPx: 26 },
  },
  developer: {
    bodyColor: '#111111',
    header: { variant: 'developer-stacked', contactLayout: 'stacked-left', contactOrder: ['phone', 'email', 'location', 'links'], contactBullet: true, contactGapPx: 6, contactMarginTopPx: 22, contactColor: '#111111', headlineFallback: 'Developer', headlineScale: 1.42, headlineColor: '#050505', headlineWeight: 800, headlineLetterSpacingEm: 0.025, headlineMarginTopPx: 15, nameColor: '#050505', nameScale: 2.45, nameWeight: 800, nameLineHeight: 1.05, nameTransform: 'uppercase', nameLetterSpacingEm: 0.055, paddingTopPx: 46, paddingBottomPx: 20, horizontalInsetPx: 52 },
    heading: { variant: 'plain', labels: { ...STANDARD_LABELS, summary: 'Summary', workHistory: 'Experience', websites: 'Links' }, fontScale: 1.28, sidebarFontScale: 1.28, weight: 800, borderWidthPx: 0, paddingBottomPx: 0, letterSpacingEm: 0.24, gapPx: 14 },
    entry: { variant: 'developer-stacked', dateStyle: 'below-subtitle', titleScale: 1.02, titleWeight: 800, titleTransform: 'uppercase', titleLetterSpacingEm: 0.065, titleAfterPx: 7, subtitleScale: 1.02, subtitleColor: '#111111', subtitleItalic: false, subtitleAfterPx: 7, dateScale: 1, dateWeight: 800, dateAfterPx: 11, gapPx: 19, educationIncludesLocation: true },
    skills: { textVariant: 'list' },
    content: { languages: { variant: 'list', indentPx: 18, gapPx: 5 }, websites: { indentPx: 18, gapPx: 5 }, personalDetails: { variant: 'stacked-labels', gapPx: 7, labelScale: 0.91, labels: { dob: 'Date of birth', nationality: 'Nationality', maritalStatus: 'Marital status', gender: 'Gender' } } },
    columns: { count: 2, sidebarFraction: 0.82 / 2.16, gapPx: 38, topPaddingPx: 22 },
    page: { borderWidthPx: 3, borderInsetPx: 12, borderRadiusPx: 22, horizontalInsetPx: 52, bodyTopPx: 22, bodyBottomPx: 54 },
  },
  timeline: {
    bodyColor: '#303744',
    header: { variant: 'timeline-rule', contactLayout: 'body-column', contactOrder: ['phone', 'email', 'location', 'links'], contactLabel: 'Contact', contactGapPx: 6, contactLineHeight: 1.5, contactColor: '#303744', headlineScale: 1.3, headlineColor: '#303744', headlineMarginTopPx: 11, headlineLetterSpacingEm: 0.035, nameColor: '$accent', nameScale: 2.45, nameWeight: 800, nameLineHeight: 1, nameTransform: 'uppercase', nameLetterSpacingEm: 0.055, paddingTopPx: 48, paddingBottomPx: 20, bottom: rule(2, '$accent') },
    heading: { labels: REFERENCE_LABELS, fontScale: 1.28, sidebarFontScale: 1.18, weight: 800, borderColor: mix('$accent', 0.86), borderWidthPx: 2, paddingBottomPx: 5, letterSpacingEm: 0.12, gapPx: 11 },
    entry: { dateScale: 1.1 * 0.88, dateColor: '$accent', dateWeight: 700, subtitleAfterPx: 7, educationIncludesLocation: true },
    content: { languages: { variant: 'list', indentPx: 20, gapPx: 0, sidebarIndentPx: 18, sidebarGapPx: 5 }, websites: { sidebarIndentPx: 18, sidebarGapPx: 5 }, personalDetails: { labels: { dob: 'Date of birth', nationality: 'Nationality', maritalStatus: 'Status', gender: 'Gender' } } },
    columns: { count: 2, sidebarFraction: 0.36 / 1.32, gapPx: 61, contactInSidebar: true, contactColumn: 'sidebar', timelineRail: { widthPx: 25, ruleWidthPx: 2, color: '#4A4A4A', markerCount: 4, markerGapPx: 130 }, topPaddingPx: 35 },
    page: { bodyTopPx: 35, bodyBottomPx: 46 },
  },
  editorial: {
    bodyColor: '#707070',
    header: { variant: 'editorial-band', contactLayout: 'separate-band', contactOrder: ['phone', 'email', 'location', 'links'], contactColor: '#777777', contactGapPx: 18, contactFill: '#F0F0F2', contactPaddingPx: 12, headlineScale: 1.25, headlineColor: '#626262', headlineLetterSpacingEm: 0, nameColor: '$accent', nameScale: 2.55, nameWeight: 400, nameLineHeight: 1.08, nameTransform: 'uppercase', nameLetterSpacingEm: 0.035, paddingTopPx: 46, paddingBottomPx: 24, align: 'center' },
    heading: { variant: 'section-rule', labels: REFERENCE_LABELS, fontScale: 1.18, sidebarFontScale: 1.18, weight: 800, borderWidthPx: 0, paddingBottomPx: 0, letterSpacingPx: 0, sectionTop: rule(2, '#666666'), sectionPaddingTopPx: 21 },
    entry: { dateColor: '$accent', gapPx: 22, subtitleAfterPx: 10, educationIncludesLocation: true },
    skills: { textVariant: 'three-columns' },
    content: { languages: { variant: 'list', indentPx: 20, gapPx: 0 }, personalDetails: { labels: { dob: 'Date of birth', nationality: 'Nationality', maritalStatus: 'Status', gender: 'Gender' } } },
    page: { bodyTopPx: 34, bodyBottomPx: 48 },
  },
  'ats-serif': {
    bodyColor: '#171717', defaultFontFamily: "Georgia, 'Times New Roman', serif", replaceDefaultInterFont: true,
    header: { variant: 'ats-serif-split', contactColor: '#171717', contactLineHeight: 1.7, headlineScale: 1.48, headlineColor: '#171717', headlineTransform: 'none', headlineMarginTopPx: 10, headlineLetterSpacingEm: 0.025, nameColor: '#171717', nameScale: 2.55, nameWeight: 400, nameLineHeight: 1.25, nameTransform: 'uppercase', nameLetterSpacingEm: 0.035, paddingTopPx: 46, paddingBottomPx: 30, bottom: rule(2, '#9A9A9A'), contactFraction: 0.46 / 1.46 },
    heading: { variant: 'serif-section-rule', labels: REFERENCE_LABELS, fontFamily: "Georgia, 'Times New Roman', serif", color: '#181818', fontScale: 1.75, sidebarFontScale: 1.75, weight: 400, transform: 'none', borderWidthPx: 0, paddingBottomPx: 0, letterSpacingEm: 0.02, alignment: 'center', sectionTop: rule(2, '#A3A3A3'), sectionPaddingTopPx: 13, omitFirstSectionTop: true },
    entry: { titleScale: 1.05, dateScale: 1.05, dateColor: '#252525', dateWeight: 500, dateItalic: true, gapPx: 19, educationIncludesLocation: true },
    content: { languages: { variant: 'list', indentPx: 20, gapPx: 0 }, personalDetails: { labels: { dob: 'Date of birth', nationality: 'Nationality', maritalStatus: 'Status', gender: 'Gender' } } },
    page: { bodyTopPx: 20, bodyBottomPx: 44 },
  },
};

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function entryCapabilities(definition = {}) {
  const entry = { ...DEFAULT_ENTRY, ...definition };
  const education = {
    titleFields: [entry.educationTitle === 'school' ? 'schoolName' : 'degree'], titleSeparator: '',
    subtitleFields: ['schoolName', 'fieldOfStudy', ...(entry.educationIncludesLocation ? ['location'] : [])],
    subtitleSeparator: entry.subtitleSeparator,
    ...definition.education,
  };
  return { ...entry, education };
}

function contentCapabilities(definition = {}) {
  return Object.fromEntries(Object.entries(DEFAULT_CONTENT).map(([key, value]) => [key, { ...value, ...definition[key] }]));
}

function blueprintPresentation(template) {
  const blueprint = template.blueprint || {};
  validateBlueprintVariants(template, blueprint);
  const side = blueprint.sidebarPosition || 'left';
  const ratio = blueprint.ratio || 'balanced';
  const sidebarFraction = ratio === 'narrow' ? 0.31 : ratio === 'wide' ? 0.41 : ratio === 'date' ? 0.25 : side === 'right' ? 0.32 : 0.38;
  const sidebarStyle = blueprint.sidebarStyle || 'plain';
  const compact = blueprint.density === 'compact';
  const airy = blueprint.density === 'airy';
  const header = { ...DEFAULT_HEADER, ...HEADER_VARIANTS[blueprint.header], variant: blueprint.header || 'left', headlineFromEducation: true };
  const heading = {
    ...DEFAULT_HEADING, labels: BLUEPRINT_LABELS, color: '$heading', borderColor: '$divider',
    sidebarFontScale: 1.02, lineHeight: 1.15,
    ...HEADING_VARIANTS[blueprint.heading], variant: blueprint.heading || 'underline',
  };
  const columns = {
    ...DEFAULT_COLUMNS, count: template.layout === '2-column' ? 2 : 1,
    sidebarPosition: side, sidebarFraction, sidebarStyle,
    topPaddingPx: compact ? 16 : 24, innerSidebarPaddingPx: 24, innerMainPaddingPx: 28,
    divider: rule(1, mix('$divider', 0.4, '#D7DDE5')),
  };
  if (sidebarStyle === 'solid' || sidebarStyle === 'tint') {
    columns.sidebarFill = sidebarStyle === 'solid' ? '$sidebar' : mix('$sidebar', 0.1);
    columns.sidebarColor = sidebarStyle === 'solid' ? '#FFFFFF' : null;
    columns.sidebarPaddingPx = [compact ? 16 : 24, 20, 30, 20];
    columns.divider = null;
  } else if (sidebarStyle === 'outline') {
    columns.sidebarPaddingPx = [compact ? 16 : 20, 20, 20, 20];
    columns.sidebarTopMarginPx = 18;
    columns.sidebarOutline = rule(2);
    columns.divider = null;
  }
  if (sidebarStyle === 'solid') {
    heading.sidebarColor = '#FFFFFF';
    heading.sidebarBorderColor = mix('#FFFFFF', 0.58, '$sidebar');
  }
  const page = { ...DEFAULT_PAGE, bodyTopPx: compact ? 16 : airy ? 32 : 20, bodyBottomPx: 42 };
  let bodyColor = '#273244';
  if (blueprint.header === 'oversized') page.bodyLeftMultiplier = 1.55;
  if (blueprint.header === 'rule' && ratio === 'date') columns.sidebarFontScale = 0.92;
  if (blueprint.header === 'centered-serif') bodyColor = '#4B4038';
  if (blueprint.header === 'profile-tile') columns.sidebarRadiusPx = [0, 18, 18, 0];
  if (blueprint.header === 'module') {
    columns.gapPx = 14;
    columns.innerSidebarPaddingPx = 0;
    columns.innerMainPaddingPx = 0;
    columns.sidebarPaddingPx = [20, 0, 20, 0];
    columns.sidebarOutline = null;
    columns.divider = null;
  }
  if (blueprint.header === 'swiss') bodyColor = '#111111';
  if (blueprint.header === 'centered') page.bodyMaxWidthPx = 680;
  if (blueprint.header === 'executive') columns.sidebarInsetStripe = { widthPx: 6, color: mix('#FFFFFF', 0.16, '$sidebar') };
  if (blueprint.header === 'grid') columns.mainGrid = { widthPx: 28, lineWidthPx: 1, color: mix('$divider', 0.09) };
  if (blueprint.header === 'framed') {
    page.borderWidthPx = 1;
    page.borderInsetPx = 14;
    page.borderColor = '$divider';
    page.outerMarginPx = 14;
    page.frameConsumesSpace = true;
  }
  return {
    kind: 'blueprint', blueprint, bodyColor, header, heading, customHeading: heading,
    entry: entryCapabilities({ educationIncludesLocation: true, includeCoursework: true, ...ENTRY_VARIANTS[blueprint.entry], variant: blueprint.entry || 'standard' }),
    skills: { variant: blueprint.skills || 'list', textVariant: ['inline', 'chips'].includes(blueprint.skills) ? blueprint.skills : 'auto-columns', sidebarVariant: blueprint.skills === 'columns' ? 'list' : blueprint.skills || 'list', sidebarTextVariant: ['inline', 'chips'].includes(blueprint.skills) ? blueprint.skills : 'auto-columns' },
    content: contentCapabilities({ languages: { variant: 'list', indentPx: 16, gapPx: 0 }, websites: { indentPx: 16, gapPx: 0 }, personalDetails: { variant: 'stacked-labels', gapPx: 7, labelScale: 0.86, labelTransform: 'uppercase', labels: { dob: 'Date of birth', nationality: 'Nationality', maritalStatus: 'Status', gender: 'Gender' } } }),
    columns, page, density: { variant: blueprint.density || 'normal', sectionGapPx: compact ? 14 : airy ? 28 : null },
  };
}

export function defineTemplatePresentation(template) {
  if (template.baseTemplate === 'blueprint') return deepFreeze(blueprintPresentation(template));
  const definition = LEGACY[template.id];
  if (!definition) throw new Error(`Template ${template.id} requires presentation capabilities.`);
  // A custom section is a section, not a generic fallback component. The HTML
  // renderer applies each legacy template's native heading treatment to it, so
  // Word must inherit that same complete descriptor unless a future template
  // deliberately provides a narrower custom-heading override.
  const heading = { ...DEFAULT_HEADING, ...definition.heading };
  const customHeading = { ...heading, ...definition.customHeading };
  return deepFreeze({
    kind: 'legacy', bodyColor: '#333333', ...definition,
    header: { ...DEFAULT_HEADER, nameLetterSpacingEm: 0, headlineFromEducation: false, ...definition.header },
    heading,
    customHeading,
    entry: entryCapabilities(definition.entry),
    skills: { variant: 'list', textVariant: 'auto-columns', sidebarVariant: 'list', sidebarTextVariant: template.id === 'creative' ? 'plain' : ['timeline', 'accountant', 'developer'].includes(template.id) ? 'list' : 'auto-columns', ...definition.skills },
    content: contentCapabilities(definition.content),
    columns: { ...DEFAULT_COLUMNS, ...definition.columns },
    page: { ...DEFAULT_PAGE, ...definition.page },
    density: { variant: 'normal', sectionGapPx: null },
  });
}
