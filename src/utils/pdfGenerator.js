import { jsPDF } from 'jspdf';
import {
  AlignmentType,
  BorderStyle,
  Document,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlignTable,
  WidthType,
} from 'docx';
import { getCustomResumeSection, getResumeLayout } from './resumeSections';
import { formatResumeDateRange, formatResumeMonth } from './resumeDates';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PAGE_WIDTH_TWIPS = 11906;
const PAGE_HEIGHT_TWIPS = 16838;
const PAGE_MARGIN_TWIPS = 720;

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

const DOCX_TEMPLATE_BASE_BY_ID = Object.freeze({
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

export const RESUME_DOCX_TEMPLATE_IDS = Object.freeze(Object.keys(DOCX_TEMPLATE_BASE_BY_ID));

function templateBase(templateId) {
  return DOCX_TEMPLATE_BASE_BY_ID[templateId] || 'classic';
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

const DOCX_CONTENT_WIDTH = PAGE_WIDTH_TWIPS - PAGE_MARGIN_TWIPS * 2;
const DOCX_SIDEBAR_WIDTH = 3600;
const DOCX_MAIN_WIDTH = DOCX_CONTENT_WIDTH - DOCX_SIDEBAR_WIDTH;
const DOCX_ZERO_CELL_MARGINS = Object.freeze({ top: 0, bottom: 0, left: 0, right: 0 });
const DOCX_NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const DOCX_NO_BORDERS = {
  top: DOCX_NO_BORDER,
  bottom: DOCX_NO_BORDER,
  left: DOCX_NO_BORDER,
  right: DOCX_NO_BORDER,
  insideHorizontal: DOCX_NO_BORDER,
  insideVertical: DOCX_NO_BORDER,
};
const DOCX_BULLET_REFERENCE = 'resume-bullet';
const DOCX_STYLE = {
  body: 'ResumeBody',
  bullet: 'ResumeBullet',
  heading: 'ResumeHeading',
  entryTitle: 'ResumeEntryTitle',
  metadata: 'ResumeMetadata',
  sidebarText: 'ResumeSidebarText',
  contact: 'ResumeContact',
};

const DOCX_TEMPLATE_CONFIG = {
  classic: { header: 'banner' },
  modern: { header: 'split' },
  professional: { header: 'underlined' },
  minimal: { header: 'minimal' },
  executive: { header: 'framed' },
  creative: { header: 'sidebar', sidebar: true },
  accountant: { layout: 'accountant' },
  developer: { layout: 'developer', frame: true },
  timeline: { layout: 'timeline' },
  editorial: { layout: 'editorial' },
  'ats-serif': { header: 'underlined' },
};

function splitDocxWidth(totalWidth, leftShare) {
  const leftWidth = Math.max(1, Math.round(totalWidth * leftShare));
  return [leftWidth, totalWidth - leftWidth];
}

function docxInnerWidth(cellWidth, margins = DOCX_ZERO_CELL_MARGINS) {
  return Math.max(1, cellWidth - (margins.left || 0) - (margins.right || 0));
}

function fixedDocxTableGeometry(width, columnWidths = [width]) {
  const tableWidth = Math.round(width);
  const exactColumnWidths = columnWidths.map(value => Math.round(value));
  if (tableWidth <= 0 || exactColumnWidths.some(value => value <= 0)
    || exactColumnWidths.reduce((sum, value) => sum + value, 0) !== tableWidth) {
    throw exportError('The DOCX renderer produced invalid fixed-table geometry.', 'layout');
  }
  return {
    width: { size: tableWidth, type: WidthType.DXA },
    columnWidths: exactColumnWidths,
    layout: TableLayoutType.FIXED,
  };
}

function textRun(text, options = {}) {
  return new TextRun({ text: compactText(text), size: 20, font: 'Arial', ...options });
}

function docxFontFamily(state) {
  const requested = compactText(state.design?.fontFamily);
  const mobileSafeFonts = {
    arial: 'Arial',
    calibri: 'Calibri',
    georgia: 'Georgia',
    'times new roman': 'Times New Roman',
    'courier new': 'Courier New',
  };
  if (!requested) return 'Arial';
  if (/^(garamond|palatino linotype|cambria)$/i.test(requested)) return 'Times New Roman';
  return mobileSafeFonts[requested.toLowerCase()] || 'Arial';
}

function paragraphText(text, { font, color = '333333', size = 20, runOptions = {}, style = DOCX_STYLE.body, ...options } = {}) {
  return new Paragraph({
    style,
    children: [textRun(text, { font, color, size, ...runOptions })],
    ...options,
  });
}

function docxBulletProperties(spacing) {
  return {
    style: DOCX_STYLE.bullet,
    numbering: { reference: DOCX_BULLET_REFERENCE, level: 0 },
    // Direct paragraph indentation reinforces the shared numbering style in
    // Word, including inside narrow table cells. No spaces or tabs are used.
    indent: { left: spacing.bulletIndent, hanging: spacing.bulletHanging },
  };
}

function docxParagraphStyle(sidebar) {
  return sidebar ? DOCX_STYLE.sidebarText : DOCX_STYLE.body;
}

function docxSectionHeading(title, { color, font, sidebar = false, spacing }) {
  const dividerColor = sidebar ? 'FFFFFF' : color;
  return new Paragraph({
    style: DOCX_STYLE.heading,
    keepNext: true,
    spacing: {
      before: sidebar ? Math.max(160, spacing.sectionBefore - 40) : spacing.sectionBefore,
      after: spacing.sectionAfter,
      line: spacing.line,
    },
    border: { bottom: { style: BorderStyle.SINGLE, size: sidebar ? 6 : 10, color: dividerColor, space: 3 } },
    children: [textRun(title.toUpperCase(), {
      font,
      bold: true,
      color: sidebar ? 'FFFFFF' : color,
      size: sidebar ? 19 : 22,
      characterSpacing: sidebar ? 4 : 16,
    })],
  });
}

function richParagraphs(html, { font, color = '333333', sidebar = false, spacing } = {}) {
  return richTextBlocks(html).map(({ text, bullet }) => new Paragraph({
    ...(bullet ? docxBulletProperties(spacing) : { style: docxParagraphStyle(sidebar) }),
    children: [textRun(text, { font, color, size: sidebar ? 18 : 20 })],
    // Explicitly override Word's list-style defaults. A list item gets a
    // compact, single-line rhythm; ordinary rich text keeps a little more
    // separation without adding inherited Space After from Word.
    spacing: { before: 0, after: bullet ? spacing.bulletAfter : (sidebar ? spacing.sidebarParagraphAfter : spacing.paragraphAfter), line: spacing.line },
  }));
}

function itemParagraphs(items, { font, color = '333333', sidebar = false, bullet = false, forceSidebarBullets = false, link = false, spacing } = {}) {
  const useBullet = bullet && (!sidebar || forceSidebarBullets);
  return items.filter(Boolean).map(item => new Paragraph({
    ...(useBullet ? docxBulletProperties(spacing) : { style: docxParagraphStyle(sidebar) }),
    children: [textRun(item, { font, color, size: sidebar ? 18 : 20, underline: link ? {} : undefined })],
    // Explicitly override Word's list-style defaults. A list item gets a
    // compact, single-line rhythm; ordinary values share the body boundary.
    spacing: { before: 0, after: bullet ? spacing.bulletAfter : (sidebar ? spacing.sidebarParagraphAfter : spacing.itemAfter), line: spacing.line },
  }));
}

function ratedSkillRows(skillEntries, {
  font,
  color = '333333',
  sidebar = false,
  spacing,
  availableWidth = DOCX_CONTENT_WIDTH,
} = {}) {
  const textColor = sidebar ? 'FFFFFF' : color;
  const columnWidths = splitDocxWidth(availableWidth, sidebar ? 0.55 : 0.75);
  const [nameWidth, ratingWidth] = columnWidths;

  // A compact table row lets Word align the rating to the available right edge
  // in both full-width and two-column templates, without sacrificing a real
  // list bullet before the skill name.
  return skillEntries.map(({ name, rating }) => new Table({
    ...fixedDocxTableGeometry(availableWidth, columnWidths),
    borders: DOCX_NO_BORDERS,
    rows: [new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: nameWidth, type: WidthType.DXA },
          borders: DOCX_NO_BORDERS,
          verticalAlign: VerticalAlignTable.TOP,
          margins: DOCX_ZERO_CELL_MARGINS,
          children: [new Paragraph({
            ...docxBulletProperties(spacing),
            spacing: { before: 0, after: spacing.bulletAfter, line: spacing.line },
            children: [textRun(name, { font, color: textColor, size: sidebar ? 18 : 20 })],
          })],
        }),
        new TableCell({
          width: { size: ratingWidth, type: WidthType.DXA },
          borders: DOCX_NO_BORDERS,
          verticalAlign: VerticalAlignTable.TOP,
          margins: DOCX_ZERO_CELL_MARGINS,
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 0, after: spacing.bulletAfter, line: spacing.line },
            children: [textRun(`${rating}/5`, {
              font,
              color: textColor,
              size: sidebar ? 16 : 20,
            })],
          })],
        }),
      ],
    })],
  }));
}

