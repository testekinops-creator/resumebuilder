/**
 * Resume ingestion normalizes PDF, DOCX and TXT extraction into the same
 * editable builder model. It deliberately classifies a section before it
 * extracts fields from it: uncertain data is flagged or kept as a custom
 * section instead of being forced into an unrelated form control.
 */

export const SECTION_ONTOLOGY = Object.freeze([
  {
    type: 'contact',
    aliases: [
      'contact', 'contact details', 'contact information', 'personal information', 'personal details',
    ],
    cues: ['contact', 'personal details'],
  },
  {
    type: 'summary',
    aliases: [
      'summary', 'professional summary', 'career summary', 'profile', 'professional profile',
      'career profile', 'about me', 'about', 'personal profile', 'executive profile', 'career objective',
      'objective', 'professional objective', 'introduction', 'overview',
    ],
    cues: ['summary', 'profile', 'objective', 'overview', 'about'],
  },
  {
    type: 'experience',
    aliases: [
      'experience', 'work experience', 'work history', 'employment history', 'professional experience',
      'career history', 'career experience', 'employment experience', 'professional background',
      'work background', 'experience summary', 'relevant experience', 'industry experience', 'my career journey', "where i've worked",
    ],
    cues: ['experience', 'work', 'employment', 'career', 'worked', 'journey'],
  },
  {
    type: 'education',
    aliases: [
      'education', 'academic background', 'academic qualifications', 'educational qualifications',
      'educational background', 'qualifications', 'academics', 'academic history', 'education and training',
      'education details', 'academic journey',
    ],
    cues: ['education', 'academic', 'academics', 'qualification', 'school'],
  },
  {
    type: 'skills',
    aliases: [
      'skills', 'technical skills', 'core skills', 'key skills', 'core competencies', 'key competencies',
      'technical competencies', 'areas of expertise', 'expertise', 'proficiencies', 'technical proficiencies',
      'technologies', 'tools and technologies', 'tech stack', 'technical toolkit', 'capabilities', 'strengths',
      'skills and core competencies', 'my toolbox', 'tech i work with', 'what i do best',
    ],
    cues: ['skill', 'competenc', 'expertise', 'proficien', 'technolog', 'toolbox', 'toolkit', 'strength'],
    needsContentEvidence: true,
  },
  {
    type: 'certifications',
    aliases: [
      'certifications', 'certificates', 'certification', 'professional certifications',
      'licenses and certifications', 'licenses', 'training and certifications', 'courses and certifications',
      'courses', 'professional training', 'trainings', 'certificates and learning',
    ],
    cues: ['certif', 'license', 'course', 'training', 'learning'],
  },
  {
    type: 'languages',
    aliases: ['languages', 'language skills', 'language proficiency', 'languages known', 'linguistic skills'],
    cues: ['language', 'linguistic'],
    needsContentEvidence: true,
  },
]);

const CUSTOM_SECTION_ONTOLOGY = Object.freeze([
  { id: 'projects', aliases: ['projects', 'project experience', 'key projects', 'selected projects', 'academic projects', 'personal projects', 'professional projects', 'notable projects', 'project portfolio'], cues: ['project', 'portfolio'] },
  { id: 'awards', aliases: ['awards', 'honors', 'honours', 'honors and awards', 'awards and achievements', 'recognition'], cues: ['award', 'honor', 'honour', 'recognition'] },
  { id: 'achievements', aliases: ['achievements', 'accomplishments', 'career achievements', 'professional achievements'], cues: ['achievement', 'accomplishment'] },
  { id: 'publications', aliases: ['publications', 'research publications', 'papers', 'research papers', 'selected publications', 'journal publications', 'conference publications'], cues: ['publication', 'paper', 'journal'] },
  { id: 'custom-volunteer-experience', aliases: ['volunteer experience', 'volunteer work', 'volunteering'], cues: ['volunteer'] },
  { id: 'custom-leadership', aliases: ['leadership', 'leadership experience'], cues: ['leadership'] },
  { id: 'custom-open-source', aliases: ['open source', 'open source contributions'], cues: ['open source'] },
  { id: 'custom-patents', aliases: ['patents'], cues: ['patent'] },
  { id: 'custom-conferences', aliases: ['conferences', 'workshops'], cues: ['conference', 'workshop'] },
  { id: 'affiliations', aliases: ['memberships', 'professional memberships', 'associations', 'affiliations', 'professional affiliations'], cues: ['membership', 'association', 'affiliation'] },
  { id: 'custom-interests', aliases: ['interests', 'hobbies', 'extracurricular activities', 'activities'], cues: ['interest', 'hobby', 'extracurricular'] },
  { id: 'custom-references', aliases: ['references'], cues: ['reference'] },
  { id: 'additionalInfo', aliases: ['additional information', 'declaration'], cues: ['additional information', 'declaration'] },
]);

