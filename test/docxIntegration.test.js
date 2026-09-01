import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import { createDocxFixture } from '../scripts/fixtures/docxResumeFixtures.mjs';
import { prepareResumeExport } from '../src/utils/pdfGenerator.js';
import { parseImportedResumeText } from '../src/utils/resumeImport.js';
import { getTemplatePresentation } from '../src/utils/resumePresentation.js';

const decode = value => value.replace(/&(amp|lt|gt|quot|apos);/g, (_, name) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[name]);

async function inspectArtifact(artifact) {
  const zip = await JSZip.loadAsync(await artifact.blob.arrayBuffer());
  const [xml, customXml] = await Promise.all([
    zip.file('word/document.xml').async('string'),
    zip.file('docProps/custom.xml').async('string'),
  ]);
  const metadata = Object.fromEntries([...customXml.matchAll(/<property\b([^>]*)>([\s\S]*?)<\/property>/g)].map(([, attributes, value]) => [
    decode(/\bname="([^"]*)"/.exec(attributes)[1]), decode(value.replace(/<[^>]+>/g, '')),
  ]));
  const text = [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
    .map(([, value]) => decode(value)).join(' ').replace(/\s+/g, ' ').trim();
  return { artifact, xml, text, metadata, sections: JSON.parse(metadata.ResumeSectionOrder) };
}

test('DOCX preparation snapshots the clicked selection while the next export uses the latest nested customization', async () => {
  const state = createDocxFixture('metro', 'customized');
  state.workHistory[0].description = '<p>FIRST PACKING SNAPSHOT MARKER</p>';
  const clickedState = structuredClone(state);

  // No await here: the editor can change while ZIP packing is asynchronous.
  // Exercise the real dispatcher and Packer, not a mocked document generator.
  const firstPreparation = prepareResumeExport({ format: 'docx', state });
  state.meta.templateId = 'developer';
  state.meta.name = 'Updated engineering portfolio';
  state.contact.firstName = 'Rowan';
  state.workHistory[0].description = '<p>CURRENT AFTER CLICK MARKER</p>';
  state.skills.ratings[0].name = 'Current event-driven testing';
  state.design.fontFamily = 'Arial';
  state.design.fontStyle = 'small';
  state.design.colorScheme = '#2563EB';
  state.design.headingColor = '#1D4ED8';
  state.design.sidebarColor = '#172554';
  state.design.dividerColor = '#93C5FD';
  state.design.sectionTitles.workHistory = 'Current Career';
  state.design.templateLayouts.metro.sectionOrder.reverse();
  state.design.templateLayouts.developer = {
    sectionOrder: ['skills', 'workHistory', 'custom-projects', 'summary', 'education', 'languages', 'certifications', 'websites', 'personalDetails'],
    sectionColumns: { skills: 'main', workHistory: 'main', 'custom-projects': 'main', summary: 'sidebar' },
  };
  state.extraSections.custom[0].title = 'Current Projects';
  state.extraSections.custom[0].content = '<p>Current custom section content after selection.</p>';
  const latestState = structuredClone(state);

  const first = await inspectArtifact(await firstPreparation);
  assert.equal(first.metadata.ResumeTemplateId, 'metro');
  assert.equal(first.metadata.ResumeFont, 'Georgia');
  assert.deepEqual(JSON.parse(first.metadata.ResumeColors), getTemplatePresentation(clickedState).colors);
  assert.equal(first.artifact.filename, 'Alex_Morgan_Resume.docx');
  assert.ok(first.text.includes('Alex Morgan'));
  assert.ok(first.text.includes('FIRST PACKING SNAPSHOT MARKER'));
  assert.ok(!first.text.includes('CURRENT AFTER CLICK MARKER'));
  assert.ok(!first.text.includes('Current event-driven testing'));
  assert.ok(first.sections.some(section => section.id === 'workHistory' && section.title === 'Career Milestones'));
  assert.ok(first.sections.some(section => section.id === 'custom-projects' && section.title === 'Impact & Selected Systems' && section.column === 'sidebar'));

  const latest = await inspectArtifact(await prepareResumeExport({ format: 'docx', state }));
  assert.equal(latest.metadata.ResumeTemplateId, 'developer');
  assert.equal(latest.metadata.ResumeFont, 'Arial');
  assert.ok(Number(latest.metadata.ResumeBodyFontPx) < Number(first.metadata.ResumeBodyFontPx));
  assert.deepEqual(JSON.parse(latest.metadata.ResumeColors), getTemplatePresentation(latestState).colors);
  assert.equal(latest.artifact.filename, 'Updated_engineering_portfolio.docx');
  assert.ok(latest.text.includes('ROWAN MORGAN'), 'the latest name also follows Developer’s uppercase header treatment');
  assert.ok(latest.text.includes('CURRENT AFTER CLICK MARKER'));
  assert.ok(latest.text.includes('Current event-driven testing'));
  assert.ok(latest.text.includes('Current custom section content after selection.'));
  assert.ok(!latest.text.includes('FIRST PACKING SNAPSHOT MARKER'));
  assert.ok(latest.sections.some(section => section.id === 'workHistory' && section.title === 'Current Career'));
  assert.ok(latest.sections.some(section => section.id === 'custom-projects' && section.title === 'Current Projects' && section.column === 'main'));
  assert.deepEqual(latest.sections.filter(section => section.column === 'main').slice(0, 3).map(section => section.id), ['skills', 'workHistory', 'custom-projects']);
  assert.deepEqual(state, latestState, 'packing either artifact must not revert or mutate later editor changes');
});

