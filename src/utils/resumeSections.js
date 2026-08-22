export const RESUME_SECTION_LABELS = {
  summary: 'Professional Summary',
  workHistory: 'Work History',
  education: 'Education',
  skills: 'Skills',
  personalDetails: 'Personal Details',
  websites: 'Websites & Profiles',
  certifications: 'Certifications',
  languages: 'Languages',
  projects: 'Projects',
  achievements: 'Achievements',
  awards: 'Awards',
  publications: 'Publications',
  accomplishments: 'Accomplishments',
  additionalInfo: 'Additional Information',
  affiliations: 'Affiliations',
  custom: 'Custom Section',
  customSections: 'Custom Section',
};

export const DEFAULT_RESUME_SECTION_ORDER = [
  'summary', 'websites', 'skills', 'workHistory', 'education', 'personalDetails', 'certifications', 'languages',
];

// These defaults preserve the original Creative template on existing resumes.
// A saved sectionColumns value always wins, so every real section—including a
// custom section—can move between the sidebar and the main content column.
export const DEFAULT_CREATIVE_SIDEBAR_SECTION_IDS = new Set([
  'skills', 'languages', 'personalDetails', 'websites',
]);

// `sidebar` and `main` are the persisted left/right rails. Each template
// keeps a different default composition until the user moves a section.
const CREATIVE_TEMPLATE_IDS = new Set(['creative', 'canvas', 'coral', 'prism', 'muse']);
const TIMELINE_TEMPLATE_IDS = new Set(['timeline']);
const MODERN_TEMPLATE_IDS = new Set(['modern', 'orbit', 'nova', 'metro', 'azure']);
const PROFESSIONAL_TEMPLATE_IDS = new Set(['professional', 'ledger', 'ivory', 'cobalt', 'sterling']);
const MINIMAL_TEMPLATE_IDS = new Set(['minimal', 'mono', 'nordic', 'pebble', 'willow']);
const EXECUTIVE_TEMPLATE_IDS = new Set(['executive', 'summit', 'regal', 'onyx', 'bordeaux']);
const ACCOUNTANT_RIGHT_SECTION_IDS = new Set([
  'skills', 'languages', 'personalDetails', 'websites', 'certifications',
]);
const DEVELOPER_LEFT_SECTION_IDS = new Set([
  'summary', 'education', 'skills', 'personalDetails', 'websites', 'certifications', 'languages',
]);

function templateColumnFamily(templateId) {
  if (TIMELINE_TEMPLATE_IDS.has(templateId)) return 'timeline';
  return CREATIVE_TEMPLATE_IDS.has(templateId) ? 'creative' : templateId;
}

/**
 * A renderer-neutral description of the current resume presentation.
 *
 * The editor, template components, HTML/PDF route, and DOCX exporter all
 * consume this model instead of independently re-deriving order, column, or
 * spacing decisions. Template code is therefore limited to visual treatment;
 * reordering and content placement remain stable across every output.
 */
export function getResumeLayoutTokens(design = {}) {
  const clamp = (value, minimum, maximum, fallback) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.min(maximum, Math.max(minimum, numeric)) : fallback;
  };
  const sectionControl = clamp(design.sectionSpacing, 0, 100, 50);
  const paragraphControl = clamp(design.paragraphSpacing, 0, 100, 50);
  const sectionGap = Math.round(8 + (sectionControl / 100) * 16);
  const paragraphGap = Math.round(4 + (paragraphControl / 100) * 12);

  return {
    sectionGap: `${sectionGap}px`,
    entryGap: `${Math.round(10 + (sectionControl / 100) * 12)}px`,
    headingGap: `${Math.max(7, Math.round(sectionGap * 0.75))}px`,
    paragraphGap: `${paragraphGap}px`,
    listGap: `${Math.max(2, Math.round(paragraphGap * 0.4))}px`,
    docx: {
      // DOCX uses twentieths of a point. These explicit values prevent Word's
      // Normal/List paragraph defaults from introducing page-sized gaps.
      sectionBefore: Math.round(140 + sectionControl * 2),
      sectionAfter: 70,
      paragraphAfter: Math.round(40 + paragraphControl * 0.8),
      sidebarParagraphAfter: 50,
      itemAfter: Math.round(50 + paragraphControl * 0.6),
      bulletAfter: Math.min(60, Math.max(0, Math.round(20 + paragraphControl * 0.4))),
      line: 240,
      // Shared Word layout tokens. Bullet paragraphs use a real hanging
      // indent, so wrapped lines begin under the skill/experience text rather
      // than under the bullet marker in every column and template.
      bodyIndent: 0,
      bulletIndent: 360,
      bulletHanging: 180,
    },
  };
}

