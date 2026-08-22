import assert from 'node:assert/strict';
import test from 'node:test';
import { Document, Packer, Paragraph, Table, TableCell, TableRow } from 'docx';
import { jsPDF } from 'jspdf';
import {
  extractResumeText,
  extractTextFromPdfItems,
  MAX_RESUME_FILE_SIZE,
  prepareResumeImport,
  textFromDocxHtml,
  validateResumeFile,
} from '../src/utils/resumeFileImport.js';

function mockFile({ name, type = '', contents = '', size }) {
  const bytes = new TextEncoder().encode(contents);
  const declaredSize = size ?? bytes.length;
  return {
    name,
    type,
    size: declaredSize,
    slice(start = 0, end = bytes.length) {
      const slice = bytes.slice(start, end);
      return { arrayBuffer: async () => slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength) };
    },
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    text: async () => contents,
  };
}

function binaryFile(name, type, buffer) {
  const bytes = new Uint8Array(buffer);
  return {
    name,
    type,
    size: bytes.byteLength,
    slice(start = 0, end = bytes.byteLength) {
      const slice = bytes.slice(start, end);
      return { arrayBuffer: async () => slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength) };
    },
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
}

test('accepts supported files only when MIME and content signatures agree', async () => {
  assert.equal((await validateResumeFile(mockFile({ name: 'resume.txt', type: 'text/plain', contents: 'Alex Morgan\nSKILLS\nTesting' }))).valid, true);
  assert.equal((await validateResumeFile(mockFile({ name: 'resume.pdf', type: 'application/pdf', contents: '%PDF-1.7 sample text' }))).valid, true);
  assert.equal((await validateResumeFile(mockFile({
    name: 'resume.docx',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    contents: 'PK\u0003\u0004 [Content_Types].xml word/document.xml',
  }))).valid, true);
});

test('rejects unsupported, oversized, empty, and disguised uploads', async () => {
  assert.equal((await validateResumeFile(mockFile({ name: 'resume.png', type: 'image/png', contents: 'PNG' }))).code, 'UNSUPPORTED_FILE');
  assert.equal((await validateResumeFile(mockFile({ name: 'resume.pdf', type: 'application/pdf', contents: 'not actually a pdf' }))).code, 'INVALID_SIGNATURE');
  assert.equal((await validateResumeFile(mockFile({ name: 'resume.txt', type: 'text/html', contents: '<html>not a resume</html>' }))).code, 'UNSUPPORTED_MIME');
  assert.equal((await validateResumeFile(mockFile({ name: 'large.txt', type: 'text/plain', contents: 'x', size: MAX_RESUME_FILE_SIZE + 1 }))).code, 'FILE_TOO_LARGE');
  assert.equal((await validateResumeFile(mockFile({ name: 'empty.txt', type: 'text/plain', contents: '' }))).code, 'EMPTY_FILE');
});

test('keeps two-column PDF text in columns instead of interleaving rows', () => {
  const item = (str, x, y) => ({ str, transform: [1, 0, 0, 1, x, y] });
  const text = extractTextFromPdfItems([
    item('CONTACT', 24, 700), item('alex@example.com', 24, 680), item('SKILLS', 24, 620),
    item('React', 24, 600), item('EXPERIENCE', 310, 700), item('Senior Engineer', 310, 680),
    item('Built reliable systems.', 310, 650), item('EDUCATION', 310, 600),
  ]);

  assert.ok(text.indexOf('SKILLS') < text.indexOf('EXPERIENCE'));
  assert.match(text, /Senior Engineer/);
});

test('extracts list and table text from DOCX HTML fallback', () => {
  const text = textFromDocxHtml('<h1>EXPERIENCE</h1><table><tr><td>Senior Engineer</td><td>2022 - Present</td></tr></table><ul><li>Improved quality</li></ul>');
  assert.match(text, /Senior Engineer/);
  assert.match(text, /2022 - Present/);
  assert.match(text, /• Improved quality/);
});

test('extracts editable text from a real DOCX, including a table cell', async () => {
  const document = new Document({
    sections: [{
      children: [
        new Paragraph('Jamie Lee'),
        new Paragraph('SUMMARY'),
        new Paragraph('Designed accessible products.'),
        new Table({ rows: [new TableRow({ children: [
          new TableCell({ children: [new Paragraph('EXPERIENCE')] }),
          new TableCell({ children: [new Paragraph('Senior Designer')] }),
        ] })] }),
      ],
    }],
  });
  const buffer = await Packer.toBuffer(document);
  const text = await extractResumeText(binaryFile(
    'resume.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer,
  ));

  assert.match(text, /Jamie Lee/);
  assert.match(text, /Senior Designer/);
});

test('extracts text from a real three-page selectable-text PDF', async () => {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  pdf.text('Taylor Reed\nSUMMARY\nReliable engineer', 48, 56);
  pdf.addPage();
  pdf.text('EXPERIENCE\nSenior Engineer\nNorthstar Labs | 2022 - Present', 48, 56);
  pdf.addPage();
  pdf.text('EDUCATION\nCity University\nBachelor of Science', 48, 56);
  const text = await extractResumeText(binaryFile('resume.pdf', 'application/pdf', pdf.output('arraybuffer')));

  assert.match(text, /Taylor Reed/);
  assert.match(text, /Northstar Labs/);
  assert.match(text, /City University/);
});

test('reads a real two-column PDF without mixing its column order', async () => {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  pdf.text(['CONTACT', 'alex@example.com', 'SKILLS', 'React'], 48, 56);
  pdf.text(['EXPERIENCE', 'Senior Engineer', 'Built reliable systems.', 'EDUCATION'], 320, 56);
  const text = await extractResumeText(binaryFile('two-column.pdf', 'application/pdf', pdf.output('arraybuffer')));

  assert.ok(text.indexOf('SKILLS') < text.indexOf('EXPERIENCE'));
  assert.match(text, /Senior Engineer/);
});

test('runs the complete TXT file-to-editable-data pipeline', async () => {
  const imported = await prepareResumeImport(mockFile({
    name: 'resume.txt',
    type: 'text/plain',
    contents: 'Alex Morgan\nalex@example.com\nSUMMARY\nReliable engineer\nSKILLS\nJavaScript, Testing',
  }));

  assert.equal(imported.patch.contact.firstName, 'Alex');
  assert.match(imported.patch.summary.content, /Reliable engineer/);
  assert.match(imported.patch.skills.textContent, /JavaScript/);
});

test('does not treat whitespace-only text as a successful import', async () => {
  await assert.rejects(
    () => prepareResumeImport(mockFile({ name: 'empty-resume.txt', type: 'text/plain', contents: ' \n\n ' })),
    error => error.code === 'EMPTY_RESUME',
  );
});
