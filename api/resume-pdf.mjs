import {
  MAX_PDF_EXPORT_BODY_BYTES,
  PdfExportError,
  logPdfExportFailure,
  renderResumePdfWithRetry,
  safeDiagnosticId,
  validatePdfExportPayload,
} from '../server/pdfRenderer.mjs';

export function getVercelAppOrigin(environment = process.env) {
  const configuredHost = environment.VERCEL_PROJECT_PRODUCTION_URL || environment.VERCEL_URL;
  if (!configuredHost) return undefined;

  try {
    const value = String(configuredHost).trim();
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/') {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

export const config = { maxDuration: 60 };

function sendJson(response, statusCode, payload) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.status(statusCode).end(JSON.stringify(payload));
}

function declaredBodySize(request) {
  const rawLength = Array.isArray(request.headers?.['content-length'])
    ? request.headers['content-length'][0]
    : request.headers?.['content-length'];
  const length = Number(rawLength);
  return Number.isFinite(length) && length >= 0 ? length : undefined;
}

async function readBody(request) {
  const contentLength = declaredBodySize(request);
  if (contentLength && contentLength > MAX_PDF_EXPORT_BODY_BYTES) {
    throw new PdfExportError('The resume is too large to export.', {
      stage: 'validation',
      statusCode: 413,
    });
  }

  if (request.body !== undefined) {
    if (request.body && typeof request.body === 'object' && !Buffer.isBuffer(request.body)) {
      const serialized = JSON.stringify(request.body);
      if (Buffer.byteLength(serialized) > MAX_PDF_EXPORT_BODY_BYTES) {
        throw new PdfExportError('The resume is too large to export.', {
          stage: 'validation',
          statusCode: 413,
        });
      }
      return request.body;
    }

    const rawBody = Buffer.isBuffer(request.body) ? request.body.toString('utf8') : String(request.body);
    if (Buffer.byteLength(rawBody) > MAX_PDF_EXPORT_BODY_BYTES) {
      throw new PdfExportError('The resume is too large to export.', {
        stage: 'validation',
        statusCode: 413,
      });
    }
    try {
      return JSON.parse(rawBody);
    } catch (error) {
      throw new PdfExportError('The export request is not valid JSON.', {
        stage: 'validation',
        statusCode: 400,
        cause: error,
      });
    }
  }

  const chunks = [];
  let receivedBytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    receivedBytes += buffer.byteLength;
    if (receivedBytes > MAX_PDF_EXPORT_BODY_BYTES) {
      throw new PdfExportError('The resume is too large to export.', {
        stage: 'validation',
        statusCode: 413,
      });
    }
    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    throw new PdfExportError('The export request is not valid JSON.', {
      stage: 'validation',
      statusCode: 400,
      cause: error,
    });
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    sendJson(response, 405, { error: 'Method not allowed.', stage: 'validation' });
    return;
  }

  let diagnostics = { templateId: 'unknown', resumeId: 'unknown' };

  try {
    const body = await readBody(request);
    const validated = validatePdfExportPayload(body);
    diagnostics = {
      templateId: safeDiagnosticId(validated.templateId),
      resumeId: safeDiagnosticId(validated.resumeId),
    };

    // Generated deployment URLs can be protected and are unsuitable for an
    // internal browser fetch. Prefer the stable project production origin.
    const requestOrigin = getVercelAppOrigin();
    if (!process.env.PDF_EXPORT_APP_URL && !requestOrigin) {
      throw new PdfExportError('The deployment origin could not be determined.', {
        stage: 'validation',
      });
    }

    const result = await renderResumePdfWithRetry(body, { appUrl: requestOrigin });
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    response.setHeader('Cache-Control', 'no-store, max-age=0');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Length', String(result.pdf.byteLength));
    response.status(200).end(result.pdf);
  } catch (error) {
    logPdfExportFailure(error, diagnostics);
    const requestedStatus = error instanceof PdfExportError ? error.statusCode : 500;
    const statusCode = requestedStatus >= 400 && requestedStatus < 500 ? requestedStatus : 500;
    if (statusCode === 429) response.setHeader('Retry-After', '2');
    sendJson(response, statusCode, {
      error: statusCode === 400 || statusCode === 429
        ? error.message
        : statusCode === 413
          ? 'The resume is too large to export.'
          : 'PDF export failed.',
      stage: error?.stage || 'unknown',
    });
  }
}