function getLayoutFamily(templateId) {
  if (TIMELINE_TEMPLATE_IDS.has(templateId)) return 'timeline';
  if (CREATIVE_TEMPLATE_IDS.has(templateId)) return 'creative';
  if (MODERN_TEMPLATE_IDS.has(templateId)) return 'modern';
  if (PROFESSIONAL_TEMPLATE_IDS.has(templateId)) return 'professional';
  if (MINIMAL_TEMPLATE_IDS.has(templateId)) return 'minimal';
  if (EXECUTIVE_TEMPLATE_IDS.has(templateId)) return 'executive';
  return templateId === 'accountant' || templateId === 'developer' ? templateId : 'classic';
}

export function getResumeLayout(state, templateId = state.meta?.templateId) {
  const scopedState = templateId === state.meta?.templateId
    ? state
    : { ...state, meta: { ...state.meta, templateId } };
  const sectionOrder = getOrderedSectionIds(scopedState);
  const family = getLayoutFamily(templateId);
  const columns = sectionOrder.reduce((result, sectionId) => {
    result[getSectionColumn(scopedState, sectionId)].push(sectionId);
    return result;
  }, { sidebar: [], main: [] });

  return {
    templateId,
    family,
    isTwoColumn: ['creative', 'timeline', 'accountant', 'developer'].includes(family),
    sectionOrder,
    columns,
    sections: sectionOrder.map((id, index) => ({
      id,
      index,
      column: getSectionColumn(scopedState, id),
      title: getSectionDisplayName(scopedState, id),
      // The shared pagination contract: protect only the identity of a
      // section/entry, never make dynamic content an unbreakable page block.
      keepHeadingWithFirstBlock: true,
      allowContentSplit: true,
    })),
    tokens: getResumeLayoutTokens(scopedState.design),
  };
}

export function getDefaultSectionColumn(templateId, sectionId) {
  switch (templateColumnFamily(templateId)) {
    case 'accountant':
      return ACCOUNTANT_RIGHT_SECTION_IDS.has(sectionId) ? 'main' : 'sidebar';
    case 'developer':
      return DEVELOPER_LEFT_SECTION_IDS.has(sectionId) ? 'sidebar' : 'main';
    case 'timeline':
    case 'creative':
    default:
      return DEFAULT_CREATIVE_SIDEBAR_SECTION_IDS.has(sectionId) ? 'sidebar' : 'main';
  }
}

export const SECTION_EDIT_ROUTES = {
  summary: 'summary-editor',
  workHistory: 'work-summary',
  education: 'education-summary',
  skills: 'skills-editor',
  personalDetails: 'personal-details',
  websites: 'websites',
  certifications: 'certifications',
  languages: 'languages',
};

const HEADING_TO_SECTION = {
  summary: 'summary',
  'professional summary': 'summary',
  'executive summary': 'summary',
  profile: 'summary',
  'about me': 'summary',
  work: 'workHistory',
  'work history': 'workHistory',
  'work experience': 'workHistory',
  'professional experience': 'workHistory',
  experience: 'workHistory',
  education: 'education',
  skills: 'skills',
  expertise: 'skills',
  'core competencies': 'skills',
  'skills & core competencies': 'skills',
  personal: 'personalDetails',
  'personal details': 'personalDetails',
  'personal information': 'personalDetails',
  websites: 'websites',
  links: 'websites',
  'websites & profiles': 'websites',
  'websites & portfolios': 'websites',
  'links & publications': 'websites',
  certifications: 'certifications',
  languages: 'languages',
};

function normalizeHeading(value = '') {
  return String(value).replace(/\s+/g, ' ').trim().toLowerCase();
}

export function isCustomResumeSection(state, sectionId) {
  return Boolean(getCustomResumeSection(state, sectionId));
}

export function getCustomResumeSection(state, sectionId) {
  return Array.isArray(state.extraSections?.custom)
    ? state.extraSections.custom.find(section => section.id === sectionId)
    : undefined;
}