function entryHeader(left, right, {
  font,
  color,
  rightColor = color,
  sidebar = false,
  availableWidth = DOCX_CONTENT_WIDTH,
}) {
  const columnWidths = splitDocxWidth(availableWidth, availableWidth < 4800 ? 0.62 : (7600 / DOCX_CONTENT_WIDTH));
  const [leftWidth, rightWidth] = columnWidths;
  return new Table({
    ...fixedDocxTableGeometry(availableWidth, columnWidths),
    borders: DOCX_NO_BORDERS,
    rows: [new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: leftWidth, type: WidthType.DXA },
          borders: DOCX_NO_BORDERS,
          verticalAlign: VerticalAlignTable.TOP,
          margins: DOCX_ZERO_CELL_MARGINS,
          children: [paragraphText(left, { font, color: sidebar ? 'FFFFFF' : '202020', size: sidebar ? 19 : 21, style: DOCX_STYLE.entryTitle, spacing: { after: 0 } })],
        }),
        new TableCell({
          width: { size: rightWidth, type: WidthType.DXA },
          borders: DOCX_NO_BORDERS,
          verticalAlign: VerticalAlignTable.TOP,
          margins: DOCX_ZERO_CELL_MARGINS,
          children: [new Paragraph({
            style: DOCX_STYLE.metadata,
            alignment: AlignmentType.RIGHT,
            spacing: { after: 0 },
            children: [textRun(right, { font, color: sidebar ? 'FFFFFF' : rightColor, bold: true, size: sidebar ? 17 : 18 })],
          })],
        }),
      ],
    })],
  });
}

