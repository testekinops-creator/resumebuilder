const INVALID_TEXT = /^(?:undefined|null|nan|[+-]?infinity|invalid date|\[object object\])$/i;
// eslint-disable-next-line no-control-regex -- Strip characters forbidden by XML 1.0.
const INVALID_XML_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function record(value) {
  return isRecord(value) ? value : {};
}

function text(value) {
  if (typeof value !== 'string' && !(typeof value === 'number' && Number.isFinite(value))) return '';
  const cleaned = String(value).replace(INVALID_XML_CHARACTERS, '').trim();
  return INVALID_TEXT.test(cleaned) ? '' : cleaned;
}

function textRecord(value) {
  return Object.fromEntries(Object.entries(record(value))
    .filter(([key]) => !UNSAFE_KEYS.has(key))
    .map(([key, item]) => [key, text(item)]));
}

function stringList(value) {
  return [...new Set((Array.isArray(value) ? value : []).map(text).filter(Boolean))];
}

function columnMap(value) {
  return Object.fromEntries(Object.entries(record(value))
    .filter(([key, column]) => !UNSAFE_KEYS.has(key) && (column === 'main' || column === 'sidebar')));
}

function contentEntries(value, normalize) {
  return (Array.isArray(value) ? value : []).filter(isRecord).map(normalize);
}

function hasEntryText(entry) {
  return Object.entries(entry).some(([key, value]) => key !== 'id' && typeof value === 'string' && value !== '');
}

/**
 * DOCX-only, non-mutating boundary for saved/imported resume data. Rich text
 * remains an HTML string for the renderer's rich-text parser; this does not
 * flatten paragraphs, reorder lists, or alter the application's saved state.
 */
export function sanitizeDocxState(inputState) {
  const state = record(inputState);
  const sourceDesign = record(state.design);
  const design = textRecord(sourceDesign);
  for (const key of ['sectionSpacing', 'paragraphSpacing', 'lineSpacing', 'pageMargin', 'headingLetterSpacing']) {
    const value = sourceDesign[key];
    const number = typeof value === 'number' || (typeof value === 'string' && value.trim()) ? Number(value) : NaN;
    if (Number.isFinite(number)) design[key] = number;
    else delete design[key];
  }
  design.fontStyle = ['small', 'normal', 'large'].includes(sourceDesign.fontStyle) ? sourceDesign.fontStyle : 'normal';
  design.sectionTitles = textRecord(sourceDesign.sectionTitles);
  design.sectionOrder = stringList(sourceDesign.sectionOrder);
  design.sectionColumns = columnMap(sourceDesign.sectionColumns);
  // Preserve the shared layout resolver's legacy fallback: absence is not the
  // same thing as an explicitly configured, empty template-layout collection.
  delete design.templateLayouts;
  if (isRecord(sourceDesign.templateLayouts)) {
    design.templateLayouts = Object.fromEntries(Object.entries(sourceDesign.templateLayouts)
      .filter(([templateId, layout]) => !UNSAFE_KEYS.has(templateId) && isRecord(layout))
      .map(([templateId, layout]) => [templateId, {
        sectionOrder: stringList(layout.sectionOrder),
        sectionColumns: columnMap(layout.sectionColumns),
      }]));
  }

  const sourceSkills = record(state.skills);
  const sourceExtras = record(state.extraSections);
  const seenCustomIds = new Set();
  const custom = contentEntries(sourceExtras.custom, (section, index) => ({
    ...textRecord(section),
    id: text(section.id) || `custom-docx-${index + 1}`,
    title: text(section.title),
    content: text(section.content),
  })).filter(section => {
    if (seenCustomIds.has(section.id)) return false;
    seenCustomIds.add(section.id);
    return Boolean(section.title || section.content);
  });

  const contact = textRecord(state.contact);
  if (!contact.surname && contact.lastName) contact.surname = contact.lastName;
  const personalDetails = textRecord(state.personalDetails);
  personalDetails.additionalInfo = contentEntries(record(state.personalDetails).additionalInfo, textRecord);

  return {
    meta: { ...textRecord(state.meta), templateId: text(record(state.meta).templateId) || 'classic' },
    contact,
    summary: { content: text(record(state.summary).content) },
    workHistory: contentEntries(state.workHistory, entry => ({
      ...textRecord(entry), currentJob: entry.currentJob === true,
    })).filter(hasEntryText),
    education: contentEntries(state.education, textRecord).filter(hasEntryText),
    skills: {
      textContent: text(sourceSkills.textContent),
      showRatings: sourceSkills.showRatings === true,
      ratings: contentEntries(sourceSkills.ratings, skill => ({
        ...textRecord(skill),
        name: text(skill.name),
        rating: Math.min(5, Math.max(1, Math.round(Number(skill.rating) || 1))),
      })).filter(skill => skill.name),
    },
    websites: contentEntries(state.websites, site => ({
      ...textRecord(site), addToHeader: site.addToHeader === true,
    })).filter(site => site.url),
    personalDetails,
    certifications: { content: text(record(state.certifications).content) },
    languages: contentEntries(state.languages, textRecord).filter(language => language.language),
    extraSections: { selected: stringList(sourceExtras.selected), custom },
    design,
  };
}

const GENERIC_RESUME_NAME = /^(?:(?:my|untitled)[\s_-]+)?resume(?:[\s_-]*\(\d+\))?$/i;
const WINDOWS_RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i;
// eslint-disable-next-line no-control-regex -- Filenames must not contain control or bidi-override characters.
const UNSAFE_FILENAME_CHARACTERS = /[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g;

function filenameStem(value) {
  let stem = text(value).normalize('NFC').replace(/(?:\.docx)+$/i, '')
    .replace(UNSAFE_FILENAME_CHARACTERS, '')
    .replace(/[^\p{L}\p{M}\p{N}._-]+/gu, '_')
    .replace(/_+/g, '_').replace(/^[_.-]+|[_.-]+$/g, '');
  stem = [...stem].slice(0, 100).join('').replace(/[_.-]+$/g, '');
  if (WINDOWS_RESERVED_NAME.test(stem)) stem = `Resume_${stem}`;
  return stem;
}

/** Meaningful user titles are retained; generic titles use the person's name. */
export function docxFilename(state, resumeName) {
  const contact = record(state?.contact);
  const fullName = [text(contact.firstName), text(contact.surname) || text(contact.lastName)].filter(Boolean).join(' ');
  const candidates = [text(resumeName), text(state?.meta?.name)]
    .map(value => value.replace(/(?:\.docx)+$/i, '').trim());
  const meaningfulName = candidates.find(value => value && !GENERIC_RESUME_NAME.test(value));
  const fallback = fullName ? filenameStem(`${fullName} Resume`) : 'Resume';
  return `${filenameStem(meaningfulName) || fallback || 'Resume'}.docx`;
}
