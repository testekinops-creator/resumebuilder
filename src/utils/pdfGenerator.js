import { jsPDF } from 'jspdf';
import { Packer } from 'docx';
import { TEMPLATES } from '../data/templates.js';
import { getCustomResumeSection, getResumeLayout } from './resumeSections.js';
import { formatResumeDateRange, formatResumeMonth } from './resumeDates.js';
import { buildResumeDOCX } from './docxRenderer.js';
import { docxFilename, sanitizeDocxState } from './docxContent.js';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export const RESUME_EXPORT_FORMATS = Object.freeze({
  pdf: Object.freeze({
    extension: 'pdf',
    mimeType: 'application/pdf',
    signature: [0x25, 0x50, 0x44, 0x46, 0x2D], // %PDF-
  }),
  docx: Object.freeze({
    extension: 'docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    signature: [0x50, 0x4B], // ZIP container (PK)
  }),
});

const SECTION_LABELS = {
  summary: 'Professional Summary',
  workHistory: 'Work History',
  education: 'Education',
  skills: 'Skills',
  websites: 'Websites & Profiles',
  personalDetails: 'Personal Details',
  certifications: 'Certifications',
  languages: 'Languages',
};

function compactText(value) {
  return String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizedSkillRating(value) {
  return Math.min(5, Math.max(1, Number(value) || 1));
}

function ratedSkillEntries(ratings = []) {
  return (Array.isArray(ratings) ? ratings : [])
    .filter(skill => compactText(skill?.name))
    .map(skill => ({ name: compactText(skill.name), rating: normalizedSkillRating(skill.rating) }));
}

function ratedSkillValues(ratings = []) {
  return ratedSkillEntries(ratings).map(skill => `${skill.name} (${skill.rating}/5)`);
}

function filenameBase(state, resumeName) {
  const name = resumeName === undefined || resumeName === null
    ? (compactText(state?.meta?.name) || 'Resume')
    : (compactText(resumeName) || 'Resume');
  return name
    .replace(/[\\/:*?"<>|]+/g, ' - ')
    .replace(/\s*-\s*/g, ' - ')
    .trim()
    .slice(0, 100) || 'Resume';
}

export function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function exportError(message, stage, cause) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.exportStage = stage;
  return error;
}

async function validatedExportArtifact(blob, format, filename) {
  const definition = RESUME_EXPORT_FORMATS[format];
  if (!definition) throw exportError(`Unsupported resume format: ${format}`, 'validation');
  if (!(blob instanceof Blob) || blob.size <= definition.signature.length) {
    throw exportError(`The ${format.toUpperCase()} renderer returned an empty file.`, 'blob');
  }

  const signature = new Uint8Array(await blob.slice(0, definition.signature.length).arrayBuffer());
  const matchesSignature = definition.signature.every((byte, index) => signature[index] === byte);
  if (!matchesSignature) {
    throw exportError(`The export service returned an invalid ${format.toUpperCase()} file.`, 'blob');
  }

  const normalizedBlob = blob.type === definition.mimeType
    ? blob
    : new Blob([blob], { type: definition.mimeType });
  const file = typeof File === 'function'
    ? new File([normalizedBlob], filename, { type: definition.mimeType, lastModified: Date.now() })
    : null;

  return {
    blob: normalizedBlob,
    file,
    filename,
    format,
    mimeType: definition.mimeType,
    size: normalizedBlob.size,
  };
}

export function downloadResumeExport(artifact) {
  if (!artifact?.blob || !artifact?.filename) {
    throw exportError('A prepared resume file is required before downloading.', 'download');
  }
  downloadBlob(artifact.blob, artifact.filename);
  return artifact;
}

function richTextBlocks(html) {
  if (!html) return [];
  if (typeof DOMParser === 'undefined') {
    const decode = value => String(value || '')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#(?:39|x27);/gi, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
      .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
    const source = String(html);
    const listBlocks = [...source.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
      .map(match => ({ text: compactText(decode(match[1])), bullet: true }))
      .filter(block => block.text);
    const remainder = source.replace(/<(?:ul|ol)\b[^>]*>[\s\S]*?<\/(?:ul|ol)>/gi, ' ');
    const ordinaryBlocks = [...remainder.matchAll(/<(?:p|div|h[1-6])\b[^>]*>([\s\S]*?)<\/(?:p|div|h[1-6])>/gi)]
      .map(match => ({ text: compactText(decode(match[1])), bullet: false }))
      .filter(block => block.text);
    if (listBlocks.length || ordinaryBlocks.length) return [...ordinaryBlocks, ...listBlocks];
    const plainText = compactText(decode(source));
    return plainText ? [{ text: plainText, bullet: false }] : [];
  }
  const root = new DOMParser().parseFromString(html, 'text/html').body;
  const blocks = [];
  const add = (node, bullet = false) => {
    const text = compactText(node.textContent);
    if (text) blocks.push({ text, bullet });
  };

  [...root.childNodes].forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      add(node);
      return;
    }
    const tag = node.tagName?.toLowerCase();
    if (tag === 'ul' || tag === 'ol') {
      [...node.children].filter(child => child.tagName?.toLowerCase() === 'li').forEach(item => add(item, true));
    } else if (tag === 'li') {
      add(node, true);
    } else {
      add(node);
    }
  });

  return blocks;
}

