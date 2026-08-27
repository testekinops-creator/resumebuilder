import assert from 'node:assert/strict';
import test from 'node:test';
import handler, { getVercelAppOrigin } from '../api/resume-pdf.mjs';
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
      design: {
        colorScheme: 'url(http://169.254.169.254/latest/meta-data)',
        headingColor: 'expression(alert(1))',
        sidebarColor: 'red',
        dividerColor: '#12345g',
        themePreset: 'unknown-preset',
      },
      workHistory: [],
    },
  });
  assert.equal(normalized.state.design.colorScheme, '#2E3A4D');
  assert.match(normalized.state.design.headingColor, /^#[\dA-F]{6}$/i);
  assert.match(normalized.state.design.sidebarColor, /^#[\dA-F]{6}$/i);
  assert.match(normalized.state.design.dividerColor, /^#[\dA-F]{6}$/i);
  assert.equal(normalized.state.design.themePreset, 'default');

  const validColor = validatePdfExportPayload({
    state: { meta: { templateId: 'classic' }, design: { colorScheme: '#12aBcD', headingColor: '#010203', sidebarColor: '#AABBCC', dividerColor: '#dDeEfF' } },
  });
  assert.equal(validColor.state.design.colorScheme, '#12aBcD');
  assert.equal(validColor.state.design.headingColor, '#010203');
  assert.equal(validColor.state.design.sidebarColor, '#AABBCC');
  assert.equal(validColor.state.design.dividerColor, '#dDeEfF');

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

test('Vercel renderer prefers the stable production origin over a generated deployment URL', () => {
  assert.equal(getVercelAppOrigin({
    VERCEL_PROJECT_PRODUCTION_URL: 'resume.example.com',
    VERCEL_URL: 'resume-random-hash.vercel.app',
  }), 'https://resume.example.com');
  assert.equal(getVercelAppOrigin({
    VERCEL_URL: 'resume-random-hash.vercel.app',
  }), 'https://resume-random-hash.vercel.app');
  assert.equal(getVercelAppOrigin({
    VERCEL_PROJECT_PRODUCTION_URL: 'https://user@example.com/private',
  }), undefined);
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
