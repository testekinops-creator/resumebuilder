const palette = (accent, heading = accent, sidebar = accent, divider = accent) => ({
  accent, heading, sidebar, divider,
});

const preset = (id, label, colors) => ({ id, label, colors });

const COMMON_PRESETS = Object.freeze([
  preset('navy', 'Navy', palette('#1E3A5F', '#172554', '#1E3A5F', '#93C5FD')),
  preset('charcoal', 'Charcoal', palette('#334155', '#111827', '#1F2937', '#CBD5E1')),
  preset('forest', 'Forest', palette('#047857', '#065F46', '#065F46', '#A7F3D0')),
  preset('plum', 'Plum', palette('#7E22CE', '#581C87', '#581C87', '#D8B4FE')),
]);

function makeTheme(defaultColors, alternate = COMMON_PRESETS) {
  const defaults = preset('default', 'Original', defaultColors);
  const seen = new Set([defaultColors.accent.toLowerCase()]);
  const presets = [defaults, ...alternate.filter(item => {
    const key = item.colors.accent.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3)];
  return { defaultPreset: 'default', presets };
}

function defineTemplate({
  id,
  name,
  description,
  layout = '1-column',
  hasHeadshot = false,
  recommendedFor = ['1-3', '3-5'],
  accent = '#334155',
  heading = accent,
  sidebar = accent,
  divider = accent,
  baseTemplate = id,
  categories = [],
  atsFriendly = false,
  blueprint = null,
  sectionDefaults = null,
  columnLabels = null,
}) {
  const colors = palette(accent, heading, sidebar, divider);
  return Object.freeze({
    id,
    name,
    description,
    layout,
    hasHeadshot,
    recommendedFor,
    defaultColor: accent,
    baseTemplate,
    categories: Object.freeze([...new Set([
      ...(atsFriendly ? ['ats'] : []),
      layout === '2-column' ? 'two-column' : 'single-column',
      ...categories,
    ])]),
    atsFriendly,
    blueprint: blueprint ? Object.freeze({ ...blueprint }) : null,
    designSignature: blueprint?.signature || `${baseTemplate}:${id}`,
    sectionDefaults: sectionDefaults ? Object.freeze({
      sidebar: Object.freeze([...(sectionDefaults.sidebar || [])]),
      main: Object.freeze([...(sectionDefaults.main || [])]),
    }) : null,
    columnLabels: columnLabels ? Object.freeze({ ...columnLabels }) : null,
    theme: makeTheme(colors),
  });
}

const TECH_SIDEBAR = ['skills', 'certifications', 'languages', 'websites', 'personalDetails'];
const PROFILE_SIDEBAR = ['summary', 'skills', 'languages', 'websites', 'personalDetails'];
const EXECUTIVE_SIDEBAR = ['skills', 'education', 'certifications', 'languages', 'websites'];
const DETAILS_SIDEBAR = ['skills', 'languages', 'personalDetails', 'websites', 'certifications'];

export const TEMPLATES = Object.freeze([
  defineTemplate({ id: 'classic', name: 'Classic Professional', description: 'Centered color banner with conventional section rules.', accent: '#6B21A8', categories: ['professional', 'experienced'], atsFriendly: true, recommendedFor: ['3-5', '5-10', '10+'] }),
  defineTemplate({ id: 'modern', name: 'Modern Executive', description: 'Split masthead with modern type and compact content rhythm.', accent: '#2563EB', categories: ['modern', 'professional', 'leadership'], atsFriendly: true, recommendedFor: ['1-3', '3-5', '5-10'] }),
  defineTemplate({ id: 'professional', name: 'Corporate Standard', description: 'Formal underlined header and conservative business hierarchy.', accent: '#0F172A', categories: ['professional', 'executive', 'experienced'], atsFriendly: true, recommendedFor: ['5-10', '10+'] }),
  defineTemplate({ id: 'creative', name: 'Elegant Sidebar', description: 'Full-height left color rail with a spacious primary column.', layout: '2-column', hasHeadshot: true, accent: '#059669', categories: ['creative', 'modern'], sectionDefaults: { sidebar: PROFILE_SIDEBAR, main: ['workHistory', 'education'] }, columnLabels: { sidebar: 'Left sidebar', main: 'Main content' } }),
  defineTemplate({ id: 'minimal', name: 'Minimal Clean', description: 'Whitespace-led single column with restrained typography.', accent: '#475569', categories: ['minimal', 'professional'], atsFriendly: true }),
  defineTemplate({ id: 'executive', name: 'Leadership Brief', description: 'Framed leadership masthead and authoritative section treatment.', accent: '#1E3A5F', categories: ['executive', 'leadership', 'experienced'], atsFriendly: true, recommendedFor: ['10+'] }),
  defineTemplate({ id: 'accountant', name: 'Structured Finance', description: 'Monochrome summary band with a ruled right details column.', layout: '2-column', accent: '#2D2D2F', categories: ['professional', 'executive', 'experienced'], atsFriendly: true, recommendedFor: ['3-5', '5-10', '10+'], sectionDefaults: { sidebar: ['summary', 'workHistory', 'education'], main: DETAILS_SIDEBAR }, columnLabels: { sidebar: 'Experience column', main: 'Details column' } }),
  defineTemplate({ id: 'developer', name: 'Technical Engineer', description: 'Outlined technical composition with a skills-first left column.', layout: '2-column', accent: '#5872FF', categories: ['technical', 'modern', 'experienced'], recommendedFor: ['1-3', '3-5', '5-10'], sectionDefaults: { sidebar: PROFILE_SIDEBAR, main: ['workHistory', 'education'] }, columnLabels: { sidebar: 'Technical profile', main: 'Experience' } }),
  defineTemplate({ id: 'timeline', name: 'Career Timeline', description: 'Dedicated date rail separates supporting facts from career history.', layout: '2-column', accent: '#2E3A4D', categories: ['professional', 'experienced', 'leadership'], recommendedFor: ['3-5', '5-10', '10+'], sectionDefaults: { sidebar: DETAILS_SIDEBAR, main: ['summary', 'workHistory', 'education'] }, columnLabels: { sidebar: 'Supporting details', main: 'Career timeline' } }),
  defineTemplate({ id: 'editorial', name: 'Editorial Profile', description: 'Centered masthead, soft contact band, and magazine-like rules.', accent: '#C7A0A8', categories: ['creative', 'professional'], recommendedFor: ['3-5', '5-10', '10+'] }),
  defineTemplate({ id: 'ats-serif', name: 'ATS Serif', description: 'Semantic single-column reading order with classic editorial type.', accent: '#202020', categories: ['professional', 'minimal', 'experienced'], atsFriendly: true, recommendedFor: ['1-3', '3-5', '5-10'] }),

  defineTemplate({ id: 'harbor', name: 'Left Accent', description: 'Strong left rule, inline contact row, and offset section labels.', accent: '#0E7490', categories: ['professional', 'modern'], atsFriendly: true, baseTemplate: 'blueprint', blueprint: { signature: 'single:left-rule:offset:compact', header: 'left-rule', heading: 'offset', entry: 'compact', skills: 'inline', density: 'compact' } }),
  defineTemplate({ id: 'sapphire', name: 'Split Header', description: 'Name and contact occupy opposing header blocks above boxed headings.', accent: '#1D4ED8', categories: ['professional', 'modern'], atsFriendly: true, baseTemplate: 'blueprint', blueprint: { signature: 'single:split:boxed:standard', header: 'split', heading: 'boxed', entry: 'standard', skills: 'columns' } }),
  defineTemplate({ id: 'slate', name: 'Compact Sidebar', description: 'Dense left experience rail paired with a narrow right profile column.', layout: '2-column', accent: '#334155', categories: ['professional', 'experienced'], atsFriendly: true, baseTemplate: 'blueprint', blueprint: { signature: 'two:right:compact:tab:date-left', header: 'compact', heading: 'tab', entry: 'date-left', skills: 'list', sidebarPosition: 'right', ratio: 'wide' }, sectionDefaults: { sidebar: DETAILS_SIDEBAR, main: ['summary', 'workHistory', 'education'] }, columnLabels: { sidebar: 'Right profile column', main: 'Experience column' } }),
  defineTemplate({ id: 'aspen', name: 'Graduate Launch', description: 'Optimistic full-width band with numbered sections for early careers.', accent: '#15803D', categories: ['fresher', 'modern'], atsFriendly: true, recommendedFor: ['none', '0-1'], baseTemplate: 'blueprint', blueprint: { signature: 'single:band:numbered:project-first', header: 'band', heading: 'numbered', entry: 'standard', skills: 'chips', density: 'airy' } }),
  defineTemplate({ id: 'orbit', name: 'Product Grid', description: 'Balanced two-column product layout with bracketed headings and skill chips.', layout: '2-column', accent: '#4F46E5', categories: ['technical', 'modern', 'experienced'], baseTemplate: 'blueprint', blueprint: { signature: 'two:left:grid:bracket:chips', header: 'grid', heading: 'bracket', entry: 'cards', skills: 'chips', sidebarPosition: 'left', ratio: 'narrow' }, sectionDefaults: { sidebar: TECH_SIDEBAR, main: ['summary', 'workHistory', 'education'] }, columnLabels: { sidebar: 'Capabilities', main: 'Product impact' } }),
  defineTemplate({ id: 'nova', name: 'Bold Typography', description: 'Oversized name treatment with compact marker-led sections.', accent: '#7C3AED', categories: ['modern', 'creative'], baseTemplate: 'blueprint', blueprint: { signature: 'single:oversized:marker:stacked', header: 'oversized', heading: 'marker', entry: 'stacked', skills: 'inline', density: 'compact' } }),
  defineTemplate({ id: 'metro', name: 'Right Rail', description: 'A slim colored information rail anchors the right side of the page.', layout: '2-column', accent: '#0F766E', categories: ['modern', 'professional'], baseTemplate: 'blueprint', blueprint: { signature: 'two:right:rail:underline:standard', header: 'left', heading: 'underline', entry: 'standard', skills: 'list', sidebarPosition: 'right', ratio: 'narrow', sidebarStyle: 'solid' }, sectionDefaults: { sidebar: DETAILS_SIDEBAR, main: ['summary', 'workHistory', 'education'] }, columnLabels: { sidebar: 'Right information rail', main: 'Main narrative' } }),
  defineTemplate({ id: 'azure', name: 'Contemporary Band', description: 'A slim title band and pill headings create a service-oriented layout.', accent: '#0284C7', categories: ['modern', 'professional'], atsFriendly: true, baseTemplate: 'blueprint', blueprint: { signature: 'single:title-band:pill:split-date', header: 'title-band', heading: 'pill', entry: 'split-date', skills: 'columns' } }),
  defineTemplate({ id: 'ledger', name: 'Consulting Ledger', description: 'Date-led entries and ledger rules prioritize advisory experience.', layout: '2-column', accent: '#854D0E', categories: ['professional', 'executive', 'experienced'], atsFriendly: true, baseTemplate: 'blueprint', blueprint: { signature: 'two:left:ledger:smallcaps:date-left', header: 'rule', heading: 'smallcaps', entry: 'date-left', skills: 'list', sidebarPosition: 'left', ratio: 'date' }, sectionDefaults: { sidebar: ['education', 'skills', 'certifications', 'languages'], main: ['summary', 'workHistory', 'websites', 'personalDetails'] }, columnLabels: { sidebar: 'Credentials', main: 'Consulting record' } }),
  defineTemplate({ id: 'ivory', name: 'Academic Professional', description: 'Centered serif identity with scholarly headings and generous notes.', accent: '#9A3412', categories: ['professional', 'minimal', 'fresher'], atsFriendly: true, baseTemplate: 'blueprint', blueprint: { signature: 'single:centered:serif-rule:academic', header: 'centered-serif', heading: 'serif-rule', entry: 'academic', skills: 'columns', density: 'airy' } }),
  defineTemplate({ id: 'cobalt', name: 'Corporate Split', description: 'Dark split masthead above an asymmetric credentials column.', layout: '2-column', accent: '#1E40AF', categories: ['professional', 'executive', 'leadership'], baseTemplate: 'blueprint', blueprint: { signature: 'two:right:dark-split:bar:standard', header: 'dark-split', heading: 'bar', entry: 'standard', skills: 'list', sidebarPosition: 'right', ratio: 'balanced', sidebarStyle: 'tint' }, sectionDefaults: { sidebar: EXECUTIVE_SIDEBAR, main: ['summary', 'workHistory', 'personalDetails', 'websites'] }, columnLabels: { sidebar: 'Credentials', main: 'Leadership record' } }),
  defineTemplate({ id: 'sterling', name: 'Consulting Brief', description: 'Executive memo masthead with hairline labels and compact evidence.', accent: '#475569', categories: ['professional', 'minimal', 'experienced'], atsFriendly: true, baseTemplate: 'blueprint', blueprint: { signature: 'single:memo:hairline:evidence', header: 'memo', heading: 'hairline', entry: 'evidence', skills: 'inline', density: 'compact' } }),
  defineTemplate({ id: 'canvas', name: 'Portfolio Grid', description: 'Creative profile tile beside a modular project-focused content grid.', layout: '2-column', hasHeadshot: true, accent: '#C2410C', categories: ['creative', 'modern'], baseTemplate: 'blueprint', blueprint: { signature: 'two:left:profile-tile:card:portfolio', header: 'profile-tile', heading: 'card', entry: 'portfolio', skills: 'chips', sidebarPosition: 'left', ratio: 'narrow', sidebarStyle: 'tint' }, sectionDefaults: { sidebar: PROFILE_SIDEBAR, main: ['workHistory', 'education'] }, columnLabels: { sidebar: 'Profile tile', main: 'Portfolio work' } }),
  defineTemplate({ id: 'coral', name: 'Creative Banner', description: 'Offset color banner, rounded labels, and editorial project entries.', accent: '#E11D48', categories: ['creative', 'modern', 'fresher'], baseTemplate: 'blueprint', blueprint: { signature: 'single:offset-banner:rounded:editorial', header: 'offset-banner', heading: 'rounded', entry: 'editorial', skills: 'chips', density: 'airy' } }),
  defineTemplate({ id: 'prism', name: 'Modular Cards', description: 'Balanced information cards create a distinct visual scanning path.', layout: '2-column', hasHeadshot: true, accent: '#9333EA', categories: ['creative', 'modern'], baseTemplate: 'blueprint', blueprint: { signature: 'two:left:module:card:cards', header: 'module', heading: 'card', entry: 'cards', skills: 'chips', sidebarPosition: 'left', ratio: 'balanced', sidebarStyle: 'outline' }, sectionDefaults: { sidebar: ['summary', 'skills', 'languages', 'websites'], main: ['workHistory', 'education', 'certifications', 'personalDetails'] }, columnLabels: { sidebar: 'Profile modules', main: 'Experience modules' } }),
  defineTemplate({ id: 'muse', name: 'Vertical Accent', description: 'A broad left identity panel contrasts with a clean editorial column.', layout: '2-column', hasHeadshot: true, accent: '#0F766E', categories: ['creative', 'professional'], baseTemplate: 'blueprint', blueprint: { signature: 'two:left:identity-panel:notch:editorial', header: 'identity-panel', heading: 'notch', entry: 'editorial', skills: 'list', sidebarPosition: 'left', ratio: 'wide', sidebarStyle: 'solid' }, sectionDefaults: { sidebar: PROFILE_SIDEBAR, main: ['workHistory', 'education', 'certifications'] }, columnLabels: { sidebar: 'Identity panel', main: 'Editorial record' } }),
  defineTemplate({ id: 'mono', name: 'Swiss Minimal', description: 'Strict baseline grid, numbered labels, and monochrome typography.', accent: '#18181B', categories: ['minimal', 'modern'], atsFriendly: true, baseTemplate: 'blueprint', blueprint: { signature: 'single:swiss:numbered:grid-entry', header: 'swiss', heading: 'numbered', entry: 'grid-entry', skills: 'inline', density: 'compact' } }),
  defineTemplate({ id: 'nordic', name: 'Airy Sidebar', description: 'Light right sidebar and calm typographic spacing for modern teams.', layout: '2-column', accent: '#0369A1', categories: ['minimal', 'modern'], baseTemplate: 'blueprint', blueprint: { signature: 'two:right:airy:soft-rule:standard', header: 'airy', heading: 'soft-rule', entry: 'standard', skills: 'columns', sidebarPosition: 'right', ratio: 'narrow', sidebarStyle: 'tint', density: 'airy' }, sectionDefaults: { sidebar: DETAILS_SIDEBAR, main: ['summary', 'workHistory', 'education'] }, columnLabels: { sidebar: 'Right details panel', main: 'Primary story' } }),
  defineTemplate({ id: 'pebble', name: 'Centered Minimal', description: 'Centered identity, short divider marks, and calm single-column flow.', accent: '#78716C', categories: ['minimal', 'fresher'], atsFriendly: true, recommendedFor: ['none', '0-1'], baseTemplate: 'blueprint', blueprint: { signature: 'single:centered:short-rule:quiet', header: 'centered', heading: 'short-rule', entry: 'quiet', skills: 'columns', density: 'airy' } }),
  defineTemplate({ id: 'willow', name: 'Soft Rail', description: 'Tinted left rail and organic divider rhythm for people-focused roles.', layout: '2-column', accent: '#4D7C0F', categories: ['minimal', 'professional'], baseTemplate: 'blueprint', blueprint: { signature: 'two:left:soft-rail:leaf:quiet', header: 'rail', heading: 'leaf', entry: 'quiet', skills: 'list', sidebarPosition: 'left', ratio: 'narrow', sidebarStyle: 'tint' }, sectionDefaults: { sidebar: PROFILE_SIDEBAR, main: ['workHistory', 'education', 'certifications'] }, columnLabels: { sidebar: 'Profile rail', main: 'Experience' } }),
  defineTemplate({ id: 'summit', name: 'Leadership Profile', description: 'Top-rule executive header and outcome-led leadership entries.', accent: '#1E3A8A', categories: ['executive', 'leadership', 'experienced'], atsFriendly: true, recommendedFor: ['10+'], baseTemplate: 'blueprint', blueprint: { signature: 'single:top-rule:double-rule:outcome', header: 'top-rule', heading: 'double-rule', entry: 'outcome', skills: 'inline', density: 'compact' } }),
  defineTemplate({ id: 'regal', name: 'Executive Sidebar', description: 'Premium right credentials panel beside a commanding leadership story.', layout: '2-column', accent: '#581C87', categories: ['executive', 'leadership', 'experienced'], baseTemplate: 'blueprint', blueprint: { signature: 'two:right:executive:crest:leadership', header: 'executive', heading: 'crest', entry: 'leadership', skills: 'list', sidebarPosition: 'right', ratio: 'wide', sidebarStyle: 'solid' }, sectionDefaults: { sidebar: EXECUTIVE_SIDEBAR, main: ['summary', 'workHistory', 'personalDetails', 'websites'] }, columnLabels: { sidebar: 'Executive credentials', main: 'Leadership experience' } }),
  defineTemplate({ id: 'onyx', name: 'High Contrast', description: 'Black title band with reversed contact type and stark section blocks.', accent: '#27272A', categories: ['executive', 'modern', 'experienced'], atsFriendly: true, recommendedFor: ['5-10', '10+'], baseTemplate: 'blueprint', blueprint: { signature: 'single:black-band:block:impact', header: 'black-band', heading: 'block', entry: 'impact', skills: 'columns', density: 'compact' } }),
  defineTemplate({ id: 'bordeaux', name: 'Premium Executive', description: 'Framed page composition with a narrow leadership credentials rail.', layout: '2-column', accent: '#881337', categories: ['executive', 'leadership', 'experienced'], baseTemplate: 'blueprint', blueprint: { signature: 'two:left:framed:diamond:leadership', header: 'framed', heading: 'diamond', entry: 'leadership', skills: 'list', sidebarPosition: 'left', ratio: 'narrow', sidebarStyle: 'outline' }, sectionDefaults: { sidebar: EXECUTIVE_SIDEBAR, main: ['summary', 'workHistory', 'personalDetails', 'websites'] }, columnLabels: { sidebar: 'Leadership credentials', main: 'Executive record' } }),
]);

export const TEMPLATE_CATEGORIES = Object.freeze([
  { id: 'all', label: 'All' },
  { id: 'ats', label: 'ATS Friendly' },
  { id: 'professional', label: 'Professional' },
  { id: 'modern', label: 'Modern' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'executive', label: 'Executive' },
  { id: 'technical', label: 'Technical' },
  { id: 'creative', label: 'Creative' },
  { id: 'two-column', label: 'Two Column' },
  { id: 'single-column', label: 'Single Column' },
  { id: 'fresher', label: 'Fresher' },
  { id: 'experienced', label: 'Experienced' },
  { id: 'leadership', label: 'Leadership' },
]);

export function getTemplateById(templateId) {
  return TEMPLATES.find(template => template.id === templateId) || TEMPLATES[0];
}

export function filterTemplates(category = 'all', templates = TEMPLATES) {
  return category === 'all' ? [...templates] : templates.filter(template => template.categories.includes(category));
}

function validHex(value) {
  return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
}

export function getTemplateTheme(templateOrId, presetId, overrides = {}) {
  const template = typeof templateOrId === 'string' ? getTemplateById(templateOrId) : (templateOrId || TEMPLATES[0]);
  const theme = template.theme;
  const selected = theme.presets.find(item => item.id === presetId)
    || theme.presets.find(item => item.id === theme.defaultPreset)
    || theme.presets[0];
  const colors = { ...selected.colors };
  for (const key of ['accent', 'heading', 'sidebar', 'divider']) {
    if (validHex(overrides[key])) colors[key] = overrides[key];
  }
  return { id: selected.id, label: selected.label, colors };
}

export const COLOR_SCHEMES = Object.freeze([
  { id: 'white', value: '#FFFFFF', label: 'White' },
  { id: 'gray', value: '#6B7280', label: 'Gray' },
  { id: 'navy', value: '#1E3A5F', label: 'Navy' },
  { id: 'purple', value: '#6B21A8', label: 'Purple' },
  { id: 'blue', value: '#2563EB', label: 'Blue' },
  { id: 'teal', value: '#0D9488', label: 'Teal' },
  { id: 'green', value: '#059669', label: 'Green' },
  { id: 'brown', value: '#92400E', label: 'Brown' },
  { id: 'pink', value: '#DB2777', label: 'Pink' },
  { id: 'red', value: '#DC2626', label: 'Red' },
  { id: 'yellow', value: '#D97706', label: 'Amber' },
]);

export const FONT_FAMILIES = Object.freeze([
  'Inter', 'Arial', 'Helvetica', 'Calibri', 'Verdana', 'Trebuchet MS',
  'Georgia', 'Garamond', 'Palatino Linotype', 'Times New Roman', 'Cambria', 'Courier New',
]);

export const EXPERIENCE_LEVELS = Object.freeze([
  { id: 'none', label: 'No Experience', description: 'Student or recent graduate' },
  { id: '0-1', label: 'Less Than 1 Year', description: 'Entry level' },
  { id: '1-3', label: '1-3 Years', description: 'Early career' },
  { id: '3-5', label: '3-5 Years', description: 'Mid-level professional' },
  { id: '5-10', label: '5-10 Years', description: 'Experienced professional' },
  { id: '10+', label: '10+ Years', description: 'Senior / Executive' },
]);

export const EDUCATION_LEVELS = Object.freeze([
  { id: 'vocational', label: 'Vocational', icon: 'certificate' },
  { id: 'apprenticeship', label: 'Apprenticeship', icon: 'experience' },
  { id: 'associates', label: 'Associates', icon: 'education' },
  { id: 'bachelors', label: 'Bachelors', icon: 'education' },
  { id: 'masters', label: 'Masters', icon: 'summary' },
  { id: 'doctorate', label: 'Doctorate', icon: 'award' },
]);

export const DEGREE_OPTIONS = Object.freeze([
  'High School Diploma', 'GED', 'Associate of Arts (AA)', 'Associate of Science (AS)',
  'Bachelor of Arts (BA)', 'Bachelor of Science (BS)', 'Master of Arts (MA)',
  'Master of Science (MS)', 'MBA', 'Ph.D.', 'M.D.', 'J.D.', 'Other',
]);

export const EXTRA_SECTION_OPTIONS = Object.freeze([
  { id: 'personalDetails', label: 'Personal Details', icon: 'person' },
  { id: 'websites', label: 'Websites, Portfolios, Profiles', icon: 'website' },
  { id: 'certifications', label: 'Certifications', icon: 'certificate' },
  { id: 'languages', label: 'Languages', icon: 'language', isNew: true },
  { id: 'projects', label: 'Projects', icon: 'project' },
  { id: 'achievements', label: 'Achievements', icon: 'award' },
  { id: 'awards', label: 'Awards', icon: 'award' },
  { id: 'publications', label: 'Publications', icon: 'summary' },
  { id: 'customSections', label: 'Custom Sections', icon: 'custom' },
  { id: 'accomplishments', label: 'Accomplishments', icon: 'finish' },
  { id: 'additionalInfo', label: 'Additional Information', icon: 'info' },
  { id: 'affiliations', label: 'Affiliations', icon: 'person' },
]);