function hasExportableContent(state) {
  const contact = state?.contact || {};
  const custom = state?.extraSections?.custom || [];
  return Boolean(
    Object.values(contact).some(value => compactText(value))
    || richTextBlocks(state?.summary?.content).length
    || state?.workHistory?.some(job => Object.values(job || {}).some(value => compactText(value)))
    || state?.education?.some(entry => Object.values(entry || {}).some(value => compactText(value)))
    || richTextBlocks(state?.skills?.textContent).length
    || state?.skills?.ratings?.some(skill => compactText(skill?.name))
    || state?.websites?.some(site => compactText(site?.url))
    || richTextBlocks(state?.certifications?.content).length
    || state?.languages?.some(language => compactText(language?.language))
    || custom.some(section => compactText(section?.title) || richTextBlocks(section?.content).length)
  );
}

async function settleWithin(promise, timeoutMs = 5000) {
  if (!promise || typeof promise.then !== 'function') return;
  let timeout;
  await Promise.race([
    Promise.resolve(promise).catch(() => undefined),
    new Promise(resolve => {
      timeout = globalThis.setTimeout(resolve, timeoutMs);
    }),
  ]);
  globalThis.clearTimeout(timeout);
}

async function waitForRenderedResume(timeoutMs = 5000) {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await settleWithin(document.fonts.ready, timeoutMs);
  }
  const nextFrame = typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : callback => globalThis.setTimeout(callback, 0);
  await settleWithin(new Promise(resolve => nextFrame(() => nextFrame(resolve))), timeoutMs);
}

function hexColor(value, fallback = '6B21A8') {
  const normalized = String(value || '').replace('#', '');
  return /^[\da-f]{6}$/i.test(normalized) ? normalized.toUpperCase() : fallback;
}

function fontForDesign(fontFamily) {
  const family = String(fontFamily || '').toLowerCase();
  if (/(georgia|garamond|palatino|times|cambria)/.test(family)) return 'times';
  if (/courier/.test(family)) return 'courier';
  return 'helvetica';
}

// Kept only for the pre-existing vector PDF fallback. DOCX never uses these
// coarse layout aliases; it consumes template.presentation directly.
const VECTOR_PDF_TEMPLATE_BASE_BY_ID = Object.freeze({
  classic: 'classic',
  harbor: 'professional',
  sapphire: 'modern',
  slate: 'accountant',
  aspen: 'classic',
  modern: 'modern',
  orbit: 'developer',
  nova: 'executive',
  metro: 'accountant',
  azure: 'modern',
  professional: 'professional',
  ledger: 'timeline',
  ivory: 'ats-serif',
  cobalt: 'accountant',
  sterling: 'professional',
  creative: 'creative',
  canvas: 'creative',
  coral: 'editorial',
  prism: 'creative',
  muse: 'creative',
  minimal: 'minimal',
  mono: 'minimal',
  nordic: 'accountant',
  pebble: 'editorial',
  willow: 'creative',
  executive: 'executive',
  summit: 'executive',
  regal: 'accountant',
  onyx: 'classic',
  bordeaux: 'timeline',
  accountant: 'accountant',
  developer: 'developer',
  timeline: 'timeline',
  editorial: 'editorial',
  'ats-serif': 'ats-serif',
});

