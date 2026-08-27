const PERSONAL_DICTIONARY_KEY = 'resumeBuilder_personalDictionary';
const QUALITY_IGNORES_KEY = 'resumeBuilder_qualityIgnores';

const TECHNICAL_TERMS = new Set([
  'api', 'apis', 'agile', 'angular', 'ansible', 'aws', 'azure', 'backend', 'bitbucket',
  'ci', 'cd', 'cicd', 'cloud', 'css', 'cypress', 'cybersecurity', 'dataops', 'database',
  'devops', 'docker', 'frontend', 'fullstack', 'git', 'github', 'gitlab', 'graphql', 'html',
  'javascript', 'jira', 'jmeter', 'json', 'kubernetes', 'linux', 'microservice', 'microservices',
  'mongodb', 'mysql', 'nodejs', 'onecve', 'oracle', 'playwright', 'postgresql', 'python',
  'react', 'restassured', 'salesforce', 'scrum', 'selenium', 'sql', 'testng', 'typescript',
  'ui', 'ux', 'webpack', 'xml', 'yaml', 'qa', 'saas', 'paas', 'iaas', 'kpi', 'kpis', 'okr',
  'okrs', 'sdk', 'sdks', 'oauth', 'sso', 'etl', 'ml', 'ai', 'llm', 'llms', 'ios', 'macos',
]);

const COMMON_MISSPELLINGS = Object.freeze({
  accomodate: 'accommodate', accomodated: 'accommodated', achived: 'achieved', automtion: 'automation',
  colaboration: 'collaboration', collaberation: 'collaboration', collabration: 'collaboration',
  communcation: 'communication', definately: 'definitely', developement: 'development',
  enviroment: 'environment', experiance: 'experience', implementated: 'implemented',
  inlcuded: 'included', maintainance: 'maintenance', managment: 'management', mangement: 'management',
  occured: 'occurred', profesional: 'professional', proffesional: 'professional', proces: 'process',
  qualty: 'quality', recieve: 'receive', recieved: 'received', relevent: 'relevant',
  requirments: 'requirements', responsiblity: 'responsibility', seperate: 'separate',
  stakehoder: 'stakeholder', strenghten: 'strengthen', sucessfully: 'successfully', teh: 'the',
  testng: 'testing', traceabilty: 'traceability', writting: 'writing',
});

const CATEGORY_WEIGHTS = Object.freeze({ spelling: 4, grammar: 3, style: 2, repetition: 3, consistency: 2, completeness: 4 });
const CATEGORY_LABELS = Object.freeze({
  spelling: 'Spelling', grammar: 'Grammar', style: 'Writing', repetition: 'Repetition',
  consistency: 'Consistency', completeness: 'Completeness',
});

function storage() {
  try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; }
}

function safeJsonList(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
  } catch { return []; }
}

