import process from 'node:process';
import { pathToFileURL } from 'node:url';
import express from 'express';
import {
  MAX_PDF_EXPORT_BODY_BYTES,
  PdfExportError,
  logPdfExportFailure,
  renderResumePdfWithRetry,
  resetPdfBrowser,
  safeDiagnosticId,
  validatePdfExportPayload,
} from './pdfRenderer.mjs';

const PORT = Number(process.env.PDF_EXPORT_PORT || 5194);
export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: MAX_PDF_EXPORT_BODY_BYTES, strict: true }));

app.post('/api/resume-pdf', async (request, response) => {
  let diagnostics = { templateId: 'unknown', resumeId: 'unknown' };

  try {
    const validated = validatePdfExportPayload(request.body);
    diagnostics = {
      templateId: safeDiagnosticId(validated.templateId),
      resumeId: safeDiagnosticId(validated.resumeId),
    };

    const result = await renderResumePdfWithRetry(request.body);
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Content-Length': String(result.pdf.byteLength),
    });
    response.status(200).end(result.pdf);
  } catch (error) {
    logPdfExportFailure(error, diagnostics);
    const statusCode = error instanceof PdfExportError ? error.statusCode : 500;
    const responseStatus = statusCode >= 400 && statusCode < 500 ? statusCode : 500;
    if (responseStatus === 429) response.set('Retry-After', '2');
    response.status(responseStatus).json({
      error: responseStatus === 400 || responseStatus === 429
        ? error.message
        : responseStatus === 413
          ? 'The resume is too large to export.'
          : 'PDF export failed.',
      stage: error?.stage || 'unknown',
    });
  }
});

app.use((error, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const bodyTooLarge = error?.type === 'entity.too.large' || error?.status === 413;
  const invalidJson = error instanceof SyntaxError && error?.type === 'entity.parse.failed';
  if (bodyTooLarge || invalidJson) {
    response.status(bodyTooLarge ? 413 : 400).json({
      error: bodyTooLarge ? 'The resume is too large to export.' : 'The export request is not valid JSON.',
      stage: 'validation',
    });
    return;
  }

  logPdfExportFailure(error);
  response.status(500).json({ error: 'PDF export failed.', stage: 'unknown' });
});

let server;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`Resume PDF export server listening on http://127.0.0.1:${PORT}`);
  });
}

async function shutdown() {
  await new Promise(resolve => {
    if (!server) {
      resolve();
      return;
    }
    server.close(resolve);
  });
  await resetPdfBrowser();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