export const RESUME_DOCX_TEMPLATE_IDS = Object.freeze(TEMPLATES.map(template => template.id));

function templateBase(templateId) {
  return VECTOR_PDF_TEMPLATE_BASE_BY_ID[templateId] || 'classic';
}

function sectionLabel(section, base) {
  const labels = {
    modern: { summary: 'Profile', workHistory: 'Experience', skills: 'Expertise', websites: 'Links', personalDetails: 'Personal' },
    professional: { workHistory: 'Work Experience', skills: 'Skills & Core Competencies', websites: 'Links & Publications' },
    creative: { summary: 'Profile', workHistory: 'Experience', skills: 'Skills', websites: 'Links', personalDetails: 'Personal' },
    minimal: { summary: 'Summary', workHistory: 'Experience', websites: 'Links' },
    executive: { summary: 'Executive Summary', workHistory: 'Professional Experience', skills: 'Core Competencies', websites: 'Websites & Portfolios', personalDetails: 'Personal Information' },
    accountant: { summary: 'About Me', workHistory: 'Work Experience' },
    developer: { summary: 'Summary', workHistory: 'Experience', websites: 'Links' },
    timeline: { summary: 'Profile', workHistory: 'Work Experience', websites: 'Websites & Profiles' },
    editorial: { summary: 'Profile', workHistory: 'Professional Experience' },
    'ats-serif': { summary: 'Profile', workHistory: 'Professional Experience' },
  };
  return labels[base]?.[section] || SECTION_LABELS[section] || section;
}

/**
 * Builds the PDF from text and vector drawing commands. It deliberately never
 * captures the DOM as a canvas: this keeps the resume selectable, searchable,
 * and crisp at every zoom level.
 */