const BULLET_PATTERN = /^(?:(?:\u2022|\u00b7|\u25e6|\u25aa|\u25cf|â€¢|â—|â–ª)|[-*â€“])\s+|^\d+[.)]\s+/;
const EMAIL_PATTERN = /[\w.+-]+\s*@\s*[\w-]+(?:\s*\.\s*[\w-]+)+/g;
const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s|,]+|(?:linkedin\.com|github\.com)\/[^\s|,]+/ig;
const MONTH_NAMES = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const YEAR = '(?:19|20)\\d{2}';
const DATE_TOKEN_SOURCE = `(?:${MONTH_NAMES}\\s+${YEAR}|${YEAR}[-/.](?:1[0-2]|0?[1-9])|(?:1[0-2]|0?[1-9])[-/.]${YEAR}|${YEAR})`;
const DATE_TOKEN_PATTERN = new RegExp(DATE_TOKEN_SOURCE, 'ig');
const DATE_RANGE_PATTERN = new RegExp(`(${DATE_TOKEN_SOURCE})\\s*(?:-|â€“|â€”|to)\\s*((?:${DATE_TOKEN_SOURCE})|present|current|now)`, 'ig');
const ISO_DATE_RANGE_PATTERN = /\b((?:19|20)\d{2})[-/.](1[0-2]|0?[1-9])\s*(?:-|–|—|to)\s*((?:(?:19|20)\d{2})[-/.](?:1[0-2]|0?[1-9])|present|current|now)\b/i;
const NUMERIC_DATE_RANGE_PATTERN = /\b(1[0-2]|0?[1-9])[-/.]((?:19|20)\d{2})\s*(?:-|–|—|to)\s*((?:1[0-2]|0?[1-9])[-/.](?:19|20)\d{2}|present|current|now)\b/i;
const DEGREE_PATTERN = /\b(?:b\.?e\.?|b\.?tech\.?|b\.?sc\.?|bachelor|master|m\.?sc\.?|m\.?tech\.?|mba|associate|diploma|ph\.?d\.?|doctor(?:ate)?|j\.?d\.?|high school|secondary school|12th(?:\s+grade)?|10th(?:\s+grade)?|grade\s*1[0-2])\b/i;
const GPA_PATTERN = /\b(?:c?gpa|gpa|percentage|grade|score)\s*[:=-]?\s*(?:\d+(?:\.\d+)?\s*\/?\s*\d*|\d+(?:\.\d+)?%|[A-F][+-]?)\b/i;
const PRESENT_PATTERN = /^(?:present|current|now)$/i;
const KNOWN_LANGUAGE_NAMES = new Set([
  'afrikaans', 'arabic', 'bengali', 'bulgarian', 'cantonese', 'chinese', 'croatian', 'czech', 'danish', 'dutch',
  'english', 'finnish', 'french', 'german', 'greek', 'gujarati', 'hebrew', 'hindi', 'hungarian', 'indonesian',
  'italian', 'japanese', 'kannada', 'korean', 'malayalam', 'mandarin', 'marathi', 'nepali', 'norwegian', 'persian',
  'polish', 'portuguese', 'punjabi', 'romanian', 'russian', 'serbian', 'slovak', 'spanish', 'swedish', 'tamil',
  'telugu', 'thai', 'tulu', 'turkish', 'ukrainian', 'urdu', 'vietnamese',
]);
// Common empty prompts in downloaded/template DOCX files are not candidate
// content. Importing them as a certification or custom section is more
// misleading than leaving that optional section empty.
const TEMPLATE_PLACEHOLDER_PATTERN = /^(?:add|enter|include|list|provide)\s+(?:any\s+)?(?:professional\s+)?(?:certifications?|licenses?|training|courses?|details?|information|content)(?:[,\s].*)?$/i;