function workParagraphs(entries, {
  font,
  color,
  spacing,
  sidebar = false,
  availableWidth = DOCX_CONTENT_WIDTH,
}) {
  return entries.flatMap(job => {
    const title = compactText(job.jobTitle) || 'Position';
    const date = formatResumeDateRange(job.startDate, job.endDate, job.currentJob);
    const employer = [job.employer, job.location].filter(Boolean).join(', ');
    return [
      entryHeader(title, date, { font, color, sidebar, availableWidth }),
      // This keeps the company line with the first bullet, but not the
      // entire entry. Remaining bullets can use the rest of the page.
      ...(employer ? [paragraphText(employer, { font, color: sidebar ? 'FFFFFF' : '555555', size: 18, style: DOCX_STYLE.metadata, keepNext: true, spacing: { before: 0, after: spacing.paragraphAfter, line: spacing.line }, runOptions: { italics: true } })] : []),
      ...richParagraphs(job.description, { font, color: sidebar ? 'FFFFFF' : '333333', sidebar, spacing }),
    ];
  });
}

function educationParagraphs(entries, {
  font,
  color,
  spacing,
  sidebar = false,
  availableWidth = DOCX_CONTENT_WIDTH,
}) {
  return entries.flatMap(entry => {
    const degree = compactText(entry.degree || entry.level || 'Education');
    const school = [entry.schoolName, entry.fieldOfStudy, entry.location].filter(Boolean).join(', ');
    return [
      entryHeader(degree, formatResumeMonth(entry.graduationDate), { font, color, sidebar, availableWidth }),
      ...(school ? [paragraphText(school, { font, color: sidebar ? 'FFFFFF' : '555555', size: 18, style: DOCX_STYLE.metadata, keepNext: true, spacing: { before: 0, after: spacing.itemAfter, line: spacing.line }, runOptions: { italics: true } })] : []),
    ];
  });
}

function detailParagraphs(state, section, style) {
  const { skills = {}, websites = [], personalDetails = {}, certifications = {}, languages = [] } = state;
  const { font, color, sidebar = false, spacing, availableWidth = DOCX_CONTENT_WIDTH } = style;
  const textColor = sidebar ? 'FFFFFF' : '333333';

  switch (section) {
    case 'summary': return richParagraphs(state.summary?.content, { font, color: textColor, spacing });
    case 'workHistory': return workParagraphs(state.workHistory || [], { font, color, sidebar, spacing, availableWidth });
    case 'education': return educationParagraphs(state.education || [], { font, color, sidebar, spacing, availableWidth });
    case 'skills': {
      const ratedSkills = ratedSkillEntries(skills.ratings);
      return ratedSkills.length
        ? skills.showRatings !== true
          ? itemParagraphs(ratedSkills.map(skill => skill.name), {
            font, color: textColor, sidebar, bullet: true, forceSidebarBullets: true, spacing,
          })
          : ratedSkillRows(ratedSkills, { font, color: textColor, sidebar, spacing, availableWidth })
        : richParagraphs(skills.textContent, { font, color: textColor, sidebar, spacing });
    }
    case 'websites': return itemParagraphs(websites.map(site => compactText(site?.url)), {
      font, color: sidebar ? 'FFFFFF' : '0563C1', sidebar, bullet: !sidebar, link: !sidebar, spacing,
    });
    case 'personalDetails': return Object.entries({
      'Date of birth': personalDetails.dob,
      Nationality: personalDetails.nationality,
      'Marital status': personalDetails.maritalStatus,
      Gender: personalDetails.gender,
    }).filter(([, value]) => compactText(value)).map(([label, value]) => new Paragraph({
      style: docxParagraphStyle(sidebar),
      children: [textRun(`${label}: `, { font, color: textColor, bold: true, size: sidebar ? 18 : 20 }), textRun(value, { font, color: textColor, size: sidebar ? 18 : 20 })],
      spacing: { before: 0, after: sidebar ? spacing.sidebarParagraphAfter : spacing.itemAfter, line: spacing.line },
    }));
    case 'certifications': return richParagraphs(certifications.content, { font, color: textColor, sidebar, spacing });
    case 'languages': return itemParagraphs(languages.map(language => compactText(language?.language)), { font, color: textColor, sidebar, spacing });
    default: return [];
  }
}

