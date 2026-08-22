import { existsSync } from 'node:fs';
import process from 'node:process';
import puppeteer from 'puppeteer-core';
import { TEMPLATES } from '../src/data/templates.js';

export const DEFAULT_PDF_EXPORT_URL = 'http://127.0.0.1:5193/pdf-export';
export const MAX_PDF_EXPORT_BODY_BYTES = 4_000_000;

const NAVIGATION_TIMEOUT_MS = 25_000;
const RENDER_TIMEOUT_MS = 15_000;
const PDF_EXPORT_DEADLINE_MS = 50_000;
const MIN_RETRY_BUDGET_MS = 12_000;
const MIN_PDF_BYTES = 1_000;
const MAX_PDF_BYTES = 4_000_000;
const MAX_SECTION_ENTRIES = 250;
const KNOWN_TEMPLATE_IDS = new Set(TEMPLATES.map(template => template.id));
const TEMPLATE_BY_ID = new Map(TEMPLATES.map(template => [template.id, template]));
const LOCAL_BROWSER_CANDIDATES = [
  process.env.PDF_BROWSER_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

let browserPromise;
let activeRenderCount = 0;

export class PdfExportError extends Error {
  constructor(message, { stage = 'unknown', statusCode = 500, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'PdfExportError';
    this.stage = stage;
    this.statusCode = statusCode;
  }
}

function stageError(stage, message, cause, statusCode = 500) {
  if (cause instanceof PdfExportError) return cause;
  return new PdfExportError(message, { stage, statusCode, cause });
}

function remainingTimeout(deadline, maximum, stage) {
  const remaining = deadline - Date.now();
  if (remaining < 1000) {
    throw new PdfExportError('The PDF export timed out before it could finish.', {
      stage,
      statusCode: 504,
    });
  }
  return Math.max(1000, Math.min(maximum, remaining));
}

function firstHeaderValue(value) {
  if (Array.isArray(value)) return value[0];
  return typeof value === 'string' ? value.split(',')[0].trim() : '';
}

export function safeDiagnosticId(value) {
  return String(value ?? 'unknown')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 80) || 'unknown';
}

export function safePdfFilename(value) {
  const base = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\u00a0/g, ' ')
    .trim()
    .replace(/[\\/:*?"<>|\r\n]+/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/^[_ .-]+|[_ .-]+$/g, '')
    .slice(0, 96);
  return `${base || 'Resume'}.pdf`;
}

export function getRequestOrigin(request) {
  const headers = request?.headers || {};
  const protocol = firstHeaderValue(headers['x-forwarded-proto']) || 'https';
  const host = firstHeaderValue(headers['x-forwarded-host']) || firstHeaderValue(headers.host);

  if (!/^(https?|http)$/.test(protocol) || !host || /[\s/@\\]/.test(host)) return undefined;

  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return undefined;
  }
}

export function resolvePdfExportUrl(appUrl) {
  const configuredUrl = process.env.PDF_EXPORT_APP_URL || appUrl || DEFAULT_PDF_EXPORT_URL;
  let url;
  try {
    url = new URL(configuredUrl);
  } catch (error) {
    throw stageError('validation', 'The PDF export application URL is invalid.', error, 500);
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new PdfExportError('The PDF export application URL is not allowed.', {
      stage: 'validation',
      statusCode: 500,
    });
  }

  const path = url.pathname.replace(/\/+$/, '');
  if (!path.endsWith('/pdf-export')) {
    url.pathname = `${path}/pdf-export`.replace(/^\/{2,}/, '/');
  }
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function validatePdfExportPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new PdfExportError('A JSON export request is required.', {
      stage: 'validation',
      statusCode: 400,
    });
  }

  const state = payload.state;
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new PdfExportError('A resume is required to export PDF.', {
      stage: 'validation',
      statusCode: 400,
    });
  }

  if (!state.meta || typeof state.meta !== 'object' || Array.isArray(state.meta)) {
    throw new PdfExportError('Resume metadata is required.', {
      stage: 'validation',
      statusCode: 400,
    });
  }

  const templateId = state.meta?.templateId || 'classic';
  if (typeof templateId !== 'string' || !KNOWN_TEMPLATE_IDS.has(templateId)) {
    throw new PdfExportError('The selected resume template is not supported.', {
      stage: 'validation',
      statusCode: 400,
    });
  }

  if (payload.resumeName != null && typeof payload.resumeName !== 'string') {
    throw new PdfExportError('The resume name must be text.', {
      stage: 'validation',
      statusCode: 400,
    });
  }


  const boundedArrays = [
    ['work history', state.workHistory],
    ['education', state.education],
    ['skills', state.skills?.ratings],
    ['websites', state.websites],
    ['languages', state.languages],
    ['custom sections', state.extraSections?.custom],
    ['selected sections', state.extraSections?.selected],
    ['additional details', state.personalDetails?.additionalInfo],
  ];
  for (const [label, value] of boundedArrays) {
    if (value != null && !Array.isArray(value)) {
      throw new PdfExportError(`Resume ${label} must be a list.`, {
        stage: 'validation',
        statusCode: 400,
      });
    }
    if (value?.length > MAX_SECTION_ENTRIES) {
      throw new PdfExportError(`Resume ${label} contains too many entries.`, {
        stage: 'validation',
        statusCode: 413,
      });
    }
  }

  const template = TEMPLATE_BY_ID.get(templateId);
  const requestedColor = state.design?.colorScheme;
  const colorScheme = typeof requestedColor === 'string' && /^#[\da-f]{6}$/i.test(requestedColor)
    ? requestedColor
    : template.defaultColor;
  const normalizedState = {
    ...state,
    meta: { ...state.meta, templateId },
    design: {
      ...(state.design && typeof state.design === 'object' && !Array.isArray(state.design)
        ? state.design
        : {}),
      colorScheme,
    },
  };

  return {
    state: normalizedState,
    resumeName: String(payload.resumeName || state.meta?.name || 'Resume').slice(0, 200),
    templateId,
    resumeId: safeDiagnosticId(state.meta?.id),
  };
}

