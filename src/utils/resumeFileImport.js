import { importedResumeHasContent, parseImportedResumeText } from './resumeImport.js';

export const MAX_RESUME_FILE_SIZE = 10 * 1024 * 1024;

const MIME_TYPES = {
  pdf: new Set(['application/pdf']),
  docx: new Set([
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
  txt: new Set(['text/plain']),
};

const GENERIC_MIME_TYPES = new Set(['', 'application/octet-stream']);

function importError(message, code = 'IMPORT_FAILED') {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function getResumeFileExtension(name = '') {
  const match = String(name).trim().match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() || '';
}

async function readBytes(file, start = 0, length = 65536) {
  const source = typeof file?.slice === 'function' ? file.slice(start, start + length) : file;
  if (!source || typeof source.arrayBuffer !== 'function') return new Uint8Array();
  return new Uint8Array(await source.arrayBuffer());
}

function latin1(bytes) {
  return new TextDecoder('latin1').decode(bytes);
}

function isLikelyHtml(text) {
  return /<(?:!doctype|html|head|body|script|iframe)\b/i.test(text);
}

/**
 * Validates the extension, declared MIME type, size, and a small content
 * signature. Browser MIME values are not universal, so empty/octet-stream
 * values may proceed only when the format signature is valid.
 */
export async function validateResumeFile(file) {
  if (!file || typeof file.name !== 'string') {
    return { valid: false, error: 'Choose a PDF, DOCX, or TXT resume to upload.', code: 'NO_FILE' };
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { valid: false, error: 'This file is empty. Please upload a resume that contains text.', code: 'EMPTY_FILE' };
  }

  if (file.size > MAX_RESUME_FILE_SIZE) {
    return { valid: false, error: 'This file is larger than 10 MB. Please upload a smaller resume.', code: 'FILE_TOO_LARGE' };
  }

  const extension = getResumeFileExtension(file.name);
  if (!Object.hasOwn(MIME_TYPES, extension)) {
    return { valid: false, error: 'Unsupported file format. Please upload a PDF, DOCX, or TXT resume.', code: 'UNSUPPORTED_FILE' };
  }

  const mimeType = String(file.type || '').toLowerCase();
  if (!GENERIC_MIME_TYPES.has(mimeType) && !MIME_TYPES[extension].has(mimeType)) {
    return { valid: false, error: 'Unsupported file format. Please upload a PDF, DOCX, or TXT resume.', code: 'UNSUPPORTED_MIME' };
  }

  try {
    const bytes = await readBytes(file);
    const sample = latin1(bytes);
    const utf8Sample = new TextDecoder().decode(bytes);

    if (extension === 'pdf' && !sample.includes('%PDF-')) {
      return { valid: false, error: 'This file does not match its PDF format. Please choose the original resume file.', code: 'INVALID_SIGNATURE' };
    }

    const docxDirectory = extension === 'docx' && file.size > bytes.length
      ? latin1(await readBytes(file, Math.max(0, file.size - 65536)))
      : sample;
    if (extension === 'docx' && (!sample.startsWith('PK') || !docxDirectory.includes('[Content_Types].xml') || !docxDirectory.includes('word/document.xml'))) {
      return { valid: false, error: 'This file does not match its DOCX format. Please choose the original resume file.', code: 'INVALID_SIGNATURE' };
    }

    if (extension === 'txt') {
      const nullBytes = [...bytes].filter(byte => byte === 0).length;
      if (nullBytes > 0 || isLikelyHtml(utf8Sample)) {
        return { valid: false, error: 'Unsupported file format. Please upload a PDF, DOCX, or TXT resume.', code: 'INVALID_TEXT' };
      }
    }
  } catch {
    return { valid: false, error: 'We could not read this file. Please try another resume.', code: 'FILE_READ_ERROR' };
  }

  return { valid: true, extension };
}

function lineText(items) {
  return items
    .sort((a, b) => (a.transform?.[4] || 0) - (b.transform?.[4] || 0))
    .map(item => item.str)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function linesFromItems(items) {
  const rows = [];
  [...items]
    .filter(item => String(item?.str || '').trim())
    .sort((a, b) => (b.transform?.[5] || 0) - (a.transform?.[5] || 0)
      || (a.transform?.[4] || 0) - (b.transform?.[4] || 0))
    .forEach(item => {
      const y = Number(item.transform?.[5] || 0);
      const row = rows.find(candidate => Math.abs(candidate.y - y) < 2);
      if (row) row.items.push(item);
      else rows.push({ y, items: [item] });
    });

  return rows
    .map(row => ({ ...row, text: lineText(row.items), x: Math.min(...row.items.map(item => item.transform?.[4] || 0)) }))
    .filter(row => row.text);
}

/**
 * PDF text is positioned rather than line-based. Detect a meaningful vertical
 * gutter and read each column independently to avoid interleaving a sidebar
 * with experience text. Single-column pages retain normal top-to-bottom rows.
 */
export function extractTextFromPdfItems(items) {
  const visibleItems = [...items].filter(item => String(item?.str || '').trim());
  const lines = linesFromItems(visibleItems);
  if (!lines.length) return '';

  // Evaluate the gutter from individual glyph runs. Rows in a two-column PDF
  // share the same Y coordinate, so their merged row would otherwise hide the
  // right column's X position.
  const xValues = visibleItems.map(item => item.transform?.[4] || 0).sort((a, b) => a - b);
  let split = null;
  let widestGap = 0;
  for (let index = 1; index < xValues.length; index += 1) {
    const gap = xValues[index] - xValues[index - 1];
    const leftCount = xValues.filter(value => value <= xValues[index - 1]).length;
    const rightCount = xValues.length - leftCount;
    if (gap > widestGap && gap >= 72 && leftCount >= 3 && rightCount >= 3) {
      widestGap = gap;
      split = xValues[index - 1] + gap / 2;
    }
  }

  if (!split) return lines.map(line => line.text).join('\n');

  const left = linesFromItems(visibleItems.filter(item => (item.transform?.[4] || 0) < split)).map(line => line.text);
  const right = linesFromItems(visibleItems.filter(item => (item.transform?.[4] || 0) >= split)).map(line => line.text);
  return [...left, ...right].join('\n');
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export function textFromDocxHtml(html) {
  return decodeEntities(String(html || '')
    .replace(/<li\b[^>]*>/gi, '\n• ')
    .replace(/<\/(?:p|div|h[1-6]|li|tr|table|section)>/gi, '\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<[^>]*>/g, ''))
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function mergeTextSources(...sources) {
  const normaliseLine = line => String(line || '').replace(/\s+/g, ' ').trim();
  const semanticKey = line => normaliseLine(line)
    // HTML table conversion prefixes cells with pipes and list items with
    // bullets. Treat those as presentation syntax when comparing sources.
    .replace(/^[|\s]*(?:[\u2022\u00b7\u25e6\u25aa\u25cf-]\s*)?/, '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  // Raw Mammoth text retains the document's reading order. Keep every raw
  // occurrence: repeated role titles are valid (and common) resume content.
  // HTML is only a supplementary source for cells omitted by raw extraction.
  const [rawSource = '', ...supplementarySources] = sources;
  const rawLines = String(rawSource || '').split(/\r?\n/).map(normaliseLine).filter(Boolean);
  const rawKeys = new Set(rawLines.map(semanticKey));
  const supplementarySeen = new Set();
  const supplementaryLines = supplementarySources
    .flatMap(source => String(source || '').split(/\r?\n/))
    .map(normaliseLine)
    .filter(line => {
      const key = semanticKey(line);
      if (!key || rawKeys.has(key) || supplementarySeen.has(key)) return false;
      supplementarySeen.add(key);
      return true;
    });

  return [...rawLines, ...supplementaryLines].join('\n');
}

export async function extractResumeText(file, { onProgress, validation: validatedFile } = {}) {
  const validation = validatedFile || await validateResumeFile(file);
  if (!validation.valid) throw importError(validation.error, validation.code);

  if (validation.extension === 'txt') {
    onProgress?.('Reading your resume...');
    return file.text();
  }

  if (validation.extension === 'pdf') {
    onProgress?.('Reading your resume...');
    const isBrowser = typeof window !== 'undefined';
    const pdfjsLib = isBrowser
      ? await import('pdfjs-dist/build/pdf.mjs')
      : await import('pdfjs-dist/legacy/build/pdf.mjs');
    if (isBrowser) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    }
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer(), disableWorker: !isBrowser }).promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(extractTextFromPdfItems(content.items));
      onProgress?.(`Reading page ${pageNumber} of ${pdf.numPages}...`);
    }
    await pdf.destroy?.();
    // Preserve page boundaries for the segmenter. It uses them to suppress
    // repeated headers/footers without resetting section context mid-resume.
    return pages.filter(Boolean).join('\n\f\n');
  }

  onProgress?.('Reading your resume...');
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const mammothSource = typeof window === 'undefined'
    ? { buffer: Buffer.from(arrayBuffer) }
    : { arrayBuffer };
  const [rawResult, htmlResult] = await Promise.all([
    mammoth.extractRawText(mammothSource),
    mammoth.convertToHtml(mammothSource),
  ]);
  // Mammoth's raw text is the cleanest source for paragraphs; HTML preserves
  // table cells and list structure that some DOCX files omit from raw text.
  return mergeTextSources(rawResult.value, textFromDocxHtml(htmlResult.value));
}

export function normalizeImportFailure(error) {
  if (error?.code && ['FILE_TOO_LARGE', 'UNSUPPORTED_FILE', 'UNSUPPORTED_MIME', 'INVALID_SIGNATURE', 'INVALID_TEXT', 'EMPTY_FILE', 'NO_FILE'].includes(error.code)) {
    return error.message;
  }
  if (/password/i.test(String(error?.name || '') + String(error?.message || ''))) {
    return 'This PDF is password-protected. Please upload an unlocked copy or start from scratch.';
  }
  if (error?.code === 'SCANNED_PDF') {
    return 'This PDF appears to contain scanned images and could not be reliably read. Upload a text-based PDF/DOCX/TXT resume or start from scratch.';
  }
  return 'We could not read this resume. Please try another file or start from scratch.';
}

/** Complete file-to-editable-data pipeline shared by click and drop uploads. */
export async function prepareResumeImport(file, { onProgress } = {}) {
  const validation = await validateResumeFile(file);
  if (!validation.valid) throw importError(validation.error, validation.code);

  const text = await extractResumeText(file, { onProgress, validation });
  const readableCharacters = String(text || '').replace(/\s/g, '').length;
  if (validation.extension === 'pdf' && readableCharacters < 40) {
    throw importError('This PDF appears to contain scanned images and could not be reliably read.', 'SCANNED_PDF');
  }
  onProgress?.('Analyzing resume sections...');
  onProgress?.('Preparing editable sections...');
  const parsed = parseImportedResumeText(text);
  if (!importedResumeHasContent(parsed)) {
    throw importError('We could not find editable resume details in that file.', 'EMPTY_RESUME');
  }
  return parsed;
}