function sectionTitle(state, section, base) {
  return compactText(state.design?.sectionTitles?.[section]) || sectionLabel(section, base);
}

function docxSection(state, section, {
  font,
  color,
  sidebar = false,
  base,
  availableWidth = DOCX_CONTENT_WIDTH,
}) {
  const spacing = getResumeLayout(state).tokens.docx;
  const customSection = getCustomResumeSection(state, section);
  if (customSection) {
    const content = richParagraphs(customSection.content, { font, color: sidebar ? 'FFFFFF' : '333333', sidebar, spacing });
    return content.length
      ? [docxSectionHeading(compactText(customSection.title) || 'Additional Information', { font, color, sidebar, spacing }), ...content]
      : [];
  }
  const content = detailParagraphs(state, section, { font, color, sidebar, spacing, availableWidth });
  return content.length ? [docxSectionHeading(sectionTitle(state, section, base), { font, color, sidebar, spacing }), ...content] : [];
}

// Word handles separate, reasonably sized table rows well across pages, but
// tends to move a single tall two-column row wholesale to the next page. Keep
// each section in small visual blocks so both columns retain their layout while
// long summaries, job histories, and custom sections can continue naturally.
function chunkDocxColumnSections(sections, maxChildren = 4) {
  return sections.flatMap(children => {
    const chunks = [];
    // Plain list sections (skills, certifications, custom sections) are
    // compact and should normally stay in one column row. Splitting a short
    // skills list merely because the opposite column is taller is what caused
    // the random-looking vertical gaps in Word.
    const chunkSize = children.some(child => child instanceof Table)
      ? maxChildren
      : Math.max(maxChildren, 6);
    for (let index = 0; index < children.length;) {
      let end = Math.min(index + chunkSize, children.length);
      const lastHeaderIndex = children.slice(index, end).findLastIndex(child => child instanceof Table);

      // An entry header is followed by company/date context and its first
      // description block. Never leave only that header at the end of a
      // column-table row, or Word creates a large visual gap before the first
      // bullet in the following row.
      if (lastHeaderIndex >= 0) {
        const absoluteHeaderIndex = index + lastHeaderIndex;
        const followingChildren = end - absoluteHeaderIndex - 1;
        if (followingChildren < 2 && absoluteHeaderIndex > index) {
          end = absoluteHeaderIndex;
        }
      }

      // A single over-sized child must still be emitted so very long custom
      // content can continue across pages instead of stalling the export.
      if (end <= index) end = Math.min(index + chunkSize, children.length);
      chunks.push(children.slice(index, end));
      index = end;
    }
    return chunks;
  });
}

function flowingDocxColumns({
  leftSections,
  rightSections,
  columnWidths,
  borders = DOCX_NO_BORDERS,
  leftCellBorders = DOCX_NO_BORDERS,
  rightCellBorders = DOCX_NO_BORDERS,
  leftCellShading,
  rightCellShading,
  leftMargins = DOCX_ZERO_CELL_MARGINS,
  rightMargins = DOCX_ZERO_CELL_MARGINS,
}) {
  const leftChunks = chunkDocxColumnSections(leftSections);
  const rightChunks = chunkDocxColumnSections(rightSections);
  const rowCount = Math.max(leftChunks.length, rightChunks.length, 1);
  const [leftWidth, rightWidth] = columnWidths;
  const tableWidth = leftWidth + rightWidth;
  const emptyCell = () => [new Paragraph({ style: DOCX_STYLE.body, spacing: { after: 0 } })];
  const rowMargins = (margins, index) => ({ ...margins, top: index === 0 ? margins.top : 0 });

  // Do not put every row in one parent table. Word may keep that whole table
  // together when a cell contains a nested job-header table, yielding a blank
  // first page. Independent, compact two-cell tables are free to follow one
  // another onto the current page or the next page as space permits.
  return Array.from({ length: rowCount }, (_, index) => new Table({
    ...fixedDocxTableGeometry(tableWidth, columnWidths),
    borders: index === 0 ? borders : { ...borders, top: DOCX_NO_BORDER },
    rows: [new TableRow({
      // Deliberately omit `cantSplit`: Word can now paginate between these
      // small blocks instead of reserving a page-sized, unbreakable container.
      children: [
        new TableCell({
          width: { size: leftWidth, type: WidthType.DXA },
          borders: leftCellBorders,
          shading: leftCellShading,
          verticalAlign: VerticalAlignTable.TOP,
          margins: rowMargins(leftMargins, index),
          children: leftChunks[index]?.length ? leftChunks[index] : emptyCell(),
        }),
        new TableCell({
          width: { size: rightWidth, type: WidthType.DXA },
          borders: rightCellBorders,
          shading: rightCellShading,
          verticalAlign: VerticalAlignTable.TOP,
          margins: rowMargins(rightMargins, index),
          children: rightChunks[index]?.length ? rightChunks[index] : emptyCell(),
        }),
      ],
    })],
  }));
}

