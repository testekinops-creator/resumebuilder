import assert from 'node:assert/strict';
import test from 'node:test';
import handler from '../api/resume-pdf.mjs';
import { TEMPLATES } from '../src/data/templates.js';
import {
  getRequestOrigin,
  resolvePdfExportUrl,
  safePdfFilename,
  validatePdfExportPayload,
} from '../server/pdfRenderer.mjs';

function mockResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: '',
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    end(body = '') {
      this.body = body;
      return this;
    },
  };
}

test('server validator accepts every registered template and rejects unknown IDs', () => {
  for (const template of TEMPLATES) {
    const result = validatePdfExportPayload({
      state: { meta: { id: `resume-${template.id}`, templateId: template.id } },
      resumeName: template.name,
    });
    assert.equal(result.templateId, template.id);
  }

  assert.throws(
    () => validatePdfExportPayload({ state: { meta: { templateId: 'unknown-template' } } }),
    error => error.stage === 'validation' && error.statusCode === 400,
  );
});

test('server validator normalizes unsafe design colors and bounds section arrays', () => {
  const normalized = validatePdfExportPayload({
    state: {
      meta: { templateId: 'timeline' },
      design: { colorScheme: 'url(http://169.254.169.254/latest/meta-data)' },
      workHistory: [],
    },
  });
  assert.equal(normalized.state.design.colorScheme, '#2E3A4D');

  const validColor = validatePdfExportPayload({
    state: { meta: { templateId: 'classic' }, design: { colorScheme: '#12aBcD' } },
  });
  assert.equal(validColor.state.design.colorScheme, '#12aBcD');

  assert.throws(
    () => validatePdfExportPayload({
      state: { meta: { templateId: 'classic' }, workHistory: Array.from({ length: 251 }, () => ({})) },
    }),
    error => error.stage === 'validation' && error.statusCode === 413,
  );
});

test('renderer URL targets the root SPA export route in local and deployed builds', () => {
  const previous = process.env.PDF_EXPORT_APP_URL;
  delete process.env.PDF_EXPORT_APP_URL;
  try {
    assert.equal(resolvePdfExportUrl(), 'http://127.0.0.1:5193/pdf-export');
    assert.equal(resolvePdfExportUrl('https://example.vercel.app'), 'https://example.vercel.app/pdf-export');
    assert.equal(resolvePdfExportUrl('https://example.vercel.app/pdf-export'), 'https://example.vercel.app/pdf-export');
  } finally {
    if (previous === undefined) delete process.env.PDF_EXPORT_APP_URL;
    else process.env.PDF_EXPORT_APP_URL = previous;
  }
});

test('request origins and attachment filenames are normalized safely', () => {
  assert.equal(getRequestOrigin({
    headers: {
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'resume.example.com',
    },
  }), 'https://resume.example.com');
  assert.equal(safePdfFilename(' Deepak / Résumé '), 'Deepak_Resume.pdf');
});

test('Vercel handler rejects unsupported methods and templates before launching Chromium', async () => {
  const methodResponse = mockResponse();
  await handler({ method: 'GET', headers: {} }, methodResponse);
  assert.equal(methodResponse.statusCode, 405);
  assert.equal(methodResponse.headers.allow, 'POST');

  const templateResponse = mockResponse();
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    await handler({
      method: 'POST',
      headers: { 'content-length': '60' },
      body: { state: { meta: { templateId: 'missing' } } },
    }, templateResponse);
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(templateResponse.statusCode, 400);
  const payload = JSON.parse(templateResponse.body);
  assert.equal(payload.stage, 'validation');
  assert.match(payload.error, /not supported/i);
});