function cleanLine(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/â€¢/g, '•')
    .replace(/â€“|â€”/g, '–')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeImportHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeHeader(value) {
  return cleanLine(value)
    .replace(/^[#\-\u2022*\s]+/, '')
    .replace(/[:â€”â€“-]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonical(value) {
  return normalizeHeader(value).replace(/\s*&\s*/g, ' and ').toLowerCase();
}

function tokens(value) {
  return canonical(value).split(/[^a-z0-9]+/).filter(Boolean);
}

function tokenSimilarity(first, second) {
  const left = new Set(tokens(first));
  const right = new Set(tokens(second));
  if (!left.size || !right.size) return 0;
  const matches = [...left].filter(token => right.has(token)).length;
  return matches / Math.max(left.size, right.size);
}

function isBullet(value) {
  return BULLET_PATTERN.test(cleanLine(value));
}

function stripBullet(value) {
  return cleanLine(value).replace(BULLET_PATTERN, '').trim();
}

function isHeadingLike(value, allowTitleCase = true) {
  const raw = cleanLine(value);
  const words = raw.split(/\s+/).filter(Boolean);
  if (!raw || words.length > 9 || raw.length > 75 || /[.!?@]/.test(raw) || /^https?:\/\//i.test(raw)) return false;
  if (isBullet(raw) || DATE_RANGE_PATTERN.test(raw)) {
    DATE_RANGE_PATTERN.lastIndex = 0;
    return false;
  }
  DATE_RANGE_PATTERN.lastIndex = 0;
  const unadorned = normalizeHeader(raw);
  const letters = unadorned.replace(/[^a-z]/gi, '');
  const uppercase = letters && letters === letters.toUpperCase();
  const titleCase = allowTitleCase && words.length <= 5 && words.every(word => /^[A-Z][A-Za-z&/-]*$/.test(word));
  return Boolean(uppercase || titleCase || /:\s*$/.test(raw));
}

function contentEvidence(type, nextLines = []) {
  const sample = nextLines.slice(0, 6).map(line => cleanLine(line.text || line)).filter(Boolean);
  if (!sample.length) return 0;
  const joined = sample.join(' | ');
  if (type === 'skills') {
    const listish = sample.filter(line => isBullet(line) || /[,;|]/.test(line) || /^\w+(?:\s+\w+){0,2}$/.test(line)).length;
    return listish / sample.length;
  }
  if (type === 'languages') {
    const languageWords = /\b(?:english|hindi|kannada|tulu|spanish|french|german|arabic|portuguese|mandarin|japanese|fluent|native|b[1-2]|c[1-2])\b/i;
    return languageWords.test(joined) ? 0.9 : 0.25;
  }
  if (type === 'education') return DEGREE_PATTERN.test(joined) || GPA_PATTERN.test(joined) ? 0.9 : 0.35;
  if (type === 'experience') return DATE_RANGE_PATTERN.test(joined) ? 0.9 : 0.35;
  DATE_RANGE_PATTERN.lastIndex = 0;
  return 0.6;
}

function ontologyMatch(header, nextLines) {
  const label = canonical(header);
  const allTypes = [
    ...SECTION_ONTOLOGY.map(item => ({ ...item, custom: false })),
    ...CUSTOM_SECTION_ONTOLOGY.map(item => ({ ...item, type: 'custom', custom: true })),
  ];

  for (const item of allTypes) {
    if (item.aliases.some(alias => canonical(alias) === label)) {
      const evidence = contentEvidence(item.type === 'custom' ? item.id : item.type, nextLines);
      if (item.needsContentEvidence && evidence < 0.45) return null;
      return {
        type: item.type,
        id: item.custom ? item.id : undefined,
        canonicalType: item.custom ? item.id : item.type,
        confidence: item.needsContentEvidence ? 0.9 : 0.99,
        strategy: 'exact-alias',
      };
    }
  }

  if (!isHeadingLike(header)) return null;
  let best = null;
  for (const item of allTypes) {
    const aliasScore = Math.max(...item.aliases.map(alias => tokenSimilarity(label, alias)));
    const cueScore = Math.max(0, ...item.cues.map(cue => label.includes(cue) ? 0.78 : 0));
    const score = Math.max(aliasScore, cueScore);
    if (!best || score > best.score) best = { item, score };
  }

  if (!best || best.score < 0.72) return null;
  const evidence = contentEvidence(best.item.type === 'custom' ? best.item.id : best.item.type, nextLines);
  if ((best.item.needsContentEvidence || best.score < 0.8) && evidence < 0.45) return null;
  return {
    type: best.item.type,
    id: best.item.custom ? best.item.id : undefined,
    canonicalType: best.item.custom ? best.item.id : best.item.type,
    confidence: Math.min(0.88, Number((best.score * 0.78 + evidence * 0.22).toFixed(2))),
    strategy: 'semantic-heading',
  };
}

/** Classifies a plausible heading without assigning any field values. */
export function classifySectionHeading(value, nextLines = []) {
  // A list item may contain words such as "certificate" or "experience";
  // it is content within the current section, never a new section heading.
  if (isBullet(value)) return null;
  const originalTitle = normalizeHeader(value);
  if (!originalTitle) return null;
  const known = ontologyMatch(originalTitle, nextLines);
  if (known) return { ...known, originalTitle };
  if (!isHeadingLike(value, false)) return null;
  return {
    type: 'custom',
    canonicalType: 'custom',
    confidence: 0.6,
    strategy: 'preserved-unknown-heading',
    originalTitle,
  };
}

function unique(values, limit = Infinity) {
  const seen = new Set();
  return values.filter(value => {
    const normalized = cleanLine(value);
    const key = normalized.toLocaleLowerCase();
    if (!normalized || seen.has(key) || seen.size >= limit) return false;
    seen.add(key);
    return true;
  });
}

function pageLinesFromText(text) {
  const pages = String(text || '').replace(/\r/g, '').split('\f');
  const rawPages = pages.map(page => page.split('\n').map(cleanLine).filter(Boolean));
  const furnitureCounts = new Map();
  rawPages.forEach(page => {
    const candidates = [...page.slice(0, 3), ...page.slice(-3)].filter(line => line.length > 1 && line.length < 100);
    new Set(candidates.map(canonical)).forEach(line => furnitureCounts.set(line, (furnitureCounts.get(line) || 0) + 1));
  });
  const repeatedFurniture = new Set([...furnitureCounts].filter(([, count]) => count >= 2).map(([line]) => line));
  return rawPages.flatMap((page, pageIndex) => page
    // Keep the first instance: it can be the candidate's contact header. Only
    // remove repeated furniture from later pages so it cannot become content
    // or duplicate a name/contact record.
    .filter(line => pageIndex === 0 || !repeatedFurniture.has(canonical(line)))
    .map((textLine, lineIndex) => ({
      text: textLine,
      page: pageIndex + 1,
      blockId: `p${pageIndex + 1}-b${lineIndex + 1}`,
    })));
}

/**
 * Produces classified content segments. Consecutive pages remain in the same
 * segment until a new heading appears, so section continuation is preserved.
 */
export function segmentResumeSections(text) {
  const lines = pageLinesFromText(text);
  const segments = [];
  let current = { type: 'unsectioned', canonicalType: 'unsectioned', originalTitle: '', lines: [] };
  segments.push(current);
  const diagnostics = [];

  lines.forEach((line, index) => {
    const nextLines = lines.slice(index + 1, index + 7);
    // Candidate names are commonly uppercase and visually resemble a heading.
    // If the top block contains contact evidence, it is a header, not an
    // unknown custom section.
    const isCandidateNameHeader = index === 0 && nextLines.some(next => EMAIL_PATTERN.test(next.text) || /(?:\+?\d[\d()\s.-]{5,}\d)/.test(next.text));
    EMAIL_PATTERN.lastIndex = 0;
    let classification = isCandidateNameHeader ? null : classifySectionHeading(line.text, nextLines);
    // A role title can look like an unknown title-cased heading. Inside an
    // Experience section, a following date range is stronger evidence that it
    // begins another job than that it starts a custom section.
    if (classification?.strategy === 'preserved-unknown-heading'
      && current.type === 'experience'
      && nextLines.slice(0, 3).some(next => parseDateRange(next.text))) {
      classification = null;
    }
    if (classification) {
      current = { ...classification, lines: [] };
      segments.push(current);
      diagnostics.push({
        kind: 'section',
        originalTitle: classification.originalTitle,
        canonicalType: classification.canonicalType,
        confidence: classification.confidence,
        strategy: classification.strategy,
        source: { page: line.page, blockId: line.blockId },
      });
    } else {
      current.lines.push(line);
    }
  });

  return { lines, segments: segments.filter(segment => segment.type !== 'unsectioned' || segment.lines.length), diagnostics };
}

function sectionLines(segments, type) {
  return segments.filter(segment => segment.type === type).flatMap(segment => segment.lines);
}

function interleavedExperienceContinuations(segments) {
  return segments
    .filter(segment => ['skills', 'languages'].includes(segment.type))
    .flatMap(segment => {
      const start = segment.lines.findIndex((line, index) => (
        isLikelyEntryTitle(line) && segment.lines.slice(index + 1, index + 4).some(next => parseDateRange(next.text))
      ));
      return start >= 0 ? segment.lines.slice(start) : [];
    });
}

function textLines(lines) {
  return lines
    .map(line => cleanLine(line.text || line))
    .filter(line => line && !TEMPLATE_PLACEHOLDER_PATTERN.test(line));
}

function paragraphHtml(lines) {
  const text = textLines(lines).join(' ').trim();
  return text ? `<p>${escapeImportHtml(text)}</p>` : '';
}

function structuredHtml(lines) {
  const chunks = [];
  let paragraphs = [];
  let bullets = [];
  const flushParagraphs = () => {
    if (paragraphs.length) chunks.push(`<p>${escapeImportHtml(paragraphs.join(' '))}</p>`);
    paragraphs = [];
  };
  const flushBullets = () => {
    if (bullets.length) chunks.push(`<ul>${bullets.map(item => `<li>${escapeImportHtml(item)}</li>`).join('')}</ul>`);
    bullets = [];
  };

  textLines(lines).forEach(line => {
    if (isBullet(line)) {
      flushParagraphs();
      bullets.push(stripBullet(line));
    } else if (bullets.length && (/^[a-z(]/.test(line) || line.length > 70)) {
      bullets[bullets.length - 1] = `${bullets[bullets.length - 1]} ${line}`;
    } else {
      flushBullets();
      paragraphs.push(line);
    }
  });
  flushParagraphs();
  flushBullets();
  return chunks.join('');
}

function normaliseDateToken(value) {
  const source = cleanLine(value).replace(/[.,]/g, '');
  if (PRESENT_PATTERN.test(source)) return 'Present';
  const iso = source.match(/\b((?:19|20)\d{2})[-/.](1[0-2]|0?[1-9])\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}`;
  const numeric = source.match(/\b(1[0-2]|0?[1-9])[-/.]((?:19|20)\d{2})\b/);
  if (numeric) return `${numeric[2]}-${numeric[1].padStart(2, '0')}`;
  const named = source.match(new RegExp(`\\b(${MONTH_NAMES})\\s+((?:19|20)\\d{2})\\b`, 'i'));
  if (named) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const month = months.findIndex(month => named[1].toLowerCase().startsWith(month));
    return month >= 0 ? `${named[2]}-${String(month + 1).padStart(2, '0')}` : named[2];
  }
  const year = source.match(new RegExp(`\\b(${YEAR})\\b`));
  return year?.[1] || '';
}

function dateComparable(value) {
  if (!value || PRESENT_PATTERN.test(value)) return null;
  return value.length === 4 ? Number(`${value}00`) : Number(value.replace('-', ''));
}

function parseDateRange(value) {
  const text = cleanLine(value);
  const isoMatch = text.match(ISO_DATE_RANGE_PATTERN);
  const numericMatch = !isoMatch && text.match(NUMERIC_DATE_RANGE_PATTERN);
  const match = isoMatch || numericMatch || DATE_RANGE_PATTERN.exec(text);
  DATE_RANGE_PATTERN.lastIndex = 0;
  if (!match) return null;
  const startDate = isoMatch
    ? `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}`
    : numericMatch
      ? `${numericMatch[2]}-${numericMatch[1].padStart(2, '0')}`
      : normaliseDateToken(match[1]);
  const endDate = isoMatch || numericMatch ? normaliseDateToken(match[3]) : normaliseDateToken(match[2]);
  const start = dateComparable(startDate);
  const end = dateComparable(endDate);
  return {
    raw: match[0],
    startDate,
    endDate,
    currentJob: PRESENT_PATTERN.test(isoMatch || numericMatch ? match[3] : match[2]),
    valid: !(start && end && start > end),
  };
}

function stripDates(value) {
  const withoutRange = cleanLine(value)
    .replace(ISO_DATE_RANGE_PATTERN, ' ')
    .replace(NUMERIC_DATE_RANGE_PATTERN, ' ')
    .replace(DATE_RANGE_PATTERN, ' ');
  DATE_RANGE_PATTERN.lastIndex = 0;
  const withoutTokens = withoutRange.replace(DATE_TOKEN_PATTERN, ' ');
  DATE_TOKEN_PATTERN.lastIndex = 0;
  return withoutTokens
    .replace(/\b(?:present|current|now)\b/ig, ' ')
    .replace(/[|,;â€”â€“-]+\s*$/, '')
    .replace(/^\s*[|,;â€”â€“-]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function phoneCandidates(lines, diagnostics) {
  const candidates = [];
  textLines(lines).forEach((line, lineIndex) => {
    const matches = line.match(/(?:\+?\d[\d()\s.-]{5,}\d)/g) || [];
    matches.forEach(value => {
      const digits = value.replace(/\D/g, '');
      const looksDate = Boolean(parseDateRange(value)) || /^\d{4}[-/.]\d{1,2}$/.test(value.trim());
      const looksScore = GPA_PATTERN.test(value) || /^\d{4,6}$/.test(digits);
      if (digits.length < 7 || digits.length > 15 || looksDate || looksScore) {
        diagnostics.push({ kind: 'rejected-field', field: 'phone', value: cleanLine(value), confidence: 0, reason: 'date-or-score-or-invalid-phone' });
        return;
      }
      candidates.push({ value: cleanLine(value), confidence: lineIndex < 8 ? 0.99 : 0.86 });
    });
  });
  return candidates.sort((first, second) => second.confidence - first.confidence);
}

function emailCandidates(lines) {
  const values = [];
  textLines(lines).forEach((line, lineIndex) => {
    const matches = line.match(EMAIL_PATTERN) || [];
    matches.forEach(value => values.push({ value: value.replace(/\s/g, ''), confidence: lineIndex < 10 ? 0.99 : 0.91 }));
  });
  return values.sort((first, second) => second.confidence - first.confidence);
}

function nameFromLines(lines) {
  const candidates = textLines(lines).slice(0, 10).map((line, index) => ({ line, index })).filter(({ line }) => {
    const words = line.split(/\s+/);
    const classification = classifySectionHeading(line);
    return words.length >= 2
      && words.length <= 5
      && line.length <= 60
      && !/[\d@]/.test(line)
      // An uppercase candidate name may look like an unknown heading. Known
      // canonical headings remain excluded, while unknown header-like text in
      // the contact block is still eligible as a name.
      && (!classification || classification.type === 'custom')
      && !/^(?:resume|curriculum vitae|cv)$/i.test(line)
      && !DEGREE_PATTERN.test(line);
  });
  const candidate = candidates.sort((first, second) => {
    const firstCaps = first.line === first.line.toUpperCase() ? 1 : 0;
    const secondCaps = second.line === second.line.toUpperCase() ? 1 : 0;
    return secondCaps - firstCaps || first.index - second.index;
  })[0]?.line;
  if (!candidate) return { value: {}, confidence: 0 };
  const [firstName, ...surname] = candidate.split(/\s+/);
  return { value: { firstName, surname: surname.join(' ') }, confidence: 0.94 };
}

function locationFromLines(lines, contactValues) {
  const candidate = textLines(lines).slice(0, 14).find(line => {
    const lower = line.toLowerCase();
    return (line.includes(',') || /\b\d{4,10}\b/.test(line))
      && !line.includes('@')
      && !/https?:\/\//i.test(line)
      && !/(?:linkedin|github)\.com/i.test(line)
      && !lower.includes(contactValues.email?.toLowerCase() || '__none__')
      && !lower.includes(contactValues.phone?.toLowerCase() || '__none__')
      && !parseDateRange(line);
  });
  if (!candidate) return { value: {}, confidence: 0 };
  const postal = candidate.match(/\b(?:\d{4,10}|[A-Z]\d[A-Z][ -]?\d[A-Z]\d)\b/i)?.[0] || '';
  const withoutPostal = cleanLine(candidate.replace(postal, ''));
  const pieces = withoutPostal.split(',').map(cleanLine).filter(Boolean);
  if (!pieces.length) return { value: {}, confidence: 0 };
  return {
    value: {
      city: pieces[0],
      ...(pieces[1] ? { country: pieces.slice(1).join(', ') } : {}),
      ...(postal ? { pinCode: postal } : {}),
    },
    confidence: pieces.length > 1 ? 0.92 : 0.72,
  };
}

function urlValues(lines, importId) {
  const values = unique(textLines(lines).flatMap(line => line.match(URL_PATTERN) || []), 8)
    .map(value => value.replace(/[).,;]+$/, ''));
  const contact = {};
  const websites = [];
  values.forEach((value, index) => {
    const url = /^(?:https?:\/\/)/i.test(value) ? value : `https://${value}`;
    if (/linkedin\.com/i.test(url) && !contact.linkedIn) contact.linkedIn = url;
    else if (!contact.website && !/github\.com/i.test(url)) contact.website = url;
    websites.push({ id: `import-site-${importId}-${index}`, url, addToHeader: false });
  });
  return { contact, websites };
}

function extractContact(lines, importId, diagnostics) {
  const emails = emailCandidates(lines);
  const phones = phoneCandidates(lines, diagnostics);
  const name = nameFromLines(lines);
  const email = emails[0]?.value || '';
  const phone = phones[0]?.value || '';
  const location = locationFromLines(lines, { email, phone });
  const urls = urlValues(lines, importId);
  return {
    contact: {
      ...name.value,
      ...location.value,
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      ...urls.contact,
    },
    websites: urls.websites,
    diagnostics: [
      ...(name.value.firstName ? [{ kind: 'field', field: 'name', confidence: name.confidence }] : []),
      ...(email ? [{ kind: 'field', field: 'email', confidence: emails[0].confidence }] : []),
      ...(phone ? [{ kind: 'field', field: 'phone', confidence: phones[0].confidence }] : []),
      ...(location.value.city ? [{ kind: 'field', field: 'location', confidence: location.confidence }] : []),
    ],
  };
}

function skillValues(lines) {
  const candidates = textLines(lines).flatMap(line => {
    const raw = stripBullet(line);
    const groups = raw.includes(':') && raw.split(':')[1] ? raw.split(':').slice(1).join(':') : raw;
    return groups.split(/[|,;•]/).map(cleanLine).filter(Boolean);
  }).filter(value => value.length <= 70 && !DATE_RANGE_PATTERN.test(value));
  DATE_RANGE_PATTERN.lastIndex = 0;
  return unique(candidates, 60);
}

function descriptionHtml(lines) {
  return structuredHtml(lines);
}

function isPlainMetadata(line) {
  const text = cleanLine(line.text || line);
  return Boolean(text) && !isBullet(text) && text.length <= 100 && !GPA_PATTERN.test(text);
}

function isLikelyEntryTitle(line) {
  const text = cleanLine(line.text || line);
  const words = text.split(/\s+/).filter(Boolean);
  const isOrganizationEnding = /\b(?:inc|ltd|llc|corp|co|company|pvt|limited|university|technologies|solutions|networks|labs)\.?$/i.test(text);
  return isPlainMetadata(text)
    && words.length >= 1
    && words.length <= 8
    && (!/[.!?]$/.test(text) || isOrganizationEnding)
    && !parseDateRange(text);
}

function entryStartIndexes(lines, sectionType) {
  const starts = new Set();
  lines.forEach((line, index) => {
    const range = parseDateRange(line.text || line);
    if (!range) return;
    const prefix = stripDates(line.text || line);
    // A common layout is title on one line, then company + dates. Keep the
    // title with that record; a same-line title + date begins at this line.
    if (!prefix && index > 1 && isLikelyEntryTitle(lines[index - 1]) && isLikelyEntryTitle(lines[index - 2])) starts.add(index - 2);
    else if (index > 0 && isLikelyEntryTitle(lines[index - 1])) starts.add(index - 1);
    else if (prefix || index === 0) starts.add(index);
  });
  if (sectionType === 'education') {
    lines.forEach((line, index) => {
      if (DEGREE_PATTERN.test(line.text || line)) starts.add(index);
    });
  }
  return [...starts].sort((first, second) => first - second);
}

function chunksFromStarts(lines, starts) {
  if (!starts.length) return lines.length ? [lines] : [];
  return starts.map((start, index) => lines.slice(start, starts[index + 1] || lines.length));
}

function extractExperience(lines, importId, diagnostics) {
  const starts = entryStartIndexes(lines, 'experience');
  const entries = chunksFromStarts(lines, starts).flatMap((chunk, index) => {
    const values = textLines(chunk);
    const rangeIndex = values.findIndex(line => parseDateRange(line));
    const range = rangeIndex >= 0 ? parseDateRange(values[rangeIndex]) : null;
    if (!range) {
      diagnostics.push({ kind: 'needs-review', field: 'experience', confidence: 0.45, reason: 'missing-date-range', source: chunk[0] && { page: chunk[0].page, blockId: chunk[0].blockId } });
      return [];
    }
    const dateLine = values[rangeIndex];
    const prefix = stripDates(dateLine);
    const previous = rangeIndex > 0 ? values[rangeIndex - 1] : '';
    const priorTitle = rangeIndex > 1 && isLikelyEntryTitle(values[rangeIndex - 2]) ? values[rangeIndex - 2] : '';
    const hasSeparateCompany = Boolean(!prefix && previous && priorTitle && isPlainMetadata(previous));
    const hasPreviousTitle = Boolean(previous && isPlainMetadata(previous));
    const title = hasSeparateCompany ? priorTitle : (hasPreviousTitle ? previous : prefix);
    const followingEmployer = values.slice(rangeIndex + 1).find(line => isPlainMetadata(line) && !parseDateRange(line)) || '';
    const employer = hasSeparateCompany
      ? previous
      : hasPreviousTitle
      ? (prefix || followingEmployer)
      : followingEmployer;
    const titleLooksUnsafe = !title || GPA_PATTERN.test(title) || DEGREE_PATTERN.test(title) || /^\d/.test(title);
    if (titleLooksUnsafe) {
      diagnostics.push({ kind: 'needs-review', field: 'experience', confidence: 0.35, reason: 'unreliable-job-title', source: chunk[0] && { page: chunk[0].page, blockId: chunk[0].blockId } });
      return [];
    }
    const descriptionStart = hasPreviousTitle && !prefix ? rangeIndex + (followingEmployer ? 2 : 1) : hasPreviousTitle ? rangeIndex + 1 : rangeIndex + (employer ? 2 : 1);
    if (!range.valid) diagnostics.push({ kind: 'needs-review', field: 'experience.dates', confidence: 0.4, reason: 'invalid-date-range', value: range.raw });
    return [{
      id: `import-work-${importId}-${index}`,
      jobTitle: title,
      employer: employer === title ? '' : stripDates(employer),
      location: '',
      startDate: range.valid ? range.startDate : '',
      endDate: range.valid && !range.currentJob ? range.endDate : '',
      currentJob: range.valid && range.currentJob,
      description: descriptionHtml(chunk.slice(descriptionStart)),
    }];
  });
  const seen = new Set();
  return entries.filter(entry => {
    const key = [entry.jobTitle, entry.employer, entry.startDate, entry.endDate, entry.currentJob].map(canonical).join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractEducation(lines, importId, diagnostics) {
  const starts = entryStartIndexes(lines, 'education');
  const entries = chunksFromStarts(lines, starts).flatMap((chunk, index) => {
    const values = textLines(chunk);
    const degreeIndex = values.findIndex(line => DEGREE_PATTERN.test(line));
    const degreeLine = values[degreeIndex] || '';
    if (degreeIndex < 0 || !degreeLine || GPA_PATTERN.test(degreeLine)) {
      diagnostics.push({ kind: 'needs-review', field: 'education', confidence: 0.35, reason: 'unreliable-degree' });
      return [];
    }
    const degreeParts = degreeLine.match(/^(.*?)(?:\s+in\s+)(.+)$/i);
    const school = values.slice(degreeIndex + 1).find(line => !GPA_PATTERN.test(line) && !parseDateRange(line) && Boolean(stripDates(line)) && isPlainMetadata(line)) || '';
    const range = values.map(parseDateRange).find(Boolean);
    const standaloneDate = values.map(line => normaliseDateToken(line)).find(value => value) || '';
    const coursework = values.filter((line, lineIndex) => lineIndex > degreeIndex && line !== school && !parseDateRange(line) && !normaliseDateToken(line));
    return [{
      id: `import-education-${importId}-${index}`,
      level: '',
      // Keep the source degree intact for the builder while also exposing the
      // field of study separately. Splitting only into "Bachelor of Science"
      // would throw away useful wording from a user's resume.
      degree: stripDates(degreeLine),
      fieldOfStudy: degreeParts?.[2] || '',
      schoolName: stripDates(school),
      location: '',
      graduationDate: range?.valid ? (range.endDate === 'Present' ? '' : range.endDate) : standaloneDate,
      coursework: descriptionHtml(coursework),
    }];
  });
  const seen = new Set();
  return entries.filter(entry => {
    const key = [entry.degree, entry.schoolName, entry.graduationDate].map(canonical).join('|');
    if (!entry.degree || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function languageValues(lines, importId) {
  return unique(textLines(lines).flatMap(line => stripBullet(line).split(/[|,;]/).map(cleanLine).filter(Boolean)), 20)
    .map(value => value.split(/\s+(?:\(|—|–|-)/)[0].trim())
    // A two-column DOCX can interleave nearby text under a Languages heading.
    // Accept a known language (or a short explicitly-proficient value), not
    // arbitrary prose that merely happens to be in that visual column.
    .filter(value => KNOWN_LANGUAGE_NAMES.has(canonical(value)) || /(?:fluent|native|conversational|proficient|\b[abc][1-2]\b)$/i.test(value))
    .map(language => ({ id: `import-language-${importId}-${canonical(language).replace(/[^a-z0-9]+/g, '-') || Math.random().toString(36).slice(2)}`, language }))
    .filter(item => item.language && item.language.length <= 40);
}

function customIdFor(segment, seenIds, importId) {
  const base = segment.id || `custom-${canonical(segment.originalTitle).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'section'}`;
  let id = base;
  let suffix = 1;
  while (seenIds.has(id)) {
    id = `${base}-${importId}-${suffix}`;
    suffix += 1;
  }
  seenIds.add(id);
  return id;
}

function customSections(segments, importId) {
  const seenIds = new Set();
  const seenTitles = new Map();
  const values = [];
  segments.filter(segment => segment.type === 'custom' && segment.lines.length).forEach(segment => {
    const titleKey = canonical(segment.originalTitle);
    const existing = seenTitles.get(titleKey);
    if (existing) {
      existing.content = `${existing.content}${structuredHtml(segment.lines)}`;
      return;
    }
    const section = {
      id: customIdFor(segment, seenIds, importId),
      title: segment.originalTitle.slice(0, 60),
      content: structuredHtml(segment.lines),
    };
    if (section.content) {
      values.push(section);
      seenTitles.set(titleKey, section);
    }
  });
  return values;
}

function importSummary(patch) {
  return {
    contact: Object.values(patch.contact || {}).filter(Boolean).length,
    summary: Number(Boolean(patch.summary?.content)),
    skills: Number(Boolean(patch.skills?.textContent)),
    workHistory: patch.workHistory?.length || 0,
    education: patch.education?.length || 0,
    certifications: Number(Boolean(patch.certifications?.content)),
    languages: patch.languages?.length || 0,
    additionalSections: patch.extraSections?.custom?.length || 0,
  };
}

function qualityFrom(diagnostics, patch) {
  const reliable = diagnostics.filter(item => item.kind === 'field' || item.kind === 'section');
  const uncertain = diagnostics.filter(item => item.kind === 'needs-review' || item.kind === 'rejected-field');
  const populated = [patch.summary?.content, patch.skills?.textContent, patch.workHistory?.length, patch.education?.length].filter(Boolean).length;
  const averageConfidence = reliable.length
    ? reliable.reduce((total, item) => total + Number(item.confidence || 0), 0) / reliable.length
    : 0.35;
  const coverage = Math.min(1, populated / 4);
  // This is decision support for review, not a user-facing marketing score.
  return Math.max(20, Math.min(99, Math.round((averageConfidence * 0.7 + coverage * 0.3) * 100 - uncertain.length * 7)));
}

/**
 * Converts extracted text to the canonical Resume Builder patch. The returned
 * diagnostics/provenance stay in-memory during import; no raw source document
 * is persisted in localStorage.
 */
export function parseImportedResumeText(text) {
  const importId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const { lines, segments, diagnostics } = segmentResumeSections(text);
  const initialUnsectioned = segments.find(segment => segment.type === 'unsectioned')?.lines || [];
  const contactLines = [...initialUnsectioned, ...sectionLines(segments, 'contact')];
  const contactResult = extractContact(contactLines.length ? contactLines : lines.slice(0, 12), importId, diagnostics);
  diagnostics.push(...contactResult.diagnostics);

  const summaryLines = sectionLines(segments, 'summary');
  const fallbackSummary = !summaryLines.length
    ? initialUnsectioned.filter(line => {
      const value = line.text;
      return value.split(/\s+/).length >= 9 && !value.includes('@') && !phoneCandidates([line], []).length;
    }).slice(0, 3)
    : [];
  if (fallbackSummary.length) diagnostics.push({ kind: 'needs-review', field: 'summary', confidence: 0.58, reason: 'inferred-without-heading' });

  const skills = skillValues(sectionLines(segments, 'skills'));
  const explicitExperienceLines = sectionLines(segments, 'experience');
  const recoveredExperienceLines = interleavedExperienceContinuations(segments);
  const experienceSourceLines = [...explicitExperienceLines, ...recoveredExperienceLines];
  const explicitEducationLines = sectionLines(segments, 'education');
  let experience = extractExperience(experienceSourceLines, importId, diagnostics);
  let education = extractEducation(explicitEducationLines, importId, diagnostics);
  if (recoveredExperienceLines.length) {
    diagnostics.push({ kind: 'needs-review', field: 'experience', confidence: 0.68, reason: 'recovered-from-interleaved-column' });
  }
  // Headings are preferred. A heading-less resume can still contain a clear
  // date-delimited employment record or degree, but such inference is marked
  // for review instead of treated as equally certain data.
  if (!experience.length && !explicitExperienceLines.length && initialUnsectioned.some(line => parseDateRange(line.text))) {
    experience = extractExperience(initialUnsectioned, importId, diagnostics);
    if (experience.length) diagnostics.push({ kind: 'needs-review', field: 'experience', confidence: 0.58, reason: 'inferred-without-heading' });
  }
  if (!education.length && !explicitEducationLines.length && initialUnsectioned.some(line => DEGREE_PATTERN.test(line.text))) {
    education = extractEducation(initialUnsectioned, importId, diagnostics);
    if (education.length) diagnostics.push({ kind: 'needs-review', field: 'education', confidence: 0.58, reason: 'inferred-without-heading' });
  }
  const certifications = structuredHtml(sectionLines(segments, 'certifications'));
  const languages = languageValues(sectionLines(segments, 'languages'), importId);
  const custom = customSections(segments, importId);
  const selected = unique([
    ...(certifications ? ['certifications'] : []),
    ...(languages.length ? ['languages'] : []),
    ...custom.map(section => section.id),
  ]);

  const patch = {
    contact: contactResult.contact,
    summary: { content: paragraphHtml(summaryLines.length ? summaryLines : fallbackSummary) },
    skills: {
      textContent: skills.length ? `<ul>${skills.map(skill => `<li>${escapeImportHtml(skill)}</li>`).join('')}</ul>` : '',
      ratings: [],
      showRatings: false,
    },
    workHistory: experience,
    education,
    certifications: { content: certifications },
    languages,
    websites: contactResult.websites,
    extraSections: { selected, custom },
  };
  const summary = importSummary(patch);
  const importedCount = Object.values(summary).reduce((total, value) => total + Number(value || 0), 0);
  const needsReview = diagnostics.filter(item => item.kind === 'needs-review').map(item => ({
    field: item.field,
    reason: item.reason,
    confidence: item.confidence,
  }));
  const quality = qualityFrom(diagnostics, patch);
  patch.importMeta = {
    quality,
    needsReview,
    sections: diagnostics.filter(item => item.kind === 'section').map(({ originalTitle, canonicalType, confidence }) => ({ originalTitle, canonicalType, confidence })),
    importedAt: new Date().toISOString(),
  };
  return {
    patch,
    importedCount,
    summary,
    review: { quality, needsReview, summary },
    diagnostics,
  };
}

export function importedResumeHasContent(result) {
  return Number(result?.importedCount) > 0;
}