function docxContactLine(contact) {
  return [contact?.email, contact?.phone, [contact?.city, contact?.country].filter(Boolean).join(', ')].filter(Boolean).join(' | ');
}

function headerBanner(fullName, contactLine, { font, color }) {
  return new Table({
    ...fixedDocxTableGeometry(DOCX_CONTENT_WIDTH),
    borders: DOCX_NO_BORDERS,
    rows: [new TableRow({ children: [new TableCell({
      width: { size: DOCX_CONTENT_WIDTH, type: WidthType.DXA },
      borders: DOCX_NO_BORDERS,
      shading: { type: ShadingType.CLEAR, fill: color },
      margins: { top: 300, bottom: 260, left: 280, right: 280 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [textRun(fullName, { font, bold: true, color: 'FFFFFF', size: 32 })] }),
        ...(contactLine ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [textRun(contactLine, { font, color: 'FFFFFF', size: 17 })] })] : []),
      ],
    })] })],
  });
}

function headerSplit(fullName, contactLine, { font, color, variant }) {
  if (variant === 'minimal') {
    return [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 45 }, children: [textRun(fullName, { font, bold: true, color: '202020', size: 34 })] }),
      ...(contactLine ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [textRun(contactLine, { font, color: '555555', size: 18 })] })] : []),
    ];
  }

  const framed = variant === 'framed';
  const columnWidths = splitDocxWidth(DOCX_CONTENT_WIDTH, 7000 / DOCX_CONTENT_WIDTH);
  const [nameWidth, contactWidth] = columnWidths;
  return new Table({
    ...fixedDocxTableGeometry(DOCX_CONTENT_WIDTH, columnWidths),
    borders: framed ? {
      top: { style: BorderStyle.SINGLE, size: 14, color },
      bottom: { style: BorderStyle.SINGLE, size: 14, color },
      left: DOCX_NO_BORDER,
      right: DOCX_NO_BORDER,
      insideHorizontal: DOCX_NO_BORDER,
      insideVertical: DOCX_NO_BORDER,
    } : {
      ...DOCX_NO_BORDERS,
      bottom: { style: BorderStyle.SINGLE, size: 14, color },
    },
    rows: [new TableRow({ children: [
      new TableCell({
        width: { size: nameWidth, type: WidthType.DXA },
        borders: DOCX_NO_BORDERS,
        margins: { top: 150, bottom: 150, left: 20, right: 120 },
        children: [new Paragraph({ spacing: { after: 0 }, children: [textRun(fullName, { font, bold: true, color: '202020', size: 32 })] })],
      }),
      new TableCell({
        width: { size: contactWidth, type: WidthType.DXA },
        borders: DOCX_NO_BORDERS,
        margins: { top: 165, bottom: 150, left: 120, right: 20 },
        verticalAlign: VerticalAlignTable.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 }, children: [textRun(contactLine, { font, color: '555555', size: 16 })] })],
      }),
    ] })],
  });
}

function docxPageBorders(state, color) {
  const size = { thin: 6, medium: 12, thick: 24 }[state.design?.pageBorder];
  if (!size) return undefined;
  const border = { style: BorderStyle.SINGLE, size, color, space: 14 };
  return { pageBorderTop: border, pageBorderRight: border, pageBorderBottom: border, pageBorderLeft: border };
}

function docxSharedStyles(font, spacing) {
  const bodyParagraph = {
    spacing: { before: 0, after: spacing.paragraphAfter, line: spacing.line },
    indent: { left: spacing.bodyIndent, right: 0 },
  };
  return {
    paragraphStyles: [
      { id: DOCX_STYLE.body, name: 'Resume Body', basedOn: 'Normal', quickFormat: true, run: { font, size: 20 }, paragraph: bodyParagraph },
      { id: DOCX_STYLE.bullet, name: 'Resume Bullet', basedOn: DOCX_STYLE.body, quickFormat: true, run: { font, size: 20 }, paragraph: { ...bodyParagraph, indent: { left: spacing.bulletIndent, hanging: spacing.bulletHanging } } },
      { id: DOCX_STYLE.heading, name: 'Resume Heading', basedOn: DOCX_STYLE.body, quickFormat: true, run: { font, bold: true, size: 22 }, paragraph: { ...bodyParagraph, keepNext: true } },
      { id: DOCX_STYLE.entryTitle, name: 'Resume Entry Title', basedOn: DOCX_STYLE.body, quickFormat: true, run: { font, bold: true, size: 21 }, paragraph: { ...bodyParagraph, keepNext: true } },
      { id: DOCX_STYLE.metadata, name: 'Resume Metadata', basedOn: DOCX_STYLE.body, quickFormat: true, run: { font, size: 18 }, paragraph: bodyParagraph },
      { id: DOCX_STYLE.sidebarText, name: 'Resume Sidebar Text', basedOn: DOCX_STYLE.body, quickFormat: true, run: { font, size: 18 }, paragraph: bodyParagraph },
      { id: DOCX_STYLE.contact, name: 'Resume Contact', basedOn: DOCX_STYLE.body, quickFormat: true, run: { font, size: 18 }, paragraph: bodyParagraph },
    ],
  };
}