async function restrictPageRequests(page, exportUrl) {
  const trustedUrl = new URL(exportUrl);
  await page.setRequestInterception(true);
  page.on('request', request => {
    const requestUrl = request.url();
    const resourceType = request.resourceType();
    let allowed = requestUrl.startsWith('data:') || requestUrl.startsWith('blob:');

    if (!allowed) {
      try {
        const parsed = new URL(requestUrl);
        allowed = parsed.origin === trustedUrl.origin
          || (parsed.origin === 'https://fonts.googleapis.com' && resourceType === 'stylesheet')
          || (parsed.origin === 'https://fonts.gstatic.com' && resourceType === 'font');
      } catch {
        allowed = false;
      }
    }

    const requestAction = allowed ? request.continue() : request.abort('blockedbyclient');
    void requestAction.catch(() => undefined);
  });
}

function assertTrustedExportLocation(page, exportUrl) {
  const expected = new URL(exportUrl);
  const actual = new URL(page.url());
  const expectedPath = expected.pathname.replace(/\/+$/, '') || '/';
  const actualPath = actual.pathname.replace(/\/+$/, '') || '/';
  if (actual.origin !== expected.origin || actualPath !== expectedPath) {
    throw new PdfExportError('The resume export route redirected to an untrusted location.', {
      stage: 'navigation',
      statusCode: 502,
    });
  }
}

function isServerlessChromiumRuntime() {
  return Boolean(
    process.env.VERCEL
      || process.env.AWS_LAMBDA_FUNCTION_NAME
      || process.env.AWS_EXECUTION_ENV,
  );
}

async function browserLaunchOptions(launchTimeoutMs) {
  if (isServerlessChromiumRuntime()) {
    let chromium;
    try {
      ({ default: chromium } = await import('@sparticuz/chromium'));
      chromium.setGraphicsMode = false;
      const executablePath = await chromium.executablePath();
      const args = await puppeteer.defaultArgs({
        args: chromium.args,
        headless: 'shell',
      });
      return {
        args,
        executablePath,
        headless: 'shell',
        timeout: launchTimeoutMs,
      };
    } catch (error) {
      throw stageError('browser_launch', 'Serverless Chromium could not be prepared.', error);
    }
  }

  const executablePath = LOCAL_BROWSER_CANDIDATES.find(candidate => existsSync(candidate));
  if (!executablePath) {
    throw new PdfExportError(
      'Google Chrome or Microsoft Edge was not found. Set PDF_BROWSER_PATH to a Chromium executable.',
      { stage: 'browser_launch' },
    );
  }

  return {
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    timeout: launchTimeoutMs,
  };
}

function browserIsConnected(browser) {
  return typeof browser?.isConnected === 'function' ? browser.isConnected() : Boolean(browser?.connected);
}

export async function getPdfBrowser({ launchTimeoutMs = 20_000 } = {}) {
  if (browserPromise) {
    const existing = await browserPromise.catch(error => {
      browserPromise = undefined;
      throw error;
    });
    if (browserIsConnected(existing)) return existing;
    browserPromise = undefined;
  }

  const launchPromise = (async () => {
    const options = await browserLaunchOptions(launchTimeoutMs);
    try {
      return await puppeteer.launch(options);
    } catch (error) {
      throw stageError('browser_launch', 'Chromium could not be launched for PDF export.', error);
    }
  })();

  browserPromise = launchPromise;
  try {
    const browser = await launchPromise;
    browser.on('disconnected', () => {
      if (browserPromise === launchPromise) browserPromise = undefined;
    });
    return browser;
  } catch (error) {
    if (browserPromise === launchPromise) browserPromise = undefined;
    throw error;
  }
}

