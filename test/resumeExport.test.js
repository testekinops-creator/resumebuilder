import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import mammoth from 'mammoth';
import { TEMPLATES } from '../src/data/templates.js';

/**
 * pdfGenerator uses extensionless imports because Vite resolves them in the
 * browser build. Node's native ESM loader intentionally does not. Load the
 * production source unchanged apart from resolving its three import specifiers
 * to absolute URLs so these tests exercise the actual exported functions.
 */
async function loadPdfGenerator() {
  const sourceUrl = new URL('../src/utils/pdfGenerator.js', import.meta.url);
  const resumeSectionsUrl = new URL('../src/utils/resumeSections.js', import.meta.url).href;
  const resumeDatesUrl = new URL('../src/utils/resumeDates.js', import.meta.url).href;
  const jsPdfUrl = import.meta.resolve('jspdf');
  const docxUrl = import.meta.resolve('docx');
  const source = await readFile(fileURLToPath(sourceUrl), 'utf8');
  const resolvableSource = source
    .replace("from 'jspdf'", `from '${jsPdfUrl}'`)
    .replace("from 'docx'", `from '${docxUrl}'`)
    .replace("from './resumeSections'", `from '${resumeSectionsUrl}'`)
    .replace("from './resumeDates'", `from '${resumeDatesUrl}'`);
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(resolvableSource).toString('base64')}`;
  return import(moduleUrl);
}

const {
  RESUME_EXPORT_FORMATS,
  buildEmailDraft,
  prepareDOCXExport,
  preparePDFExport,
  printResume,
} = await loadPdfGenerator();

function resumeState(templateId = 'classic') {
  return {
    meta: { id: `resume-${templateId}`, name: 'Deepak Resume', templateId },
    contact: {
      firstName: 'Deepak',
      lastName: 'Hegde',
      email: 'deepak@example.com',
      phone: '+91 98765 43210',
      city: 'Bengaluru',
    },
    summary: { content: '' },
    workHistory: [],
    education: [],
    skills: { textContent: '', ratings: [], showRatings: true },
    websites: [],
    personalDetails: {},
    certifications: { content: '' },
    languages: [],
    extraSections: { custom: [] },
    design: {
      colorScheme: '#2563EB',
      fontFamily: 'Arial',
      fontStyle: 'normal',
      sectionSpacing: 50,
      paragraphSpacing: 50,
      templateLayouts: {},
    },
  };
}

function validPdfResponse() {
  return new Response(new Blob(['%PDF-1.7\nresume fixture'], { type: 'application/pdf' }), {
    status: 200,
    headers: { 'Content-Type': 'application/pdf' },
  });
}

test('prepares a validated PDF artifact for every registered template ID', async () => {
  const requestedTemplateIds = [];

  for (const template of TEMPLATES) {
    const artifact = await preparePDFExport({
      state: resumeState(template.id),
      resumeName: 'Template Check',
      fetchImpl: async (url, options) => {
        assert.equal(url, '/api/resume-pdf');
        assert.equal(options.method, 'POST');
        assert.equal(options.headers['Content-Type'], 'application/json');
        const payload = JSON.parse(options.body);
        requestedTemplateIds.push(payload.state.meta.templateId);
        assert.equal(payload.resumeName, 'Template Check');
        return validPdfResponse();
      },
    });

    assert.equal(artifact.format, 'pdf');
    assert.equal(artifact.filename, 'Template Check.pdf');
    assert.equal(artifact.mimeType, RESUME_EXPORT_FORMATS.pdf.mimeType);
    assert.equal(artifact.blob.type, RESUME_EXPORT_FORMATS.pdf.mimeType);
    assert.ok(artifact.size > RESUME_EXPORT_FORMATS.pdf.signature.length);
  }

  assert.deepEqual(requestedTemplateIds, TEMPLATES.map(template => template.id));
});

test('retries one transient 503 response and returns the successful PDF', async () => {
  let calls = 0;
  const artifact = await preparePDFExport({
    state: resumeState('modern'),
    resumeName: 'Retry Resume',
    fetchImpl: async () => {
      calls += 1;
      return calls === 1
        ? new Response(JSON.stringify({ error: 'Renderer warming up', stage: 'launch' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
        : validPdfResponse();
    },
  });

  assert.equal(calls, 2);
  assert.equal(artifact.filename, 'Retry Resume.pdf');
  assert.equal(artifact.mimeType, 'application/pdf');
});

test('aborts a stalled PDF request and returns a recoverable timeout error', async () => {
  await assert.rejects(
    preparePDFExport({
      state: resumeState(),
      requestTimeoutMs: 10,
      fetchImpl: (url, { signal }) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('Request aborted', 'AbortError'));
        }, { once: true });
      }),
    }),
    error => {
      assert.equal(error.exportStage, 'request');
      assert.match(error.message, /took too long/i);
      return true;
    },
  );
});

test('preserves structured renderer stage/status and classifies a plain 404', async t => {
  await t.test('structured renderer failure', async () => {
    await assert.rejects(
      preparePDFExport({
        state: resumeState(),
        fetchImpl: async () => new Response(JSON.stringify({
          error: 'Template render crashed',
          stage: 'screenshot',
        }), {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        }),
      }),
      error => {
        assert.equal(error.message, 'Template render crashed');
        assert.equal(error.exportStage, 'screenshot');
        assert.equal(error.status, 422);
        return true;
      },
    );
  });

  await t.test('missing production API route', async () => {
    await assert.rejects(
      preparePDFExport({
        state: resumeState(),
        fetchImpl: async () => new Response('Not Found', {
          status: 404,
          headers: { 'Content-Type': 'text/plain' },
        }),
      }),
      error => {
        assert.match(error.message, /Could not create the selected-template PDF/i);
        assert.equal(error.exportStage, 'render');
        assert.equal(error.status, 404);
        return true;
      },
    );
  });
});

test('rejects empty and non-PDF success responses before they can be downloaded', async t => {
  const cases = [
    ['empty', new Blob([], { type: 'application/pdf' }), /empty file/i],
    ['invalid signature', new Blob(['<!doctype html>error'], { type: 'text/html' }), /invalid PDF file/i],
  ];

  for (const [name, body, messagePattern] of cases) {
    await t.test(name, async () => {
      await assert.rejects(
        preparePDFExport({
          state: resumeState(),
          fetchImpl: async () => new Response(body, { status: 200 }),
        }),
        error => {
          assert.match(error.message, messagePattern);
          assert.equal(error.exportStage, 'blob');
          return true;
        },
      );
    });
  }
});

test('fallback email draft names the file and never falsely claims it is attached', () => {
  const draft = buildEmailDraft({
    resumeName: 'Deepak Resume',
    filename: 'Deepak Resume.pdf',
    attachmentIncluded: false,
  });

  assert.equal(draft.subject, 'Resume - Deepak Resume');
  assert.match(draft.body, /Please attach Deepak Resume\.pdf before sending this email\./);
  assert.doesNotMatch(draft.body, /Please find .* attached/i);
  assert.match(decodeURIComponent(draft.url), /Please attach Deepak Resume\.pdf before sending this email\./);
  assert.doesNotMatch(decodeURIComponent(draft.url), /Please find .* attached/i);
});

test('prepares a DOCX artifact with the OOXML MIME type and ZIP signature', async () => {
  const artifact = await prepareDOCXExport({
    state: resumeState('classic'),
    resumeName: 'Deepak Resume',
  });

  assert.equal(artifact.format, 'docx');
  assert.equal(artifact.filename, 'Deepak Resume.docx');
  assert.equal(artifact.mimeType, RESUME_EXPORT_FORMATS.docx.mimeType);
  assert.equal(artifact.blob.type, RESUME_EXPORT_FORMATS.docx.mimeType);
  assert.ok(artifact.size > 100);
  assert.deepEqual(
    [...new Uint8Array(await artifact.blob.slice(0, 2).arrayBuffer())],
    RESUME_EXPORT_FORMATS.docx.signature,
  );
});

test('DOCX output uses the shared professional month format', async () => {
  const state = resumeState('developer');
  state.workHistory = [{
    id: 'work-1',
    jobTitle: 'Engineer',
    employer: 'Northstar Labs',
    startDate: '2022-11',
    endDate: 'Current',
    currentJob: false,
    description: '<p>Built dependable systems.</p>',
  }];
  state.education = [{
    id: 'education-1',
    degree: 'B.Sc.',
    schoolName: 'City University',
    graduationDate: '2021-07',
  }];

  const artifact = await prepareDOCXExport({ state, resumeName: 'Date Format Check' });
  const { value: documentText } = await mammoth.extractRawText({
    buffer: Buffer.from(await artifact.blob.arrayBuffer()),
  });

  assert.match(documentText, /November 2022 - Present/);
  assert.match(documentText, /July 2021/);
  assert.doesNotMatch(documentText, /2022-11|2021-07|Current/);
});

test('print does not hang when an already-failed image exists in the resume', async () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalAnimationFrame = globalThis.requestAnimationFrame;
  const imageClasses = new Set();
  let printCalls = 0;
  let afterPrint;

  const failedImage = {
    complete: true,
    currentSrc: 'data:image/png;base64,broken',
    src: 'data:image/png;base64,broken',
    naturalWidth: 0,
    classList: {
      add: value => imageClasses.add(value),
      remove: value => imageClasses.delete(value),
    },
  };
  const printablePage = {
    textContent: 'Deepak Hegde Test Engineer',
    getBoundingClientRect: () => ({ width: 794, height: 1123 }),
  };
  const printRoot = {
    querySelectorAll: selector => selector === 'img' ? [failedImage] : [],
    querySelector: selector => selector === '.preview-page' ? printablePage : null,
  };

  try {
    globalThis.document = {
      fonts: { ready: Promise.resolve() },
      querySelector: selector => selector === '#resume-print-root' ? printRoot : null,
    };
    globalThis.requestAnimationFrame = callback => {
      callback();
      return 1;
    };
    globalThis.window = {
      addEventListener: (name, listener) => {
        if (name === 'afterprint') afterPrint = listener;
      },
      removeEventListener: () => {},
      clearTimeout,
      setTimeout,
      print: () => {
        printCalls += 1;
        queueMicrotask(() => afterPrint?.());
      },
    };

    await printResume({ assetTimeoutMs: 10, afterPrintTimeoutMs: 20 });
    assert.equal(printCalls, 1);
    assert.equal(imageClasses.has('print-asset-unavailable'), true);
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalAnimationFrame === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = originalAnimationFrame;
  }
});

test('test loader resolves the production utility from the expected source path', () => {
  const expected = pathToFileURL(fileURLToPath(new URL('../src/utils/pdfGenerator.js', import.meta.url))).href;
  assert.match(expected, /src\/utils\/pdfGenerator\.js$/);
});