function docxBulletNumbering(spacing) {
  return {
    config: [{
      reference: DOCX_BULLET_REFERENCE,
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: '•',
        alignment: AlignmentType.LEFT,
        style: {
          paragraph: {
            indent: { left: spacing.bulletIndent, hanging: spacing.bulletHanging },
            spacing: { before: 0, after: spacing.bulletAfter, line: spacing.line },
          },
        },
      }],
    }],
  };
}

function standardDocxChildren(state, { font, color, base, header }) {
  const contact = state.contact || {};
  const fullName = compactText([contact.firstName, contact.surname].filter(Boolean).join(' ')) || 'Your Name';
  const contactLine = docxContactLine(contact);
  const headerLayout = header === 'banner'
    ? headerBanner(fullName, contactLine, { font, color })
    : headerSplit(fullName, contactLine, { font, color, variant: header });
  const headerBlock = Array.isArray(headerLayout) ? headerLayout : [headerLayout];
  const { sectionOrder: order } = getResumeLayout(state);
  const content = order.flatMap(section => docxSection(state, section, { font, color, base }));
  return [...headerBlock, ...content];
}

function headlineForTemplate(state, fallback) {
  return compactText(state.workHistory?.[0]?.jobTitle) || fallback;
}

function contactParagraphs(contact, { font, spacing }) {
  return [contact?.phone, contact?.email, [contact?.city, contact?.country].filter(Boolean).join(', ')]
    .filter(compactText)
    .map(value => paragraphText(value, { font, color: '333333', size: 18, style: DOCX_STYLE.contact, spacing: { before: 0, after: spacing.itemAfter, line: spacing.line } }));
}

function accountantDocxChildren(state, { font, color, base }) {
  const contact = state.contact || {};
  const fullName = compactText([contact.firstName, contact.surname].filter(Boolean).join(' ')) || 'Your Name';
  const layout = getResumeLayout(state);
  const { sectionOrder: order, columns, tokens, sidebarPosition } = layout;
  const columnWidths = [7200, 3266];
  const leftMargins = { top: 260, bottom: 0, left: 0, right: 280 };
  const rightMargins = { top: 260, bottom: 0, left: 280, right: 0 };
  const leftContentWidth = docxInnerWidth(columnWidths[0], leftMargins);
  const rightContentWidth = docxInnerWidth(columnWidths[1], rightMargins);
  const header = new Table({
    ...fixedDocxTableGeometry(DOCX_CONTENT_WIDTH),
    borders: DOCX_NO_BORDERS,
    rows: [new TableRow({ children: [new TableCell({
      width: { size: DOCX_CONTENT_WIDTH, type: WidthType.DXA },
      borders: DOCX_NO_BORDERS,
      shading: { type: ShadingType.CLEAR, fill: 'F1F1F0' },
      margins: { top: 340, bottom: 250, left: 300, right: 300 },
      children: [
        new Paragraph({ spacing: { after: 70 }, children: [textRun(fullName, { font, bold: true, color: '2D2D2F', size: 37, characterSpacing: 5 })] }),
        new Paragraph({ spacing: { after: 0 }, children: [textRun(headlineForTemplate(state, 'Professional Accountant'), { font, color: '8A857D', size: 24 })] }),
      ],
    })] })],
  });

  const leftColumnIds = sidebarPosition === 'right' ? columns.main : columns.sidebar;
  const rightColumnIds = sidebarPosition === 'right' ? columns.sidebar : columns.main;
  const summaryInFullWidth = state.meta?.templateId === 'accountant' && leftColumnIds.includes('summary');
  const summary = summaryInFullWidth ? docxSection(state, 'summary', { font, color, base }) : [];
  const mainSections = order
    .filter(section => leftColumnIds.includes(section) && !(section === 'summary' && summaryInFullWidth))
    .map(section => docxSection(state, section, { font, color, base, availableWidth: leftContentWidth }));
  const contactContent = contactParagraphs(contact, { font, spacing: tokens.docx });
  const sidebarSections = [
    ...(contactContent.length ? [[docxSectionHeading('Contact', { font, color, spacing: tokens.docx }), ...contactContent]] : []),
    ...order
      .filter(section => rightColumnIds.includes(section))
      .map(section => docxSection(state, section, { font, color, base, availableWidth: rightContentWidth })),
  ];

  return [
    header,
    ...summary,
    ...flowingDocxColumns({
      leftSections: mainSections,
      rightSections: sidebarSections,
      columnWidths,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 8, color: 'DDDDDB' },
        bottom: DOCX_NO_BORDER,
        left: DOCX_NO_BORDER,
        right: DOCX_NO_BORDER,
        insideHorizontal: DOCX_NO_BORDER,
        insideVertical: DOCX_NO_BORDER,
      },
      leftCellBorders: { ...DOCX_NO_BORDERS, right: { style: BorderStyle.SINGLE, size: 8, color: 'DDDDDB' } },
      leftMargins,
      rightMargins,
    }),
  ];
}