export async function resetPdfBrowser() {
  const stalePromise = browserPromise;
  browserPromise = undefined;
  const browser = await stalePromise?.catch(() => null);
  await browser?.close().catch(() => undefined);
}

export function isTransientPdfExportError(error) {
  const statusCode = Number(error?.statusCode || error?.cause?.statusCode || 0);
  if ([408, 425, 429, 502, 503, 504].includes(statusCode)) return true;

  const errorText = [
    error instanceof Error ? error.message : String(error),
    error?.cause instanceof Error ? error.cause.message : '',
  ].join(' ');

  if (['browser_launch', 'page_create', 'navigation', 'render_ready', 'assets', 'pdf_generation']
    .includes(error?.stage)) {
    return /timeout|timed out|connection|target|session|browser|protocol|navigation|socket|closed|unavailable|failed to launch/i
      .test(errorText);
  }

  return /connection closed|target closed|session closed|browser.*disconnected|protocol error/i
    .test(errorText);
}

async function waitForResumeDocument(page, timeoutMs) {
  try {
    await page.waitForFunction(() => (
      document.querySelector('[data-pdf-ready="true"]')
      || document.querySelector('[data-pdf-error="true"]')
    ), { timeout: timeoutMs });
  } catch (error) {
    throw stageError('render_ready', 'The resume document did not become ready.', error);
  }

  const routeError = await page.$('[data-pdf-error="true"]');
  if (routeError) {
    throw new PdfExportError('The resume export route rejected its render payload.', {
      stage: 'render_ready',
    });
  }

  try {
    await page.evaluate(async timeoutMs => {
      if (!document.fonts?.ready) return;
      await Promise.race([
        document.fonts.ready.catch(() => undefined),
        new Promise(resolve => window.setTimeout(resolve, timeoutMs)),
      ]);
    }, timeoutMs);
  } catch (error) {
    throw stageError('assets', 'Resume fonts did not finish loading.', error);
  }

  try {
    await page.waitForFunction(
      () => Array.from(document.images).every(image => image.complete),
      { timeout: timeoutMs },
    );

    const brokenImageCount = await page.evaluate(() => (
      Array.from(document.images)
        .filter(image => (image.currentSrc || image.src) && image.naturalWidth === 0)
        .length
    ));
    if (brokenImageCount > 0) {
      throw new PdfExportError('One or more resume images could not be rendered.', { stage: 'assets' });
    }

    await page.evaluate(() => new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    }));
  } catch (error) {
    throw stageError('assets', 'Resume images did not finish loading.', error);
  }
}

async function assertRenderedResume(page) {
  let metrics;
  try {
    metrics = await page.$eval('[data-pdf-ready="true"]', documentRoot => {
      const pageRoot = documentRoot.querySelector('.preview-page') || documentRoot;
      const bounds = pageRoot.getBoundingClientRect();
      return {
        width: bounds.width,
        height: bounds.height,
        textLength: (pageRoot.textContent || '').trim().length,
      };
    });
  } catch (error) {
    throw stageError('dom_validation', 'The rendered resume document could not be inspected.', error);
  }

  // At 96 CSS pixels per inch, A4 is approximately 794 x 1123 px. The
  // tolerance keeps this assertion robust across Chromium font/render builds.
  if (metrics.width < 700 || metrics.height < 1_000 || metrics.textLength === 0) {
    throw new PdfExportError('The rendered resume document was empty or not A4-sized.', {
      stage: 'dom_validation',
    });
  }
}

function validatePdfBuffer(pdf) {
  const buffer = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf || []);
  if (buffer.byteLength < MIN_PDF_BYTES || buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new PdfExportError('Chromium returned an invalid PDF document.', {
      stage: 'pdf_validation',
    });
  }
  if (buffer.byteLength > MAX_PDF_BYTES) {
    throw new PdfExportError('The generated PDF is too large to download from this deployment.', {
      stage: 'pdf_validation',
      statusCode: 413,
    });
  }
  return buffer;
}

