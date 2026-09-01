import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { TEMPLATES } from '../src/data/templates.js';
import { getTemplatePresentation } from '../src/utils/resumePresentation.js';
import {
  RESUME_EXPORT_FORMATS,
  buildEmailDraft,
  prepareDOCXExport,
  preparePDFExport,
  printResume,
} from '../src/utils/pdfGenerator.js';

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

function structuralResumeState(templateId) {
  const state = resumeState(templateId);
  state.contact = {
    firstName: 'Zoë', surname: 'Łukasz', email: 'deepak.long.address@example.com',
    phone: '+91 98765 43210', city: 'Bengaluru', country: 'India',
  };
  state.summary.content = '<p>Results-focused quality engineer who improves reliable releases across complex platforms.</p>';
  state.workHistory = [
    {
      id: 'work-1', jobTitle: 'Senior Quality Automation Engineer for International Platforms',
      employer: 'Northstar Technology and Product Engineering Services', location: 'Bengaluru, India',
      startDate: '2022-11', currentJob: true,
      description: '<ul><li>Designed functional, regression, and integration suites for high-volume customer journeys.</li><li>Validated APIs, Unicode data such as café and naïve, and error handling across releases.</li></ul>',
    },
    {
      id: 'work-2', jobTitle: 'Quality Engineer', employer: 'Previous Company',
      startDate: '2020-01', endDate: '2022-10',
      description: '<ul><li>Maintained traceable test data and documented reproducible results.</li></ul>',
    },
  ];
  state.education = [{ id: 'education-1', degree: 'Bachelor of Science', schoolName: 'City University', fieldOfStudy: 'Computer Science', graduationDate: '2019-07' }];
  state.skills = { showRatings: true, textContent: '', ratings: [
    { id: 'skill-1', name: 'Selenium WebDriver and Playwright', rating: 5 },
    { id: 'skill-2', name: 'REST API automation', rating: 4 },
  ] };
  state.websites = [{ id: 'site-1', url: 'https://portfolio.example.com/profiles/deepak-hegde/quality-engineering-and-automation' }];
  state.personalDetails = { nationality: 'Indian' };
  state.certifications = { content: '<p>ISTQB Certified Tester</p>' };
  state.languages = [{ id: 'language-1', language: 'English' }, { id: 'language-2', language: 'Português' }];
  state.extraSections = { selected: ['custom-projects'], custom: [{ id: 'custom-projects', title: 'Projects', content: '<p>Created a reusable accessibility and API quality platform.</p>' }] };
  return state;
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
  assert.equal(artifact.filename, 'Deepak_Resume.docx');
  assert.equal(artifact.mimeType, RESUME_EXPORT_FORMATS.docx.mimeType);
  assert.equal(artifact.blob.type, RESUME_EXPORT_FORMATS.docx.mimeType);
  assert.ok(artifact.size > 100);
  assert.deepEqual(
    [...new Uint8Array(await artifact.blob.slice(0, 2).arrayBuffer())],
    RESUME_EXPORT_FORMATS.docx.signature,
  );
});