function developerDocxChildren(state, { font, color, base }) {
  const contact = state.contact || {};
  const fullName = compactText([contact.firstName, contact.surname].filter(Boolean).join(' ')) || 'Your Name';
  const layout = getResumeLayout(state);
  const { sectionOrder: order, columns } = layout;
  const columnWidths = [4140, 6326];
  const leftMargins = { top: 0, bottom: 0, left: 0, right: 260 };
  const rightMargins = { top: 0, bottom: 0, left: 260, right: 0 };
  const leftContentWidth = docxInnerWidth(columnWidths[0], leftMargins);
  const rightContentWidth = docxInnerWidth(columnWidths[1], rightMargins);
  const contactLine = docxContactLine(contact);
  const header = [
    new Paragraph({ spacing: { after: 95 }, children: [textRun(fullName, { font, bold: true, color: '050505', size: 37, characterSpacing: 5 })] }),
    new Paragraph({ spacing: { after: 180 }, children: [textRun(headlineForTemplate(state, 'Developer'), { font, bold: true, color: '050505', size: 25, characterSpacing: 3 })] }),
    ...(contactLine ? [new Paragraph({ spacing: { after: 260 }, children: [textRun(contactLine, { font, color, size: 18 })] })] : []),
  ];
  const leftSections = order
    .filter(section => columns.sidebar.includes(section))
    .map(section => docxSection(state, section, { font, color, base, availableWidth: leftContentWidth }));
  const rightSections = order
    .filter(section => columns.main.includes(section))
    .map(section => docxSection(state, section, { font, color, base, availableWidth: rightContentWidth }));

  return [
    ...header,
    ...flowingDocxColumns({
      leftSections,
      rightSections,
      columnWidths,
      borders: DOCX_NO_BORDERS,
      leftMargins,
      rightMargins,
    }),
  ];
}

function timelineDocxChildren(state, { font, color, base }) {
  const contact = state.contact || {};
  const fullName = compactText([contact.firstName, contact.surname].filter(Boolean).join(' ')) || 'Your Name';
  const layout = getResumeLayout(state);
  const { sectionOrder: order, columns, tokens } = layout;
  const columnWidths = [3400, 7066];
  const leftMargins = { top: 0, bottom: 0, left: 0, right: 250 };
  const rightMargins = { top: 0, bottom: 0, left: 280, right: 0 };
  const leftContentWidth = docxInnerWidth(columnWidths[0], leftMargins);
  const rightContentWidth = docxInnerWidth(columnWidths[1], rightMargins);
  const header = [
    new Paragraph({ spacing: { after: 70 }, children: [textRun(fullName, { font, bold: true, color: '2E3A4D', size: 37, characterSpacing: 5 })] }),
    new Paragraph({ spacing: { after: 230 }, children: [textRun(headlineForTemplate(state, 'Professional'), { font, color: '333333', size: 23, characterSpacing: 2 })] }),
  ];
  const contactContent = contactParagraphs(contact, { font, spacing: tokens.docx });
  const leftSections = [
    ...(contactContent.length ? [[docxSectionHeading('Contact', { font, color, spacing: tokens.docx }), ...contactContent]] : []),
    ...order
      .filter(section => columns.sidebar.includes(section))
      .map(section => docxSection(state, section, { font, color, base, availableWidth: leftContentWidth })),
  ];
  const rightSections = order
    .filter(section => columns.main.includes(section))
    .map(section => docxSection(state, section, { font, color, base, availableWidth: rightContentWidth }));

  return [
    ...header,
    ...flowingDocxColumns({
      leftSections,
      rightSections,
      columnWidths,
      borders: DOCX_NO_BORDERS,
      leftCellBorders: { ...DOCX_NO_BORDERS, right: { style: BorderStyle.SINGLE, size: 8, color: '4A4A4A' } },
      leftMargins,
      rightMargins,
    }),
  ];
}

function editorialDocxChildren(state, { font, color, base }) {
  const contact = state.contact || {};
  const fullName = compactText([contact.firstName, contact.surname].filter(Boolean).join(' ')) || 'Your Name';
  const contactLine = docxContactLine(contact);
  const header = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 55 }, children: [textRun(fullName, { font, color, size: 37 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 180 }, children: [textRun(headlineForTemplate(state, 'Professional'), { font, color: '555555', size: 23 })] }),
    ...(contactLine ? [new Table({
      ...fixedDocxTableGeometry(DOCX_CONTENT_WIDTH),
      borders: DOCX_NO_BORDERS,
      rows: [new TableRow({ children: [new TableCell({
        width: { size: DOCX_CONTENT_WIDTH, type: WidthType.DXA },
        borders: DOCX_NO_BORDERS,
        shading: { type: ShadingType.CLEAR, fill: 'F0F0F2' },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [textRun(contactLine, { font, color: '666666', size: 18 })] })],
      })] })],
    })] : []),
  ];
  const { sectionOrder: order } = getResumeLayout(state);
  return [...header, ...order.flatMap(section => docxSection(state, section, { font, color, base }))];
}