function createVectorResumePDF(state, resumeName) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  const accent = hexColor(state.design?.colorScheme);
  const base = templateBase(state.meta?.templateId || 'classic');
  const font = fontForDesign(state.design?.fontFamily);
  const fontScale = state.design?.fontStyle === 'small' ? 0.92 : state.design?.fontStyle === 'large' ? 1.08 : 1;
  const sectionGap = 2 + ((Number(state.design?.sectionSpacing) || 50) / 100) * 3;
  const contact = state.contact || {};
  const fullName = compactText([contact.firstName, contact.surname].filter(Boolean).join(' ')) || compactText(resumeName) || 'My Resume';
  const contactLine = [contact.email, contact.phone, [contact.city, contact.country].filter(Boolean).join(', ')].filter(Boolean).join(' | ');
  const borderWidthsMm = { none: 0, thin: 0.27, medium: 0.53, thick: 1.06 };
  const pageBorder = state.design?.pageBorder || 'none';
  const borderWidth = borderWidthsMm[pageBorder] ?? borderWidthsMm.none;
  const frameInset = 5;
  const contentX = 17;
  const contentRight = 193;
  const contentWidth = contentRight - contentX;
  const pageBottom = 281;
  let currentPage = 0;
  let y = 0;

  const setTextColor = color => pdf.setTextColor(`#${hexColor(color, '1F2937')}`);
  const setDrawColor = color => pdf.setDrawColor(`#${hexColor(color, '1F2937')}`);
  const setFont = (style = 'normal') => pdf.setFont(font, style);
  const lineHeight = size => Math.max(4, size * 0.47);

  const drawFrame = () => {
    if (!borderWidth) return;
    setDrawColor(accent);
    pdf.setLineWidth(borderWidth);
    pdf.rect(frameInset, frameInset, A4_WIDTH_MM - frameInset * 2, A4_HEIGHT_MM - frameInset * 2, 'S');
  };

  const drawFirstPageHeader = () => {
    if (base === 'classic') {
      const headerInset = borderWidth ? frameInset + borderWidth / 2 : 0;
      pdf.setFillColor(`#${accent}`);
      pdf.rect(headerInset, headerInset, A4_WIDTH_MM - headerInset * 2, 29, 'F');
      setFont('bold');
      pdf.setFontSize(19 * fontScale);
      pdf.setTextColor('#FFFFFF');
      pdf.text(fullName, A4_WIDTH_MM / 2, 17, { align: 'center', maxWidth: contentWidth });
      if (contactLine) {
        setFont('normal');
        pdf.setFontSize(8.5 * fontScale);
        pdf.text(pdf.splitTextToSize(contactLine, contentWidth - 8), A4_WIDTH_MM / 2, 25, { align: 'center' });
      }
      y = 43;
      return;
    }

    setFont(base === 'executive' ? 'normal' : 'bold');
    pdf.setFontSize((base === 'executive' ? 19 : 18) * fontScale);
    setTextColor('111111');
    pdf.text(fullName, contentX, 18, { maxWidth: contentWidth });
    if (contactLine) {
      setFont('normal');
      pdf.setFontSize(8.5 * fontScale);
      setTextColor('555555');
      pdf.text(pdf.splitTextToSize(contactLine, contentWidth), contentX, 25);
    }
    setDrawColor(accent);
    pdf.setLineWidth(base === 'executive' ? 0.65 : 1.1);
    pdf.line(contentX, 34, contentRight, 34);
    y = 43;
  };

  const beginPage = () => {
    if (currentPage) pdf.addPage('a4', 'portrait');
    currentPage += 1;
    drawFrame();
    if (currentPage === 1) drawFirstPageHeader();
    else y = 17;
  };

  const ensureSpace = (height) => {
    if (y + height > pageBottom) beginPage();
  };

  const addText = (value, { bullet = false, bold = false, italic = false, color = '1F2937', size = 9.5, gap = 2.5, width = contentWidth, x = contentX } = {}) => {
    const text = compactText(value);
    if (!text) return;
    const indent = bullet ? 4.8 : 0;
    const lines = pdf.splitTextToSize(text, width - indent);
    const height = lineHeight(size * fontScale);
    let lineIndex = 0;
    setFont(bold ? 'bold' : italic ? 'italic' : 'normal');
    pdf.setFontSize(size * fontScale);
    setTextColor(color);

    // A normal paragraph should not be torn in half at the bottom of a page.
    // Only a paragraph taller than a whole continuation page is allowed to
    // span pages, and it still keeps its remaining lines inside the new frame.
    const paragraphHeight = lines.length * height + gap;
    const continuationCapacity = pageBottom - 17;
    if (paragraphHeight <= continuationCapacity && y + paragraphHeight > pageBottom) beginPage();

    while (lineIndex < lines.length) {
      if (y + height > pageBottom) beginPage();
      const availableLines = Math.max(1, Math.floor((pageBottom - y) / height));
      const pageLines = lines.slice(lineIndex, lineIndex + availableLines);
      if (bullet && lineIndex === 0) pdf.text('•', x, y);
      pdf.text(pageLines, x + indent, y);
      y += pageLines.length * height;
      lineIndex += pageLines.length;
      if (lineIndex < lines.length) beginPage();
    }
    y += gap;
  };

  const addSection = (title, renderContent, minimumContentHeight = 6) => {
    // Keep a heading with the start of its content so a page never ends on an
    // orphaned section label.
    ensureSpace(12 + minimumContentHeight);
    setFont('bold');
    pdf.setFontSize(10.8 * fontScale);
    setTextColor(accent);
    pdf.text(title.toUpperCase(), contentX, y);
    y += 2.6;
    setDrawColor(accent);
    pdf.setLineWidth(base === 'executive' ? 0.65 : 0.45);
    pdf.line(contentX, y, contentRight, y);
    y += 5.1;
    renderContent();
    y += sectionGap;
  };

  const addRichText = html => richTextBlocks(html).forEach(block => addText(block.text, { bullet: block.bullet }));

  const addWorkHistory = entries => entries.forEach(job => {
    const title = compactText(job.jobTitle) || 'Position';
    const date = formatResumeDateRange(job.startDate, job.endDate, job.currentJob);
    const employer = [job.employer, job.location].filter(Boolean).join(', ');
    ensureSpace(16);
    setFont('bold');
    pdf.setFontSize(10 * fontScale);
    setTextColor('111111');
    const titleLines = pdf.splitTextToSize(title, 112);
    pdf.text(titleLines, contentX, y);
    if (date) {
      setTextColor(accent);
      pdf.text(date, contentRight, y, { align: 'right', maxWidth: 58 });
    }
    y += titleLines.length * lineHeight(10 * fontScale) + 1;
    if (employer) addText(employer, { italic: base !== 'executive', color: base === 'executive' ? accent : '4B5563', size: 8.8, gap: 2 });
    richTextBlocks(job.description).forEach(block => addText(block.text, { bullet: block.bullet, size: 9.1 }));
    y += 1.3;
  });

  const addEducation = entries => entries.forEach(entry => {
    const title = compactText(entry.degree || entry.level || 'Education');
    const school = [entry.schoolName, entry.fieldOfStudy, entry.location].filter(Boolean).join(', ');
    ensureSpace(13);
    setFont('bold');
    pdf.setFontSize(9.8 * fontScale);
    setTextColor('111111');
    pdf.text(pdf.splitTextToSize(title, 120), contentX, y);
    if (compactText(entry.graduationDate)) {
      setTextColor(accent);
      pdf.text(formatResumeMonth(entry.graduationDate), contentRight, y, { align: 'right' });
    }
    y += lineHeight(9.8 * fontScale) + 1;
    if (school) addText(school, { italic: true, color: '4B5563', size: 8.8, gap: 2.5 });
  });

  const addGrid = (items, columns = 3) => {
    const values = items.map(compactText).filter(Boolean);
    if (!values.length) return;
    const columnWidth = contentWidth / columns;
    for (let index = 0; index < values.length; index += columns) {
      const row = values.slice(index, index + columns);
      const linesByCell = row.map(value => pdf.splitTextToSize(value, columnWidth - 5));
      const rowHeight = Math.max(...linesByCell.map(lines => Math.max(1, lines.length))) * lineHeight(8.7 * fontScale) + 2;
      ensureSpace(rowHeight);
      setFont('normal');
      pdf.setFontSize(8.7 * fontScale);
      setTextColor('1F2937');
      linesByCell.forEach((lines, column) => {
        const x = contentX + column * columnWidth;
        setTextColor(accent);
        pdf.text('•', x, y);
        setTextColor('1F2937');
        pdf.text(lines, x + 3.4, y);
      });
      y += rowHeight;
    }
  };

  beginPage();
  const { sectionOrder: order } = getResumeLayout(state);
  order.forEach(section => {
    const customSection = getCustomResumeSection(state, section);
    const title = customSection
      ? compactText(customSection.title) || 'Additional Information'
      : sectionLabel(section, base);
    switch (section) {
      case 'summary': if (richTextBlocks(state.summary?.content).length) addSection(title, () => addRichText(state.summary.content), 8); break;
      case 'workHistory': if (state.workHistory?.length) addSection(title, () => addWorkHistory(state.workHistory), 18); break;
      case 'education': if (state.education?.length) addSection(title, () => addEducation(state.education), 14); break;
      case 'skills': {
        const textSkills = richTextBlocks(state.skills?.textContent).map(block => block.text);
        const ratedSkills = state.skills?.showRatings !== true
          ? ratedSkillEntries(state.skills?.ratings).map(skill => skill.name)
          : ratedSkillValues(state.skills?.ratings);
        const values = ratedSkills.length ? ratedSkills : textSkills;
        if (values.some(compactText)) addSection(title, () => addGrid(values), 8);
        break;
      }
      case 'websites': if (state.websites?.some(site => compactText(site.url))) addSection(title, () => state.websites.filter(site => compactText(site.url)).forEach(site => addText(site.url, { bullet: true, color: accent })));
        break;
      case 'personalDetails': {
        const details = [['Date of birth', state.personalDetails?.dob], ['Nationality', state.personalDetails?.nationality], ['Marital status', state.personalDetails?.maritalStatus], ['Gender', state.personalDetails?.gender]].filter(([, value]) => compactText(value));
        if (details.length) addSection(title, () => addGrid(details.map(([label, value]) => `${label}: ${value}`), 2));
        break;
      }
      case 'certifications': if (richTextBlocks(state.certifications?.content).length) addSection(title, () => addRichText(state.certifications.content)); break;
      case 'languages': if (state.languages?.some(language => compactText(language.language))) addSection(title, () => addGrid(state.languages.filter(language => compactText(language.language)).map(language => language.language)));
        break;
      default:
        if (customSection && richTextBlocks(customSection.content).length) {
          addSection(title, () => addRichText(customSection.content));
        }
        break;
    }
  });

  const filename = `${filenameBase(state, resumeName)}.pdf`;
  pdf.setProperties({ title: filename.replace(/\.pdf$/i, ''), subject: 'Resume', author: fullName });
  return { pdf, filename, pages: currentPage };
}

