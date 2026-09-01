import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import { docxRichTextBlocks } from '../src/utils/docxRenderer.js';
import { prepareDOCXExport } from '../src/utils/pdfGenerator.js';
import { createDocxFixture } from '../scripts/fixtures/docxResumeFixtures.mjs';

test('encoded XML-invalid controls are removed without losing international text', () => {
  const blocks = docxRichTextBlocks('<p>caf&#233; &#x1;na&#239;ve &#xD800; &#xFFFE; &#xFFFF; &#x1F680;</p>');
  assert.deepEqual(blocks.map(block => block.text), ['café naïve 🚀']);
});

test('nested list items restore the parent and do not repeat its marker for continuation paragraphs', () => {
  const blocks = docxRichTextBlocks('<ul><li><p>Parent</p><ul><li>Child</li></ul><p>Parent continuation</p></li><li>Sibling</li></ul>');
  assert.deepEqual(blocks.map(({ text, level, continuation }) => ({ text, level, continuation })), [
    { text: 'Parent', level: 0, continuation: false },
    { text: 'Child', level: 1, continuation: false },
    { text: 'Parent continuation', level: 0, continuation: true },
    { text: 'Sibling', level: 0, continuation: false },
  ]);
});

test('soft line breaks remain in one native Word bullet rather than creating extra list items', async () => {
  const content = '<ul><li>First line<br>Second line</li></ul>';
  const blocks = docxRichTextBlocks(content);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].text, 'First line Second line');
  assert.ok(blocks[0].runs.some(run => run.softBreak));
  const artifact = await prepareDOCXExport({ state: createDocxFixture('classic', 'small', { summary: { content } }) });
  const zip = await JSZip.loadAsync(await artifact.blob.arrayBuffer());
  const xml = await zip.file('word/document.xml').async('string');
  const summary = xml.match(/<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*First line(?:(?!<\/w:p>)[\s\S])*<\/w:p>/)?.[0];
  assert.ok(summary);
  assert.match(summary, /<w:br\s*\/>/);
  assert.match(summary, /Second line/);
  assert.equal((summary.match(/<w:numPr>/g) || []).length, 1);
});