test('every template keeps essential text in fixed-width, flowing Word-native OOXML', async () => {
  const forbiddenPositioning = /<(?:wp:anchor|w:framePr|w:tblpPr|v:textbox|wps:wsp)\b/i;
  const attribute = (tag, name) => new RegExp(`\\b${name}="([^"]+)"`).exec(tag)?.[1];

  for (const template of TEMPLATES) {
    const artifact = await prepareDOCXExport({
      state: structuralResumeState(template.id),
      resumeName: `Mobile Compatibility ${template.id}`,
    });
    const zip = await JSZip.loadAsync(Buffer.from(await artifact.blob.arrayBuffer()));
    const documentXml = await zip.file('word/document.xml').async('string');
    const numberingXml = await zip.file('word/numbering.xml').async('string');

    const drawings = [...documentXml.matchAll(/<w:drawing\b[\s\S]*?<\/w:drawing>/g)];
    assert.equal(drawings.length, template.id === 'timeline' ? 4 : 0);
    for (const [drawing] of drawings) {
      assert.match(drawing, /descr="Decorative timeline circle"/);
      const text = [...drawing.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(match => match[1]).join('');
      assert.match(text, /^[●○]$/u, 'only nonessential timeline markers may use native shapes');
    }
    assert.doesNotMatch(documentXml.replace(/<w:drawing\b[\s\S]*?<\/w:drawing>/g, ''), forbiddenPositioning, `${template.id} must not contain floating or positioned primary content`);
    assert.doesNotMatch(documentXml, /<w:tblW\b[^>]*w:type="pct"/i, `${template.id} must not use percentage table widths`);
    assert.doesNotMatch(documentXml, /<w:tcW\b[^>]*w:type="pct"/i, `${template.id} must not use percentage cell widths`);
    assert.doesNotMatch(documentXml, /<w:t[^>]*>\s*[•★☆]\s*<\/w:t>/u, `${template.id} must use native bullets and portable rating text`);

    const pageSizeTag = documentXml.match(/<w:pgSz\b[^>]*\/?\s*>/i)?.[0] || '';
    const pageMarginTag = documentXml.match(/<w:pgMar\b[^>]*\/?\s*>/i)?.[0] || '';
    assert.equal(attribute(pageSizeTag, 'w:w'), '11906', `${template.id} must use A4 width`);
    assert.equal(attribute(pageSizeTag, 'w:h'), '16838', `${template.id} must use A4 height`);
    for (const edge of ['top', 'right', 'left']) assert.equal(attribute(pageMarginTag, `w:${edge}`), '0', `${template.id} must not add generic margins outside shared template insets`);
    const presentation = getTemplatePresentation(structuralResumeState(template.id));
    assert.equal(Number(attribute(pageMarginTag, 'w:bottom')), Math.round((presentation.capabilities.page.bodyBottomPx ?? presentation.pageMarginPx) * 15), `${template.id} must retain the shared bottom inset for natural pagination`);

    const tableDefinitions = [...documentXml.matchAll(/<w:tblPr>([\s\S]*?)<\/w:tblPr><w:tblGrid>([\s\S]*?)<\/w:tblGrid>/g)];
    assert.ok(tableDefinitions.length > 0, `${template.id} should contain at least one fixed Word table`);
    for (const [, tableProperties, tableGrid] of tableDefinitions) {
      const tableWidthTag = tableProperties.match(/<w:tblW\b[^>]*\/?\s*>/i)?.[0] || '';
      const width = Number(attribute(tableWidthTag, 'w:w'));
      const widthType = attribute(tableWidthTag, 'w:type');
      const grid = [...tableGrid.matchAll(/<w:gridCol\b[^>]*\/?\s*>/gi)]
        .map(match => Number(attribute(match[0], 'w:w')))
        .filter(Number.isFinite);
      assert.equal(widthType, 'dxa', `${template.id} table width must be absolute DXA`);
      assert.ok(width > 0, `${template.id} table width must be positive`);
      assert.ok(grid.length > 0, `${template.id} table must declare a fixed grid`);
      assert.equal(grid.reduce((sum, value) => sum + value, 0), width, `${template.id} grid columns must exactly equal table width`);
      assert.match(tableProperties, /<w:tblLayout\b[^>]*w:type="fixed"/i, `${template.id} table auto-fit must be disabled`);
    }

    assert.match(documentXml, /<w:keepNext\b/i, `${template.id} headings must stay with their first content block`);
    // Small, independently bounded nested cards may stay together. The root
    // header/body rows must never inherit those descendant row locks.
    let tableDepth = 0;
    let rootRowCount = 0;
    let rowPropertiesStart;
    const rootRowProperties = [];
    for (const match of documentXml.matchAll(/<(\/?)w:(tbl|tr|trPr)\b[^>]*>/g)) {
      if (match[2] === 'tbl') tableDepth += match[1] ? -1 : 1;
      else if (match[2] === 'tr') {
        if (tableDepth === 1 && !match[1]) rootRowCount += 1;
      }
      else if (tableDepth === 1) {
        if (!match[1] && match[0].endsWith('/>')) rootRowProperties.push(match[0]);
        else if (!match[1]) rowPropertiesStart = match.index;
        else if (rowPropertiesStart !== undefined) {
          rootRowProperties.push(documentXml.slice(rowPropertiesStart, match.index + match[0].length));
          rowPropertiesStart = undefined;
        }
      }
    }
    // An omitted trPr is the normal breakable default, not a missing row.
    assert.ok(rootRowCount > 0, `${template.id} root table rows must be inspected`);
    for (const properties of rootRowProperties) {
      const lock = properties.match(/<w:cantSplit\b[^>]*>/)?.[0];
      assert.ok(!lock || ['false', '0', 'off'].includes(attribute(lock, 'w:val')), `${template.id} root content rows must continue across pages`);
    }
    // Coral's offset masthead has one 14px, empty decorative cutout row. Its
    // merged content row intentionally remains auto-growing; every other
    // template must keep all rows free of exact-height locks.
    if (template.id === 'coral') {
      assert.match(documentXml, /<w:trHeight\b[^>]*w:hRule="exact"/i, 'coral keeps only its decorative masthead cutout exact');
    } else {
      assert.doesNotMatch(documentXml, /<w:trHeight\b[^>]*w:hRule="exact"/i, `${template.id} must not lock long content into a fixed row height`);
    }
    assert.match(numberingXml, /<w:numFmt\b[^>]*w:val="bullet"/i, `${template.id} must define native Word bullets`);
    assert.match(documentXml, /Zoë/iu);
    assert.match(documentXml, /Łukasz/iu);
    assert.match(documentXml, /café/);
    assert.match(documentXml, /Português/);
    assert.doesNotMatch(documentXml, /â€™|â€œ|â€|ï¿½|�/, `${template.id} must not introduce mojibake`);
  }
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