/** Backward-compatible vector export for integrations outside the final editor. */
export function addVectorResumePDF(state, resumeName) {
  const exportResult = createVectorResumePDF(state, resumeName);
  exportResult.pdf.save(exportResult.filename);
  return { filename: exportResult.filename, pages: exportResult.pages };
}

/**
 * Prepares a Chromium-rendered PDF from the same ResumePreview document used
 * by the editor. Keeping preparation separate from download lets Email and
 * native file sharing reuse the exact same validated artifact.
 */
export async function preparePDFExport({
  state,
  resumeName,
  fetchImpl = globalThis.fetch,
  requestTimeoutMs = 55000,
  signal,
}) {
  if (!hasExportableContent(state)) {
    throw exportError('Add at least one resume detail before downloading.', 'validation');
  }
  if (typeof fetchImpl !== 'function') throw exportError('The PDF export service is unavailable.', 'request');

  await waitForRenderedResume();
  const filename = `${filenameBase(state, resumeName)}.pdf`;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const relayAbort = () => controller?.abort(signal?.reason);
  if (signal?.aborted) relayAbort();
  else signal?.addEventListener?.('abort', relayAbort, { once: true });
  const requestTimeout = controller
    ? globalThis.setTimeout(() => controller.abort(), requestTimeoutMs)
    : undefined;
  const requestSignal = controller?.signal || signal;
  const requestPdf = () => fetchImpl('/api/resume-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, resumeName }),
    ...(requestSignal ? { signal: requestSignal } : {}),
  });

  // The server renders /pdf-export, which is the same ResumePreview component
  // the user selected in the editor. Never substitute the older generic PDF
  // here: it would turn a sidebar or header template into a different resume.
  let response;
  try {
    try {
      response = await requestPdf();
      if ([502, 503, 504].includes(response.status)) {
        await new Promise(resolve => globalThis.setTimeout(resolve, 350));
        response = await requestPdf();
      }
    } catch (error) {
      const message = error?.name === 'AbortError'
        ? 'The PDF renderer took too long to respond. Please try again.'
        : 'The PDF renderer is starting or unavailable. Please retry in a moment.';
      throw exportError(message, 'request', error);
    }

    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      const error = exportError(detail?.error || 'Could not create the selected-template PDF. Please try again.', detail?.stage || 'render');
      error.status = response.status;
      throw error;
    }

    const pdf = await response.blob();
    return validatedExportArtifact(pdf, 'pdf', filename);
  } finally {
    globalThis.clearTimeout(requestTimeout);
    signal?.removeEventListener?.('abort', relayAbort);
  }
}

