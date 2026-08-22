const OPTIONAL_FLOW = [
  { id: 'personalDetails', route: 'personal-details' },
  { id: 'websites', route: 'websites' },
  { id: 'certifications', route: 'certifications' },
  { id: 'languages', route: 'languages' },
  { id: 'customSections', route: 'custom-sections' },
];

const CUSTOM_SECTION_IDS = new Set([
  'projects', 'achievements', 'awards', 'publications', 'accomplishments', 'additionalInfo', 'affiliations',
  'custom', 'customSections',
]);

export function isCustomSectionId(id) {
  return CUSTOM_SECTION_IDS.has(id) || String(id || '').startsWith('custom-');
}

function selectedFlow(selected = []) {
  const hasCustomSections = selected.some(isCustomSectionId);
  return OPTIONAL_FLOW.filter(section => (
    section.id === 'customSections' ? hasCustomSections : selected.includes(section.id)
  ));
}

export function getOptionalSectionPath(selected, currentId, direction = 'next') {
  const flow = selectedFlow(selected);
  const currentIndex = flow.findIndex(section => section.id === currentId);
  const target = direction === 'next'
    ? flow[currentIndex + 1]
    : flow[currentIndex - 1];

  if (target) return `/builder/${target.route}`;
  return direction === 'next' ? '/builder/smart-apply' : '/builder/extra-sections';
}

export function getFirstOptionalSectionPath(selected) {
  const [first] = selectedFlow(selected);
  return first ? `/builder/${first.route}` : '/builder/smart-apply';
}

export function getSelectedCustomSections(selected = []) {
  return selected.filter(isCustomSectionId);
}