test('parsed imported content exports through the selected template with later edits, renamed sections, and user ordering', async () => {
  const { patch } = parseImportedResumeText(`
Alex Morgan
alex@example.com | +1 555 010 1234

SUMMARY
Product-minded engineer focused on reliable customer experiences.

EXPERIENCE
Senior Software Engineer
Northstar Labs | January 2022 - Present
• Improved release reliability through automated testing.
• Partnered with design and support teams.

EDUCATION
Bachelor of Science in Computer Science
City University | May 2021

SKILLS
JavaScript, React, Accessibility | Testing
`);
  // The parser supplies canonical editable content, not a template. The fixture
  // supplies editor defaults here; no React reducer behavior is mocked or claimed.
  const state = { ...createDocxFixture('classic'), ...patch, personalDetails: {} };
  state.meta = { ...state.meta, name: 'Alex imported portfolio', templateId: 'metro' };
  state.design = createDocxFixture('metro', 'customized').design;
  state.design.sectionTitles = { workHistory: 'Selected Experience', skills: 'Technical Strengths' };
  state.design.templateLayouts = {
    metro: {
      sectionOrder: ['custom-after-import', 'skills', 'workHistory', 'education', 'summary'],
      sectionColumns: { 'custom-after-import': 'main', skills: 'main', workHistory: 'main', education: 'main', summary: 'sidebar' },
    },
  };
  state.workHistory[0].description += '<p>Edited after import: accessible release checks.</p>';
  state.extraSections.custom.push({ id: 'custom-after-import', title: 'After Import Projects', content: '<p>Added an independently verifiable project after importing.</p>' });
  state.extraSections.selected.push('custom-after-import');
  const before = structuredClone(state);

  const result = await inspectArtifact(await prepareResumeExport({ format: 'docx', state }));
  assert.equal(result.metadata.ResumeTemplateId, 'metro');
  assert.equal(result.metadata.ResumeFont, 'Georgia');
  assert.deepEqual(JSON.parse(result.metadata.ResumeColors), getTemplatePresentation(state).colors);
  assert.equal(result.artifact.filename, 'Alex_imported_portfolio.docx');
  for (const content of [
    'Alex Morgan', 'alex@example.com', 'Senior Software Engineer', 'Northstar Labs',
    'Improved release reliability through automated testing.', 'Partnered with design and support teams.',
    'Edited after import: accessible release checks.', 'Bachelor of Science in Computer Science',
    'City University', 'JavaScript', 'React', 'Accessibility', 'Testing',
    'January 2022', 'Present', 'May 2021', 'Added an independently verifiable project after importing.',
  ]) assert.ok(result.text.includes(content), `imported or subsequently edited content must remain editable: ${content}`);
  assert.ok(!result.text.includes('Northstar Example Systems'), 'fixture content must not replace imported work history');
  assert.deepEqual(result.sections.filter(section => section.column === 'main').map(section => section.id), ['custom-after-import', 'skills', 'workHistory', 'education']);
  assert.ok(result.sections.some(section => section.id === 'summary' && section.column === 'sidebar'));
  assert.ok(result.sections.some(section => section.id === 'workHistory' && section.title === 'Selected Experience'));
  assert.ok(result.sections.some(section => section.id === 'skills' && section.title === 'Technical Strengths'));
  assert.doesNotMatch(result.xml, /importMeta|importedAt|needsReview/);
  assert.deepEqual(state, before, 'export must not change imported content or current customization');
});