/** Downloads the validated PDF artifact. */
export async function generatePDF(options) {
  const artifact = await preparePDFExport(options);
  downloadResumeExport(artifact);
  return { ...artifact, directDownload: true };
}

/** Prepares the selected semantic template as an editable native Word document. */
export async function prepareDOCXExport({ state, resumeName }) {
  const cleanState = sanitizeDocxState(state);
  if (!hasExportableContent(cleanState)) {
    throw exportError('Add at least one resume detail before downloading.', 'validation');
  }
  const documentFile = buildResumeDOCX(cleanState);
  const blob = await Packer.toBlob(documentFile);
  return validatedExportArtifact(blob, 'docx', docxFilename(cleanState, resumeName));
}

/** Creates and downloads an editable DOCX. */
export async function generateDOCX(options) {
  const artifact = await prepareDOCXExport(options);
  downloadResumeExport(artifact);
  return artifact;
}

export async function prepareResumeExport({ format = 'pdf', ...options }) {
  if (format === 'pdf') return preparePDFExport(options);
  if (format === 'docx') return prepareDOCXExport(options);
  throw exportError(`Unsupported resume format: ${format}`, 'validation');
}

async function waitForPrintImage(image, timeoutMs) {
  const source = image.currentSrc || image.src;
  if (!source) return;

  let loaded = image.complete && image.naturalWidth > 0;
  if (!image.complete) {
    loaded = await new Promise(resolve => {
      let timeout;
      let settled = false;
      const finish = success => {
        if (settled) return;
        settled = true;
        globalThis.clearTimeout(timeout);
        image.removeEventListener('load', handleLoad);
        image.removeEventListener('error', handleError);
        resolve(success);
      };
      const handleLoad = () => finish(image.naturalWidth > 0);
      const handleError = () => finish(false);

      image.addEventListener('load', handleLoad);
      image.addEventListener('error', handleError);
      timeout = globalThis.setTimeout(() => finish(false), timeoutMs);

      // Close the race where the image settles after the first complete check
      // but before the listeners are registered.
      if (image.complete) finish(image.naturalWidth > 0);
    });
  }

  if (!loaded || image.naturalWidth <= 0) {
    image.classList.add('print-asset-unavailable');
    return;
  }

  image.classList.remove('print-asset-unavailable');
  // A loaded image with intrinsic dimensions is printable even when a
  // browser declines decode() for an otherwise supported source type.
  await settleWithin(image.decode?.(), timeoutMs);
}