function creativeDocxChildren(state, { font, color, base }) {
  const contact = state.contact || {};
  const fullName = compactText([contact.firstName, contact.surname].filter(Boolean).join(' ')) || 'Your Name';
  const { columns, tokens } = getResumeLayout(state);
  const columnWidths = [DOCX_SIDEBAR_WIDTH, DOCX_MAIN_WIDTH];
  const leftMargins = { top: 420, bottom: 0, left: 320, right: 320 };
  const rightMargins = { top: 420, bottom: 0, left: 400, right: 400 };
  const sidebarContentWidth = docxInnerWidth(columnWidths[0], leftMargins);
  const mainContentWidth = docxInnerWidth(columnWidths[1], rightMargins);
  const sidebarSections = [
    [
      new Paragraph({ spacing: { before: 0, after: 120, line: tokens.docx.line }, children: [textRun(fullName, { font, bold: true, color: 'FFFFFF', size: 30 })] }),
      ...itemParagraphs(
        [contact.email, contact.phone, [contact.city, contact.country].filter(Boolean).join(', ')],
        { font, color: 'FFFFFF', sidebar: true, spacing: tokens.docx },
      ),
    ],
    ...columns.sidebar.map(section => docxSection(state, section, {
      font,
      color,
      sidebar: true,
      base,
      availableWidth: sidebarContentWidth,
    })),
  ];
  const mainSections = columns.main.map(section => docxSection(state, section, {
    font,
    color,
    base,
    availableWidth: mainContentWidth,
  }));

  // A single page-height table row used to make Word reserve a whole page for
  // the Creative rails. Emit compact, independent blocks just like the other
  // two-column templates. The colored rail is preserved per fragment while
  // long content can continue onto the page that actually has room.
  return flowingDocxColumns({
    leftSections: sidebarSections,
    rightSections: mainSections,
    columnWidths,
    borders: DOCX_NO_BORDERS,
    leftCellShading: { type: ShadingType.CLEAR, fill: color },
    leftMargins,
    rightMargins,
  });
}

/** Prepares an editable DOCX that preserves the selected template's structure. */
export async function prepareDOCXExport({ state, resumeName }) {
  if (!hasExportableContent(state)) {
    throw exportError('Add at least one resume detail before downloading.', 'validation');
  }

  const color = hexColor(state.design?.colorScheme || '6B21A8');
  const base = templateBase(state.meta?.templateId || 'classic');
  const font = base === 'ats-serif' && /^arial$/i.test(docxFontFamily(state)) ? 'Times New Roman' : docxFontFamily(state);
  const config = DOCX_TEMPLATE_CONFIG[base] || DOCX_TEMPLATE_CONFIG.classic;
  const docxSpacing = getResumeLayout(state).tokens.docx;
  const children = config.sidebar
    ? creativeDocxChildren(state, { font, color, base })
    : config.layout === 'accountant'
      ? accountantDocxChildren(state, { font, color, base })
      : config.layout === 'developer'
        ? developerDocxChildren(state, { font, color, base })
        : config.layout === 'timeline'
          ? timelineDocxChildren(state, { font, color, base })
          : config.layout === 'editorial'
            ? editorialDocxChildren(state, { font, color, base })
        : standardDocxChildren(state, { font, color, base, header: config.header });
  const documentFile = new Document({
    styles: docxSharedStyles(font, docxSpacing),
    numbering: docxBulletNumbering(docxSpacing),
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_WIDTH_TWIPS, height: PAGE_HEIGHT_TWIPS },
          margin: { top: PAGE_MARGIN_TWIPS, right: PAGE_MARGIN_TWIPS, bottom: PAGE_MARGIN_TWIPS, left: PAGE_MARGIN_TWIPS },
          borders: docxPageBorders(state, color) || (config.frame ? {
            pageBorderTop: { style: BorderStyle.SINGLE, size: 14, color, space: 14 },
            pageBorderRight: { style: BorderStyle.SINGLE, size: 14, color, space: 14 },
            pageBorderBottom: { style: BorderStyle.SINGLE, size: 14, color, space: 14 },
            pageBorderLeft: { style: BorderStyle.SINGLE, size: 14, color, space: 14 },
          } : undefined),
        },
      },
      children,
    }],
  });
  const blob = await Packer.toBlob(documentFile);
  const filename = `${filenameBase(state, resumeName)}.docx`;
  return validatedExportArtifact(blob, 'docx', filename);
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
