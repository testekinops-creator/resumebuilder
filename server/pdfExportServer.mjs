import { existsSync } from 'node:fs';
import process from 'node:process';
import express from 'express';
import puppeteer from 'puppeteer-core';

const PORT = Number(process.env.PDF_EXPORT_PORT || 5194);
const APP_URL = process.env.PDF_EXPORT_APP_URL || 'http://127.0.0.1:5193/resumebuilder/pdf-export';
const BROWSER_CANDIDATES = [
  process.env.PDF_BROWSER_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

const browserPath = BROWSER_CANDIDATES.find(candidate => existsSync(candidate));
let browserPromise;

function safeFilename(value) {
  const normalized = String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, ' - ')
    .replace(/\s*-\s*/g, ' - ')
    .trim()
    .slice(0, 100);
  return `${normalized || 'Resume'}.pdf`;
}

async function getBrowser() {
  if (!browserPath) {
    throw new Error('Google Chrome or Microsoft Edge was not found. Set PDF_BROWSER_PATH to a Chromium executable.');
  }

  if (browserPromise) {
    const existing = await browserPromise.catch(error => {
      browserPromise = undefined;
      throw error;
    });
    // Puppeteer 25 exposes connectivity as the `connected` property. Keep the
    // method form as a compatibility fallback for older installs.
    const isConnected = typeof existing.isConnected === 'function'
      ? existing.isConnected()
      : existing.connected;
    if (isConnected) return existing;
    browserPromise = undefined;
  }

  const launchPromise = puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  browserPromise = launchPromise;
  const browser = await browserPromise;
  browser.on('disconnected', () => {
    if (browserPromise === launchPromise) browserPromise = undefined;
  });
  return browser;
}

async function resetBrowser() {
  const staleBrowser = await browserPromise?.catch(() => null);
  browserPromise = undefined;
  await staleBrowser?.close().catch(() => undefined);
}

function isTransientBrowserError(error) {
  return /connection closed|target closed|session closed|browser.*disconnected|protocol error/i.test(
    error instanceof Error ? error.message : String(error),
  );
}

async function renderPdf(state, resumeName) {
  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    // Keep the viewport above the app's responsive preview breakpoint. The
    // export document itself remains a fixed 210mm A4 canvas.
    await page.setViewport({ width: 1280, height: 1123, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument(payload => {
      window.__RESUME_EXPORT_STATE__ = payload;
    }, { state, resumeName });
    await page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('[data-pdf-ready="true"]', { timeout: 15000 });
    await page.evaluate(() => document.fonts?.ready || Promise.resolve());
    await page.emulateMediaType('screen');
    const renderedText = await page.$eval('[data-pdf-ready="true"]', element => element.textContent?.trim() || '');
    if (!renderedText) {
      throw new Error('The PDF render page did not receive resume content.');
    }
    const pdf = await page.pdf({
      format: 'A4',
      preferCSSPageSize: true,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return { pdf, filename: safeFilename(resumeName ?? state.meta?.name) };
  } finally {
    await page?.close().catch(() => undefined);
  }
}

const app = express();
app.use(express.json({ limit: '2mb' }));

app.post('/api/resume-pdf', async (request, response) => {
  const { state, resumeName } = request.body || {};
  if (!state || typeof state !== 'object') {
    response.status(400).json({ error: 'A resume is required to export PDF.' });
    return;
  }

  try {
    let exportResult;
    try {
      exportResult = await renderPdf(state, resumeName);
    } catch (error) {
      if (!isTransientBrowserError(error)) throw error;
      await resetBrowser();
      exportResult = await renderPdf(state, resumeName);
    }

    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
      'Cache-Control': 'no-store',
    });
    response.send(exportResult.pdf);
  } catch (error) {
    console.error('PDF export failed:', error);
    response.status(500).json({ error: error instanceof Error ? error.message : 'PDF export failed.' });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Resume PDF export server listening on http://127.0.0.1:${PORT}`);
});

async function shutdown() {
  const browser = await browserPromise?.catch(() => null);
  await browser?.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