export async function renderResumePdf(payload, {
  appUrl,
  deadline = Date.now() + PDF_EXPORT_DEADLINE_MS,
} = {}) {
  const request = validatePdfExportPayload(payload);
  const exportUrl = resolvePdfExportUrl(appUrl);
  let context;
  let page;

  try {
    let browser;
    try {
      browser = await getPdfBrowser({
        launchTimeoutMs: remainingTimeout(deadline, 20_000, 'browser_launch'),
      });
      try {
        context = await browser.createBrowserContext();
        page = await context.newPage();
      } catch (contextError) {
        // Some constrained serverless Chromium builds reject incognito
        // contexts even though a clean page in the default context works.
        // The page still receives strict request interception and is closed
        // after every job; the browser process is reset on transient errors.
        context = undefined;
        try {
          page = await browser.newPage();
        } catch (pageError) {
          throw new AggregateError([contextError, pageError], 'A browser page could not be opened.');
        }
      }
    } catch (error) {
      throw stageError('page_create', 'A Chromium page could not be created.', error);
    }

    const renderTimeout = remainingTimeout(deadline, RENDER_TIMEOUT_MS, 'render_ready');
    page.setDefaultTimeout(renderTimeout);
    page.setDefaultNavigationTimeout(remainingTimeout(deadline, NAVIGATION_TIMEOUT_MS, 'navigation'));
    await page.setViewport({ width: 1280, height: 1123, deviceScaleFactor: 1 });
    await page.setBypassServiceWorker(true);
    await restrictPageRequests(page, exportUrl);

    try {
      await page.evaluateOnNewDocument(exportPayload => {
        window.__RESUME_EXPORT_STATE__ = exportPayload;
      }, { state: request.state, resumeName: request.resumeName });
    } catch (error) {
      throw stageError('payload_injection', 'The resume could not be provided to the export page.', error);
    }

    let response;
    try {
      response = await page.goto(exportUrl, {
        waitUntil: 'networkidle0',
        timeout: remainingTimeout(deadline, NAVIGATION_TIMEOUT_MS, 'navigation'),
      });
    } catch (error) {
      throw stageError('navigation', 'The resume export route could not be opened.', error);
    }

    const responseStatus = response?.status?.() || 0;
    if (!response || responseStatus < 200 || responseStatus >= 400) {
      throw new PdfExportError('The resume export route returned an unsuccessful response.', {
        stage: 'navigation',
        statusCode: responseStatus || 502,
      });
    }
    assertTrustedExportLocation(page, exportUrl);

    await page.emulateMediaType('print');
    await waitForResumeDocument(
      page,
      remainingTimeout(deadline, RENDER_TIMEOUT_MS, 'render_ready'),
    );
    await assertRenderedResume(page);

    let pdf;
    try {
      pdf = await page.pdf({
        format: 'A4',
        preferCSSPageSize: true,
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        timeout: remainingTimeout(deadline, RENDER_TIMEOUT_MS, 'pdf_generation'),
      });
    } catch (error) {
      throw stageError('pdf_generation', 'Chromium could not generate the PDF document.', error);
    }

    return {
      pdf: validatePdfBuffer(pdf),
      filename: safePdfFilename(request.resumeName),
      templateId: request.templateId,
      resumeId: request.resumeId,
    };
  } finally {
    if (context) await context.close().catch(() => undefined);
    else await page?.close().catch(() => undefined);
  }
}

export async function renderResumePdfWithRetry(payload, options) {
  if (activeRenderCount >= 1) {
    throw new PdfExportError('The PDF renderer is busy. Please retry in a moment.', {
      stage: 'capacity',
      statusCode: 429,
    });
  }

  activeRenderCount += 1;
  const deadline = options?.deadline || Date.now() + PDF_EXPORT_DEADLINE_MS;
  try {
    try {
      return await renderResumePdf(payload, { ...options, deadline });
    } catch (error) {
      if (!isTransientPdfExportError(error) || deadline - Date.now() < MIN_RETRY_BUDGET_MS) throw error;
      await resetPdfBrowser();
      return renderResumePdf(payload, { ...options, deadline });
    }
  } finally {
    activeRenderCount -= 1;
  }
}

export function logPdfExportFailure(error, { templateId, resumeId } = {}) {
  const isDevelopment = process.env.NODE_ENV !== 'production' && !process.env.VERCEL;
  const message = String(error instanceof PdfExportError
    ? error.message
    : 'Unexpected PDF export failure.')
    .replace(/\s+/g, ' ')
    .slice(0, 500);
  const cause = String(isDevelopment
    ? (error?.cause instanceof Error ? error.cause.message : error?.cause || '')
    : '')
    .replace(/\s+/g, ' ')
    .slice(0, 500);
  console.error('PDF export failed', {
    stage: safeDiagnosticId(error?.stage || 'unknown'),
    templateId: safeDiagnosticId(templateId),
    resumeId: safeDiagnosticId(resumeId),
    error: error instanceof Error ? error.name : 'Error',
    message,
    ...(cause ? { cause } : {}),
  });
}