export function getTemplateSectionLayout(state, templateId = state.meta?.templateId) {
  const templateLayouts = state.design?.templateLayouts;
  if (templateLayouts && typeof templateLayouts === 'object') {
    const layout = templateLayouts[templateId];
    if (layout && typeof layout === 'object') {
      return {
        sectionOrder: Array.isArray(layout.sectionOrder) ? layout.sectionOrder : [],
        sectionColumns: layout.sectionColumns && typeof layout.sectionColumns === 'object'
          ? layout.sectionColumns
          : {},
      };
    }

    // Once a resume has template-scoped layouts, an unconfigured template
    // starts from its own defaults instead of inheriting another template.
    return { sectionOrder: [], sectionColumns: {} };
  }

  // Backward-compatible support for an older saved resume. Hydration moves
  // this data into the active template's layout before it is persisted again.
  return {
    sectionOrder: Array.isArray(state.design?.sectionOrder) ? state.design.sectionOrder : [],
    sectionColumns: state.design?.sectionColumns && typeof state.design.sectionColumns === 'object'
      ? state.design.sectionColumns
      : {},
  };
}

export function getOrderedSectionIds(state) {
  const selected = Array.isArray(state.extraSections?.selected) ? state.extraSections.selected : [];
  const customIds = [
    ...selected.filter(id => !DEFAULT_RESUME_SECTION_ORDER.includes(id)),
    ...(state.extraSections?.custom || []).map(section => section.id),
  ].filter(Boolean);
  const availableIds = [...DEFAULT_RESUME_SECTION_ORDER, ...customIds];
  const knownIds = new Set(availableIds);
  const savedOrder = getTemplateSectionLayout(state).sectionOrder;
  const seen = new Set();

  return [...savedOrder, ...availableIds].filter((id) => {
    if (!knownIds.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function getSectionColumn(state, sectionId) {
  const savedColumn = getTemplateSectionLayout(state).sectionColumns[sectionId];
  if (savedColumn === 'sidebar' || savedColumn === 'main') return savedColumn;
  return getDefaultSectionColumn(state.meta?.templateId, sectionId);
}

export function getSectionColumns(state) {
  return getOrderedSectionIds(state).reduce((columns, sectionId) => {
    columns[getSectionColumn(state, sectionId)].push(sectionId);
    return columns;
  }, { sidebar: [], main: [] });
}

export function getSectionDisplayName(state, sectionId) {
  if (isCustomResumeSection(state, sectionId)) {
    return state.extraSections.custom.find(section => section.id === sectionId)?.title || 'Custom Section';
  }

  return state.design?.sectionTitles?.[sectionId]?.trim()
    || RESUME_SECTION_LABELS[sectionId]
    || (String(sectionId || '').startsWith('custom-') ? 'Custom Section' : '')
    || 'Resume Section';
}

export function getSectionEditRoute(state, sectionId) {
  return isCustomResumeSection(state, sectionId)
    ? 'custom-sections'
    : SECTION_EDIT_ROUTES[sectionId];
}

export function getPreviewSectionId(sectionElement, state) {
  const explicitSectionId = sectionElement.dataset?.resumeSectionId;
  if (explicitSectionId) return explicitSectionId;

  const heading = normalizeHeading(sectionElement.querySelector('.tmpl-heading')?.textContent);
  if (!heading) return null;

  const renamedSection = Object.entries(state.design?.sectionTitles || {})
    .find(([, title]) => normalizeHeading(title) === heading)?.[0];
  if (renamedSection) return renamedSection;

  const standardSection = HEADING_TO_SECTION[heading];
  if (standardSection) return standardSection;

  return state.extraSections?.custom?.find(section => normalizeHeading(section.title) === heading)?.id || null;
}

export function applyPreviewSectionTitles(previewPage, state) {
  previewPage.querySelectorAll('.tmpl-section').forEach((sectionElement) => {
    const sectionId = getPreviewSectionId(sectionElement, state);
    if (!sectionId || isCustomResumeSection(state, sectionId)) return;

    const heading = sectionElement.querySelector('.tmpl-heading');
    const customTitle = state.design?.sectionTitles?.[sectionId]?.trim();
    if (heading && customTitle) heading.textContent = customTitle;
  });
}