async function waitForPrintAssets(root, timeoutMs) {
  if (!root) throw exportError('The printable resume document is unavailable.', 'print-document');
  if (document.fonts?.ready) await settleWithin(document.fonts.ready, timeoutMs);

  const images = [...root.querySelectorAll('img')];
  await Promise.all(images.map(image => waitForPrintImage(image, timeoutMs)));
  await waitForRenderedResume(timeoutMs);

  const page = root.querySelector('.preview-page');
  const bounds = page?.getBoundingClientRect();
  if (!page || !compactText(page.textContent) || !bounds || bounds.width <= 0 || bounds.height <= 0) {
    throw exportError('The printable resume did not finish rendering.', 'print-document');
  }
}

/** Prints only the dedicated resume document mounted outside the application UI. */
export async function printResume({
  selector = '#resume-print-root',
  assetTimeoutMs = 5000,
  afterPrintTimeoutMs = 60000,
} = {}) {
  const root = document.querySelector(selector);
  await waitForPrintAssets(root, assetTimeoutMs);

  return new Promise((resolve, reject) => {
    let settled = false;
    let fallbackTimer;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(fallbackTimer);
      window.removeEventListener('afterprint', finish);
      resolve();
    };

    try {
      window.addEventListener('afterprint', finish, { once: true });
      window.print();
      // Browsers that block print or omit afterprint still release the UI.
      if (!settled) fallbackTimer = window.setTimeout(finish, afterPrintTimeoutMs);
    } catch (error) {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener('afterprint', finish);
      reject(exportError('The browser could not open the print dialog.', 'print-dialog', error));
    }
  });
}

export function buildEmailDraft({ resumeName, filename, attachmentIncluded = false }) {
  const cleanName = compactText(resumeName) || 'Resume';
  const cleanFilename = compactText(filename) || `${cleanName}.pdf`;
  const subject = `Resume - ${cleanName}`;
  const attachmentLine = attachmentIncluded
    ? `Please find ${cleanFilename} attached.`
    : `Please attach ${cleanFilename} before sending this email.`;
  const body = `Hi,\n\n${attachmentLine}\n\nBest regards`;
  return {
    subject,
    body,
    url: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  };
}

/** Honest mail-client fallback; browsers cannot add attachments to mailto URLs. */
export function emailResume(resumeName, filename) {
  const draft = buildEmailDraft({ resumeName, filename, attachmentIncluded: false });
  window.location.href = draft.url;
  return draft;
}
