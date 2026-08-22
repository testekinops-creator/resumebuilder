import { TEMPLATES } from '../src/data/templates.js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const endpoint = process.env.PDF_SMOKE_ENDPOINT || 'http://127.0.0.1:5194/api/resume-pdf';

function smokeState(templateId) {
  const sectionOrder = ['summary', 'skills', 'workHistory', 'education', 'custom-smoke'];
  const sectionColumns = {
    skills: 'sidebar',
    summary: 'main',
    workHistory: 'main',
    education: 'sidebar',
    'custom-smoke': 'main',
  };

  return {
    meta: { id: `smoke-${templateId}`, name: 'Production Smoke', templateId },
    contact: {
      firstName: 'Deepak',
      surname: 'Hegde',
      email: 'deepak@example.com',
      phone: '+91 98765 43210',
      city: 'Bengaluru',
      country: 'India',
    },
    summary: {
      content: '<p>Production export smoke test with reordered sections and shared canonical content.</p>',
    },
    workHistory: [{
      id: 'work-1',
      jobTitle: 'Test Engineer',
      employer: 'Example Co',
      location: 'Bengaluru',
      startDate: '2022',
      endDate: 'Present',
      currentJob: true,
      description: '<ul><li>Validated production export behavior.</li><li>Preserved multi-template layout content.</li></ul>',
    }],
    education: [{
      id: 'edu-1',
      degree: 'B.Sc.',
      fieldOfStudy: 'Computer Science',
      schoolName: 'Example University',
      graduationDate: '2022',
    }],
    skills: {
      textContent: '<ul><li>Testing</li><li>Communication</li><li>Automation</li></ul>',
      ratings: [],
      showRatings: false,
    },
    extraSections: {
      selected: ['custom-smoke'],
      custom: [{
        id: 'custom-smoke',
        title: 'Selected Projects',
        content: '<ul><li>Resume Builder</li></ul>',
      }],
    },
    personalDetails: {},
    websites: [],
    certifications: { content: '' },
    languages: [],
    design: {
      colorScheme: '#2563EB',
      fontStyle: 'normal',
      fontFamily: 'Inter',
      sectionSpacing: 50,
      paragraphSpacing: 50,
      lineSpacing: 50,
      pageMargin: 32,
      headingLetterSpacing: 0.5,
      pageBorder: 'thin',
      sectionOrder,
      sectionColumns,
      templateLayouts: {
        [templateId]: { sectionOrder, sectionColumns },
      },
    },
  };
}

async function inspectPdf(bytes) {
  const loadingTask = getDocument({ data: bytes, disableWorker: true });
  const pdfDocument = await loadingTask.promise;
  const pageCount = pdfDocument.numPages;
  let extractedText = '';
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const content = await page.getTextContent();
    extractedText += ` ${content.items.map(item => item.str).join(' ')}`;
  }
  await loadingTask.destroy();
  return { pageCount, text: extractedText.toLowerCase() };
}

async function requestPdf(state, resumeName) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, resumeName }),
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { response, bytes };
}

const results = [];
for (const template of TEMPLATES) {
  const { response, bytes } = await requestPdf(
    smokeState(template.id),
    `Production Smoke ${template.name}`,
  );
  const signature = String.fromCharCode(...bytes.slice(0, 5));
  const result = {
    id: template.id,
    status: response.status,
    mimeType: response.headers.get('content-type'),
    bytes: bytes.length,
    signature,
  };
  results.push(result);

  if (
    result.status !== 200
    || result.mimeType !== 'application/pdf'
    || result.signature !== '%PDF-'
    || result.bytes < 1_000
  ) {
    throw new Error(`PDF smoke test failed: ${JSON.stringify(result)}`);
  }

  const { pageCount, text: normalizedText } = await inspectPdf(bytes);
  for (const expectedText of ['deepak', 'test engineer', 'b.sc.', 'resume builder']) {
    if (!normalizedText.includes(expectedText)) {
      throw new Error(`PDF smoke test lost ${expectedText} in template ${template.id}.`);
    }
  }

  console.log(`${template.id}: ${result.bytes} bytes, ${pageCount} page(s)`);
}

console.log(`All ${results.length} registered templates returned valid PDFs.`);

const multiPageTemplateIds = ['classic', 'creative', 'accountant', 'developer', 'timeline'];
for (const templateId of multiPageTemplateIds) {
  const state = smokeState(templateId);
  state.workHistory = Array.from({ length: 10 }, (_, index) => ({
    id: `long-work-${index}`,
    jobTitle: `Test Engineer ${index + 1}`,
    employer: 'Example Co',
    location: 'Bengaluru',
    startDate: String(2014 + index),
    endDate: index === 9 ? 'Present' : String(2015 + index),
    currentJob: index === 9,
    description: '<ul><li>Validated a long multi-page resume export with normal paragraph flow.</li><li>Kept bullets, columns, and section content available across page boundaries.</li><li>Confirmed the next experience entry continues without a blank page.</li></ul>',
  }));
  state.extraSections.custom[0].content = '<p>END OF LONG RESUME MARKER</p>';

  const { response, bytes } = await requestPdf(state, `Long ${templateId}`);
  const signature = String.fromCharCode(...bytes.slice(0, 5));
  if (response.status !== 200 || signature !== '%PDF-') {
    throw new Error(`Long PDF request failed for ${templateId}.`);
  }

  const inspection = await inspectPdf(bytes);
  if (inspection.pageCount < 2 || !inspection.text.includes('end of long resume marker')) {
    throw new Error(`Long PDF pagination/content failed for ${templateId}.`);
  }
  console.log(`${templateId} long resume: ${inspection.pageCount} pages, final marker present`);
}