export function textContent(value) {
  return String(value || '')
    .replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/p\s*>/gi, '\n').replace(/<\/li\s*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'").replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

function words(value) {
  const text = textContent(value);
  return text ? text.split(/\s+/).filter(Boolean) : [];
}

function hasRichContent(value) { return Boolean(textContent(value)); }

function normalizeWord(value) {
  return String(value || '').toLocaleLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function makeFinding({ id, category, level = 'tip', title, message, original = '', suggestions = [], start = -1, end = -1, field = {}, replaceable = Boolean(original && suggestions.length) }) {
  const fieldPath = field.fieldPath || '';
  const fingerprint = `${category}:${stableHash(`${fieldPath}|${start}|${original}|${title}`)}`;
  return {
    id: id || fingerprint, category, categoryLabel: CATEGORY_LABELS[category] || category, level, title, message,
    original, suggestions, start, end, replaceable, route: field.route || '', routeState: field.routeState || null,
    fieldId: field.fieldId || '', fieldPath, sectionId: field.sectionId || '', fingerprint, ignoreKey: fingerprint,
  };
}

function wordMatches(text) { return [...text.matchAll(/[\p{L}][\p{L}\p{M}'’-]*/gu)]; }

function casingLike(source, replacement) {
  if (source.toLocaleUpperCase() === source) return replacement.toLocaleUpperCase();
  if (source[0]?.toLocaleUpperCase() === source[0]) return replacement[0].toLocaleUpperCase() + replacement.slice(1);
  return replacement;
}

function sentenceFindings(text, field) {
  const findings = [];
  for (const match of text.matchAll(/\b([\p{L}]+)\s+\1\b/giu)) {
    findings.push(makeFinding({ category: 'grammar', level: 'recommended', title: 'Repeated word', message: `“${match[0]}” repeats the same word.`, original: match[0], suggestions: [match[1]], start: match.index, end: match.index + match[0].length, field }));
  }
  const weakPatterns = [
    { regex: /\bResponsible for testing\b/gi, replacement: 'Tested', title: 'Use a stronger action verb' },
    { regex: /\bResponsible for managing\b/gi, replacement: 'Managed', title: 'Use a stronger action verb' },
    { regex: /\bResponsible for developing\b/gi, replacement: 'Developed', title: 'Use a stronger action verb' },
    { regex: /\bWorked on testing (?:an? |the )?application\b/gi, replacement: 'Tested the application', title: 'Make the action direct' },
    { regex: /\bWorked on\b/gi, replacement: 'Contributed to', title: 'Use a more specific action phrase' },
    { regex: /\bHelped with\b/gi, replacement: 'Supported', title: 'Use a more direct action verb' },
  ];
  for (const pattern of weakPatterns) {
    for (const match of text.matchAll(pattern.regex)) {
      findings.push(makeFinding({ category: 'style', title: pattern.title, message: `“${match[0]}” can be more concise and achievement-focused.`, original: match[0], suggestions: [casingLike(match[0], pattern.replacement)], start: match.index, end: match.index + match[0].length, field }));
    }
  }
  for (const match of text.matchAll(/[^.!?\n]+[.!?]?/g)) {
    const sentence = match[0].trim();
    const count = words(sentence).length;
    if (count <= 35) continue;
    const offset = match.index + match[0].indexOf(sentence);
    findings.push(makeFinding({ category: 'style', title: 'Long sentence', message: `This sentence has ${count} words. Consider splitting it for faster scanning.`, original: sentence, start: offset, end: offset + sentence.length, field, replaceable: false }));
  }
  const articleMatch = /\btesting application\b/i.exec(text);
  if (articleMatch) findings.push(makeFinding({ category: 'grammar', title: 'Possible missing article', message: 'Consider “testing the application” when referring to a specific application.', original: articleMatch[0], suggestions: ['testing the application'], start: articleMatch.index, end: articleMatch.index + articleMatch[0].length, field }));
  for (const match of text.matchAll(/(?:,{2,}|!{2,}|\?{2,}|\.{4,})/g)) {
    const replacement = match[0][0];
    findings.push(makeFinding({ category: 'grammar', title: 'Repeated punctuation', message: `“${match[0]}” is likely accidental.`, original: match[0], suggestions: [replacement], start: match.index, end: match.index + match[0].length, field }));
  }
  for (const pattern of [
    { regex: /\b(he|she|it)\s+were\b/gi, verb: 'was' },
    { regex: /\b(they|we|you)\s+was\b/gi, verb: 'were' },
  ]) {
    for (const match of text.matchAll(pattern.regex)) {
      findings.push(makeFinding({ category: 'grammar', title: 'Possible subject-verb disagreement', message: 'Check whether the subject and verb agree.', original: match[0], suggestions: [`${match[1]} ${pattern.verb}`], start: match.index, end: match.index + match[0].length, field }));
    }
  }
  for (const match of text.matchAll(/(?:^|[.!?]\s+)([a-z][\p{L}\p{M}'’-]*)/gu)) {
    const original = match[1];
    if (TECHNICAL_TERMS.has(normalizeWord(original))) continue;
    const start = match.index + match[0].lastIndexOf(original);
    findings.push(makeFinding({ category: 'grammar', title: 'Sentence starts with a lowercase word', message: 'Resume sentences and bullets usually start with a capital letter.', original, suggestions: [original[0].toLocaleUpperCase() + original.slice(1)], start, end: start + original.length, field }));
  }
  return findings;
}

export function analyzeTextQuality(value, options = {}) {
  const text = options.plainText ? String(value || '') : textContent(value);
  if (!text) return [];
  const field = options.field || {};
  const personalWords = new Set([...getPersonalDictionary(), ...(options.personalDictionary || []), ...(options.dictionary || [])].map(normalizeWord));
  const ignoredWords = new Set([...(options.ignoredWords || [])].map(normalizeWord));
  const findings = [];
  for (const match of wordMatches(text)) {
    const original = match[0];
    const normalized = normalizeWord(original);
    const suggestion = COMMON_MISSPELLINGS[normalized];
    if (!suggestion || TECHNICAL_TERMS.has(normalized) || personalWords.has(normalized) || ignoredWords.has(normalized)) continue;
    findings.push(makeFinding({ category: 'spelling', level: 'recommended', title: 'Possible spelling error', message: `Check “${original}”.`, original, suggestions: [casingLike(original, suggestion)], start: match.index, end: match.index + original.length, field }));
  }
  for (const match of text.matchAll(/(?:â€™|â€˜|â€œ|â€|â€“|â€”|ï¿½|�)/g)) {
    const replacements = { 'â€™': '’', 'â€˜': '‘', 'â€œ': '“', 'â€': '”', 'â€“': '–', 'â€”': '—', 'ï¿½': '', '�': '' };
    findings.push(makeFinding({ category: 'spelling', level: 'required', title: 'Broken character encoding', message: 'This text appears to contain a damaged quote, dash, or Unicode character.', original: match[0], suggestions: [replacements[match[0]]], start: match.index, end: match.index + match[0].length, field }));
  }
  findings.push(...sentenceFindings(text, field));
  return findings.filter((finding) => {
    if (options.ignoredFingerprints?.has?.(finding.fingerprint)) return false;
    return !(Array.isArray(options.ignoredFingerprints) && options.ignoredFingerprints.includes(finding.fingerprint));
  });
}

function fieldDescriptor(fieldPath, fieldId, route, sectionId, routeState = null) { return { fieldPath, fieldId, route, sectionId, routeState }; }

function collectQualityFields(state) {
  const fields = [{ value: state?.summary?.content, field: fieldDescriptor('summary.content', 'summary-content', 'summary-editor', 'summary') }];
  (state?.workHistory || []).forEach((entry, index) => fields.push({ value: entry.description, field: fieldDescriptor(`workHistory.${index}.description`, `work-description-${entry.id || index}`, 'work-editor', 'workHistory', { workId: entry.id, focusField: `work-description-${entry.id || index}` }) }));
  (state?.education || []).forEach((entry, index) => fields.push({ value: entry.coursework, field: fieldDescriptor(`education.${index}.coursework`, `education-coursework-${entry.id || index}`, 'education-form', 'education', { educationId: entry.id, focusField: `education-coursework-${entry.id || index}` }) }));
  fields.push({ value: state?.skills?.textContent, field: fieldDescriptor('skills.textContent', 'skills-content', 'skills-editor', 'skills') });
  fields.push({ value: state?.certifications?.content, field: fieldDescriptor('certifications.content', 'certifications-content', 'certifications', 'certifications') });
  (state?.extraSections?.custom || []).forEach((section, index) => fields.push({ value: section.content, field: fieldDescriptor(`extraSections.custom.${index}.content`, `custom-section-content-${section.id || index}`, 'custom-sections', section.id, { customSectionId: section.id, focusField: `custom-section-content-${section.id || index}` }) }));
  return fields.filter(item => hasRichContent(item.value));
}

function completenessFindings(state) {
  const contact = state?.contact || {};
  const workHistory = Array.isArray(state?.workHistory) ? state.workHistory : [];
  const education = Array.isArray(state?.education) ? state.education : [];
  const custom = Array.isArray(state?.extraSections?.custom) ? state.extraSections.custom : [];
  const skillText = textContent(state?.skills?.textContent);
  const ratedSkills = Array.isArray(state?.skills?.ratings) ? state.skills.ratings.filter(skill => textContent(skill?.name)) : [];
  const summaryWords = words(state?.summary?.content);
  const findings = [];
  const add = finding => findings.push(makeFinding({ category: 'completeness', replaceable: false, ...finding }));
  if (!textContent(contact.firstName) && !textContent(contact.surname)) add({ id: 'name', level: 'required', title: 'Add your name', message: 'Recruiters need a clear identity at the top of your resume.', field: fieldDescriptor('contact.firstName', 'contact-first-name', 'contact', '') });
  if (!textContent(contact.email)) add({ id: 'email', level: 'required', title: 'Add an email address', message: 'Include a professional email so employers can contact you.', field: fieldDescriptor('contact.email', 'contact-email', 'contact', '') });
  if (!hasRichContent(state?.summary?.content)) add({ id: 'summary', level: 'recommended', title: 'Add a professional summary', message: 'A short summary makes the resume easier to scan.', field: fieldDescriptor('summary.content', 'summary-content', 'summary-editor', 'summary') });
  else if (summaryWords.length > 90) add({ id: 'summary-length', level: 'tip', title: 'Shorten the summary', message: `It has ${summaryWords.length} words; aim for a concise opening.`, field: fieldDescriptor('summary.content', 'summary-content', 'summary-editor', 'summary') });
  if (!workHistory.length) add({ id: 'experience', level: 'recommended', title: 'Add work experience', message: 'Use internships, freelance work, or relevant projects if you are early career.', field: fieldDescriptor('workHistory', '', 'work-history', 'workHistory') });
  else workHistory.forEach((entry, index) => {
    if (!hasRichContent(entry?.description)) add({ id: `experience-bullets-${entry?.id || index}`, level: 'recommended', title: 'Add experience details', message: `${entry?.jobTitle || 'This experience entry'} has no achievement bullets or description.`, field: fieldDescriptor(`workHistory.${index}.description`, `work-description-${entry?.id || index}`, 'work-editor', 'workHistory', { workId: entry?.id }) });
    if (!textContent(entry?.startDate) && !textContent(entry?.endDate) && !entry?.currentJob) add({ id: `experience-dates-${entry?.id || index}`, level: 'tip', title: 'Add experience dates', message: `${entry?.jobTitle || 'This experience entry'} does not include dates.`, field: fieldDescriptor(`workHistory.${index}.startDate`, `work-start-${entry?.id || index}`, 'work-summary', 'workHistory', { workId: entry?.id }) });
  });
  if (!education.length) add({ id: 'education', level: 'tip', title: 'Add education', message: 'Include your most relevant qualification.', field: fieldDescriptor('education', '', 'education', 'education') });
  if (!skillText && !ratedSkills.length) add({ id: 'skills', level: 'recommended', title: 'Add relevant skills', message: 'List role-specific skills to help recruiters scan your fit.', field: fieldDescriptor('skills.textContent', 'skills-content', 'skills-editor', 'skills') });
  custom.forEach((section, index) => {
    if (!hasRichContent(section?.content)) add({ id: `empty-${section?.id || index}`, level: 'tip', title: `Complete ${textContent(section?.title) || 'this custom section'}`, message: 'Remove empty sections or add useful, role-relevant content.', field: fieldDescriptor(`extraSections.custom.${index}.content`, `custom-section-content-${section?.id || index}`, 'custom-sections', section?.id, { customSectionId: section?.id }) });
  });
  return findings;
}

function normalizedBullet(value) { return textContent(value).toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim(); }

function extractBullets(html) {
  const listItems = [...String(html || '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(match => textContent(match[1])).filter(Boolean);
  return listItems.length ? listItems : textContent(html).split(/\n|(?<=[.!?])\s+/).map(item => item.trim()).filter(Boolean);
}

function crossFieldFindings(state, fields) {
  const findings = [];
  const bulletIndex = new Map();
  const openingVerbs = new Map();
  const bulletPunctuation = [];
  for (const { value, field } of fields.filter(item => item.field.sectionId === 'workHistory' || String(item.field.sectionId).startsWith('custom-') || ['projects', 'achievements', 'awards'].includes(item.field.sectionId))) {
    for (const bullet of extractBullets(value)) {
      const normalized = normalizedBullet(bullet);
      if (normalized.length < 24) continue;
      if (bulletIndex.has(normalized)) findings.push(makeFinding({ category: 'repetition', level: 'recommended', title: 'Duplicate bullet', message: 'A nearly identical responsibility appears elsewhere. Make this accomplishment more specific.', original: bullet, field, replaceable: false }));
      else bulletIndex.set(normalized, field.fieldPath);
      const firstWord = normalizeWord(bullet.split(/\s+/)[0]);
      if (firstWord) openingVerbs.set(firstWord, [...(openingVerbs.get(firstWord) || []), { bullet, field }]);
      bulletPunctuation.push({ bullet, field, punctuated: /[.!?]$/.test(bullet.trim()) });
    }
  }
  for (const [verb, uses] of openingVerbs) {
    if (uses.length < 3) continue;
    const alternatives = ['Led', 'Delivered', 'Improved', 'Designed', 'Implemented', 'Validated'].filter(word => normalizeWord(word) !== verb);
    const target = uses[2];
    findings.push(makeFinding({ category: 'repetition', title: `Repeated opening verb: ${target.bullet.split(/\s+/)[0]}`, message: `This opening verb appears ${uses.length} times. Vary it where the meaning supports a stronger alternative.`, original: target.bullet.split(/\s+/)[0], suggestions: alternatives.slice(0, 3), field: target.field }));
  }
  const punctuatedCount = bulletPunctuation.filter(item => item.punctuated).length;
  if (bulletPunctuation.length >= 3 && punctuatedCount > 0 && punctuatedCount < bulletPunctuation.length) {
    const preferPunctuation = punctuatedCount > bulletPunctuation.length / 2;
    const target = bulletPunctuation.find(item => item.punctuated !== preferPunctuation);
    const original = target.bullet.trim();
    const suggestion = preferPunctuation ? `${original}.` : original.replace(/[.!?]+$/, '');
    findings.push(makeFinding({
      category: 'consistency',
      title: 'Inconsistent bullet punctuation',
      message: preferPunctuation ? 'Most bullets end with punctuation. Use the same style here.' : 'Most bullets omit ending punctuation. Use the same style here.',
      original,
      suggestions: [suggestion],
      field: target.field,
    }));
  }
  const dateValues = (state?.workHistory || []).flatMap((entry, index) => [{ value: entry.startDate, path: `workHistory.${index}.startDate`, entry }, { value: entry.endDate, path: `workHistory.${index}.endDate`, entry }]).filter(item => (
    item.value && !/^(present|current|now)$/i.test(String(item.value).trim())
  ));
  const dateStyle = value => /^\d{4}-\d{2}$/.test(value) ? 'ISO month' : /^\d{1,2}[/-]\d{4}$/.test(value) ? 'numeric month' : /[A-Za-z]/.test(value) ? 'written month' : 'other';
  const styles = new Set(dateValues.map(item => dateStyle(String(item.value))));
  if (styles.size > 1) {
    const target = dateValues.find(item => dateStyle(String(item.value)) !== dateStyle(String(dateValues[0].value))) || dateValues[0];
    findings.push(makeFinding({ category: 'consistency', title: 'Mixed date formats', message: `Your experience dates use ${[...styles].join(' and ')} styles. Choose one format throughout.`, original: String(target.value), field: fieldDescriptor(target.path, `work-date-${target.entry?.id || ''}`, 'work-summary', 'workHistory', { workId: target.entry?.id }), replaceable: false }));
  }
  const titleGroups = new Map();
  (state?.workHistory || []).forEach((entry, index) => {
    const title = textContent(entry.jobTitle);
    if (!title) return;
    const key = title.toLocaleLowerCase();
    titleGroups.set(key, [...(titleGroups.get(key) || []), { title, entry, index }]);
  });
  for (const variants of titleGroups.values()) {
    if (new Set(variants.map(item => item.title)).size < 2) continue;
    const target = variants[variants.length - 1];
    findings.push(makeFinding({ category: 'consistency', title: 'Inconsistent capitalization', message: `The same job title appears with different capitalization: ${variants.map(item => `“${item.title}”`).join(', ')}.`, original: target.title, suggestions: [variants[0].title], field: fieldDescriptor(`workHistory.${target.index}.jobTitle`, `work-title-${target.entry?.id || target.index}`, 'work-summary', 'workHistory', { workId: target.entry?.id }) }));
  }
  return findings;
}

function ignoredSet(options = {}) {
  if (options.ignoredFingerprints instanceof Set) return options.ignoredFingerprints;
  if (Array.isArray(options.ignoredFingerprints)) return new Set(options.ignoredFingerprints);
  if (options.ignoreState instanceof Set) return options.ignoreState;
  if (Array.isArray(options.ignoreState)) return new Set(options.ignoreState);
  return new Set(loadQualityIgnores());
}

export function getResumeQualityReport(state, options = {}) {
  const fields = collectQualityFields(state || {});
  const ignored = ignoredSet(options);
  const candidates = [...completenessFindings(state || {}), ...fields.flatMap(item => analyzeTextQuality(item.value, { ...options, field: item.field, ignoredFingerprints: null })), ...crossFieldFindings(state || {}, fields)];
  const seen = new Set();
  const findings = candidates.filter((finding) => {
    if (ignored.has(finding.fingerprint) || seen.has(finding.fingerprint)) return false;
    seen.add(finding.fingerprint);
    return true;
  });
  const counts = Object.fromEntries(Object.keys(CATEGORY_LABELS).map(category => [category, findings.filter(item => item.category === category).length]));
  const penalty = findings.reduce((sum, finding) => sum + (CATEGORY_WEIGHTS[finding.category] || 1), 0);
  return { findings, counts, score: Math.max(0, 100 - Math.min(60, penalty)), total: findings.length, unresolved: findings.length, disclaimer: 'This quality score is a transparent writing aid, not an ATS ranking or hiring guarantee.' };
}

export function getResumeQualityReview(state, options = {}) { return getResumeQualityReport(state, options).findings; }
export function getPersonalDictionary() { return safeJsonList(storage()?.getItem(PERSONAL_DICTIONARY_KEY)).map(normalizeWord).filter(Boolean); }
export function addToPersonalDictionary(word) {
  const normalized = normalizeWord(word);
  if (!normalized) return getPersonalDictionary();
  const next = [...new Set([...getPersonalDictionary(), normalized])].sort();
  storage()?.setItem(PERSONAL_DICTIONARY_KEY, JSON.stringify(next));
  return next;
}
export function removeFromPersonalDictionary(word) {
  const normalized = normalizeWord(word);
  const next = getPersonalDictionary().filter(item => item !== normalized);
  storage()?.setItem(PERSONAL_DICTIONARY_KEY, JSON.stringify(next));
  return next;
}
export function clearPersonalDictionary() { storage()?.removeItem(PERSONAL_DICTIONARY_KEY); }
export function createQualityIgnoreState(values = []) { return new Set(Array.isArray(values) ? values : values instanceof Set ? [...values] : []); }
export function ignoreQualityFinding(ignoreState, finding) { const next = createQualityIgnoreState(ignoreState); if (finding?.fingerprint) next.add(finding.fingerprint); return next; }
export function isQualityFindingIgnored(ignoreState, finding) { return createQualityIgnoreState(ignoreState).has(finding?.fingerprint); }
export function loadQualityIgnores() { return safeJsonList(storage()?.getItem(QUALITY_IGNORES_KEY)); }
export function saveQualityIgnore(finding) {
  if (!finding?.fingerprint) return loadQualityIgnores();
  const next = [...new Set([...loadQualityIgnores(), finding.fingerprint])];
  storage()?.setItem(QUALITY_IGNORES_KEY, JSON.stringify(next));
  return next;
}
export function clearQualityIgnores() { storage()?.removeItem(QUALITY_IGNORES_KEY); }

function parseFieldPath(fieldPath) { return String(fieldPath || '').split('.').filter(Boolean).map(part => /^\d+$/.test(part) ? Number(part) : part); }
function replaceOccurrence(value, original, replacement, occurrence = 0) {
  const source = String(value || '');
  const sourceLower = source.toLocaleLowerCase();
  const originalLower = String(original || '').toLocaleLowerCase();
  let index = -1;
  let from = 0;
  for (let count = 0; count <= occurrence; count += 1) {
    index = sourceLower.indexOf(originalLower, from);
    if (index < 0) break;
    from = index + originalLower.length;
  }
  return index < 0 ? source : source.slice(0, index) + replacement + source.slice(index + String(original).length);
}

export function replaceIssueInResume(state, finding, replacement) {
  if (!state || !finding?.fieldPath || !finding.original || typeof replacement !== 'string') return state;
  const path = parseFieldPath(finding.fieldPath);
  if (!path.length) return state;
  const cloneBranch = (value, depth = 0) => {
    const key = path[depth];
    if (depth === path.length - 1) {
      const current = value?.[key];
      if (typeof current !== 'string') return value;
      const textBeforeIssue = finding.start >= 0 ? textContent(current).slice(0, finding.start).toLocaleLowerCase() : '';
      const originalLower = String(finding.original).toLocaleLowerCase();
      const occurrence = originalLower ? textBeforeIssue.split(originalLower).length - 1 : 0;
      const nextValue = replaceOccurrence(current, finding.original, replacement, occurrence);
      if (nextValue === current) return value;
      if (Array.isArray(value)) { const next = [...value]; next[key] = nextValue; return next; }
      return { ...value, [key]: nextValue };
    }
    if (value == null || value[key] == null) return value;
    const nextChild = cloneBranch(value[key], depth + 1);
    if (nextChild === value[key]) return value;
    if (Array.isArray(value)) { const next = [...value]; next[key] = nextChild; return next; }
    return { ...value, [key]: nextChild };
  };
  return cloneBranch(state);
}

export function buildIssueAction(finding, replacement = finding?.suggestions?.[0]) { return { type: 'APPLY_QUALITY_FIX', payload: { finding, replacement } }; }
