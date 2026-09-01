import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import { TEMPLATES, getTemplateTheme } from '../src/data/templates.js';
import { prepareDOCXExport } from '../src/utils/pdfGenerator.js';
import { docxRichTextBlocks, wordFontFamily } from '../src/utils/docxRenderer.js';
import { sanitizeDocxState } from '../src/utils/docxContent.js';
import { getTemplatePresentation, getTemplateSectionTitle, resolvePresentationColor } from '../src/utils/resumePresentation.js';
import { createDocxFixture, DOCX_FIXTURE_SIZES } from '../scripts/fixtures/docxResumeFixtures.mjs';

const decode = value => String(value).replace(/&(amp|lt|gt|quot|apos);/g, (_, name) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[name]);
const attribute = (xml, name) => new RegExp(`\\b${name}="([^"]*)"`).exec(xml)?.[1];
const bookmarkName = id => `section_${String(id).replace(/[^a-zA-Z0-9_]/g, '_')}`;
const documentText = xml => [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(match => decode(match[1])).join(' ').replace(/\s+/g, ' ').trim();

// Extract real, balanced OOXML elements, including nested tables. Plain regex
// captures of <w:tc> stop at a nested cell and cannot verify physical rails.
function elements(xml, name, topLevel = false) {
  const pattern = new RegExp(`<(/?)${name}(?=[\\s/>])[^>]*>`, 'g');
  const stack = [];
  const result = [];
  for (const match of xml.matchAll(pattern)) {
    if (match[1]) {
      const start = stack.pop();
      if (start !== undefined && (!topLevel || stack.length === 0)) result.push(xml.slice(start, match.index + match[0].length));
    } else if (!match[0].endsWith('/>')) stack.push(match.index);
    else if (!topLevel || stack.length === 0) result.push(match[0]);
  }
  return result;
}

function directProperties(xml, name) {
  const content = xml.slice(xml.indexOf('>') + 1).trimStart();
  const properties = elements(content, name)[0];
  return properties && content.startsWith(properties) ? properties : '';
}

function rowIsLocked(row) {
  const flag = elements(directProperties(row, 'w:trPr'), 'w:cantSplit')[0];
  return Boolean(flag) && !['false', '0', 'off'].includes(attribute(flag, 'w:val'));
}

function assertTableFlows(table, message) {
  const rows = elements(table, 'w:tr', true);
  assert.ok(rows.length, `${message}: table must contain a row`);
  for (const row of rows) {
    assert.equal(rowIsLocked(row), false, `${message}: the outer row must allow page breaks`);
    assert.doesNotMatch(directProperties(row, 'w:trPr'), /<w:trHeight\b[^>]*w:hRule="exact"/, `${message}: no fixed-height flowing row`);
  }
}

function assertCoralShadowRows(table, message) {
  const rows = elements(table, 'w:tr', true);
  assert.equal(rows.length, 3, `${message}: the offset shadow uses three native rows`);
  for (const row of rows) assert.equal(rowIsLocked(row), false, `${message}: even the shadow wrapper must allow page breaks`);
  const heights = rows.map(row => elements(directProperties(row, 'w:trPr'), 'w:trHeight')[0]);
  assert.equal(attribute(heights[0], 'w:val'), '210', `${message}: only the 14px decorative cutout has an exact height`);
  assert.equal(attribute(heights[0], 'w:hRule'), 'exact');
  assert.equal(heights[1], undefined, `${message}: the merged masthead's second row must grow with its content`);
  assert.equal(attribute(heights[2], 'w:val'), '210', `${message}: the bottom shadow has a 14px minimum`);
  assert.equal(attribute(heights[2], 'w:hRule'), 'atLeast');
  const cells = rows.map(row => elements(row, 'w:tc', true));
  assert.deepEqual(cells.map(row => row.length), [2, 2, 2]);
  for (const [index, merge] of ['restart', 'continue'].entries()) {
    const properties = directProperties(cells[index][0], 'w:tcPr');
    assert.equal(attribute(elements(properties, 'w:vMerge')[0], 'w:val'), merge, `${message}: header must span the cutout AND auto-height rows`);
    assert.equal(attribute(elements(properties, 'w:gridSpan')[0], 'w:val'), '2');
  }
  assert.equal(documentText(cells[0][1]), '', `${message}: the cutout contains no resume text`);
  assert.equal(documentText(cells[1][0]), '', `${message}: the merge continuation must not duplicate the header`);
  assert.equal(documentText(cells[1][1]), '', `${message}: the right shadow contains no resume text`);
  assert.equal(documentText(rows[2]), '', `${message}: the bottom shadow contains no resume text`);
  assert.doesNotMatch(table, /<w:bookmarkStart\b/, `${message}: no body section is placed in the shadow wrapper`);
  const header = elements(cells[0][0], 'w:tbl', true);
  assert.equal(header.length, 1, `${message}: the masthead remains an ordinary nested native table`);
  assertTableFlows(header[0], `${message}: inner masthead`);
  return { rows, cells, height: heights[0], header: header[0] };
}

function assertOnlyBoundedCardsLock(xml, message, templateId) {
  let decorativeCutout;
  for (const [index, table] of elements(xml, 'w:tbl', true).entries()) {
    if (templateId === 'coral' && index === 0) decorativeCutout = assertCoralShadowRows(table, message).height;
    else assertTableFlows(table, `${message}: root table`);
  }
  const exactHeights = elements(xml, 'w:trHeight').filter(height => attribute(height, 'w:hRule') === 'exact');
  assert.deepEqual(exactHeights, decorativeCutout ? [decorativeCutout] : [], `${message}: no other root or nested row may lock content to an exact height`);
  for (const row of elements(xml, 'w:tr').filter(rowIsLocked)) {
    const cells = elements(row, 'w:tc', true);
    assert.equal(cells.length, 1, `${message}: only a single-cell card may lock`);
    assert.equal(elements(cells[0], 'w:tbl').length, 0, `${message}: nested or unknown table content must remain breakable`);
    assertLeadingBreakableAnchor(cells[0], `${message}: bounded card still starts with a breakable anchor`);
    const paragraphs = elements(cells[0], 'w:p').slice(1);
    assert.ok(paragraphs.length <= 4, `${message}: a locked card contains at most four simple paragraphs`);
    const texts = paragraphs.map(paragraph => [...paragraph.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(match => decode(match[1])).join(''));
    assert.ok(texts.every(text => text.length <= 180), `${message}: each locked-card paragraph is bounded`);
    assert.ok(texts.reduce((sum, text) => sum + text.length, 0) <= 360, `${message}: locked-card total text is bounded`);
  }
}

function properties(xml) {
  return Object.fromEntries([...xml.matchAll(/<property\b([^>]*)>([\s\S]*?)<\/property>/g)].map(([, attrs, content]) => [
    decode(attribute(attrs, 'name')),
    decode(content.replace(/<[^>]+>/g, '')),
  ]));
}

function betweenTables(xml, first, second) {
  const start = xml.indexOf(first);
  const end = xml.indexOf(second, start + first.length);
  assert.ok(start >= 0 && end > start, 'table boundaries must occur in their original document order');
  return xml.slice(start + first.length, end);
}

function assertSpacer(xml, lineTwips, message, { keepNext = false, beforeTwips = 0, lineRule = 'exact' } = {}) {
  const paragraphs = elements(xml, 'w:p', true);
  assert.equal(paragraphs.length, 1, `${message}: one paragraph between distinct tables`);
  assert.equal(xml.trim(), paragraphs[0], `${message}: spacing must be outside the tables`);
  assert.equal(documentText(xml), '', `${message}: spacer must not contain visible text`);
  const spacing = elements(xml, 'w:spacing')[0];
  assert.equal(Number(attribute(spacing, 'w:before')), beforeTwips, message);
  assert.equal(attribute(spacing, 'w:after'), '0', message);
  assert.equal(Number(attribute(spacing, 'w:line')), lineTwips, message);
  assert.equal(attribute(spacing, 'w:lineRule'), lineRule, message);
  assert.doesNotMatch(xml, /<w:(?:shd|pBdr)\b/, `${message}: gap must not inherit card decoration`);
  if (keepNext) assert.match(xml, /<w:keepNext\b/, `${message}: gap stays with the following card`);
}

function assertLeadingBreakableAnchor(cell, message) {
  const cellProperties = elements(cell, 'w:tcPr')[0];
  const content = cell.slice(cell.indexOf(cellProperties) + cellProperties.length).trimStart();
  const anchor = elements(content, 'w:p')[0];
  assert.ok(anchor && content.startsWith(anchor), `${message}: the first direct block must be the anchor, not a nested table or heading`);
  assertSpacer(anchor, 1, message);
  const paragraphProperties = elements(anchor, 'w:pPr')[0];
  for (const property of ['keepNext', 'keepLines']) {
    const flag = elements(paragraphProperties, `w:${property}`)[0];
    assert.ok(flag, `${message}: ${property} must be explicit to override any inherited style`);
    assert.ok(['false', '0', 'off'].includes(attribute(flag, 'w:val')), `${message}: ${property} must be disabled`);
  }
  assert.doesNotMatch(anchor, /<w:(?:bookmarkStart|outlineLvl|numPr)\b/, `${message}: the anchor is not section or list content`);
}

async function inspect(state) {
  const artifact = await prepareDOCXExport({ state });
  const buffer = Buffer.from(await artifact.blob.arrayBuffer());
  const zip = await JSZip.loadAsync(buffer);
  const [xml, customXml, numberingXml] = await Promise.all([
    zip.file('word/document.xml').async('string'), zip.file('docProps/custom.xml').async('string'),
    zip.file('word/numbering.xml').async('string'),
  ]);
  const metadata = properties(customXml);
  return { artifact, buffer, zip, xml, text: documentText(xml), metadata, numberingXml, sections: JSON.parse(metadata.ResumeSectionOrder) };
}

function expectedBodyGrid(presentation) {
  const { page, columns } = presentation.capabilities;
  let inset = page.horizontalInsetPx ?? presentation.pageMarginPx * page.horizontalInsetMultiplier;
  inset += (page.outerMarginPx || 0) + (page.frameConsumesSpace ? page.borderWidthPx : 0);
  let width = Math.round(page.widthPx * 15) - Math.round(inset * 30);
  // CSS max-width is border-box; the content width excludes both body paddings.
  if (page.bodyMaxWidthPx) width = Math.min(width, Math.round(Math.max(20, page.bodyMaxWidthPx - presentation.pageMarginPx * 2) * 15));
  if (columns.count === 1) return [width];
  const gap = Math.round(columns.gapPx * 15);
  const usable = width - gap;
  const sidebar = Math.round(usable * columns.sidebarFraction);
  const pair = columns.sidebarPosition === 'right' ? [usable - sidebar, sidebar] : [sidebar, usable - sidebar];
  if (columns.sidebarInsetStripe) {
    const stripe = Math.round(columns.sidebarInsetStripe.widthPx * 15);
    pair.splice(columns.sidebarPosition === 'right' ? 1 : 0, 1, stripe, sidebar - stripe);
  }
  if (gap) {
    if (columns.timelineRail) {
      const rule = Math.round(columns.timelineRail.ruleWidthPx * 15);
      const leftGap = Math.floor((gap - rule) / 2);
      pair.splice(1, 0, leftGap, rule, gap - leftGap - rule);
    } else pair.splice(1, 0, gap);
  }
  return pair;
}

function assertIdentityAndRails(result, state) {
  const presentation = getTemplatePresentation(sanitizeDocxState(state));
  const { templateId, capabilities, layout } = presentation;
  assert.equal(result.metadata.ResumeTemplateId, templateId);
  assert.equal(result.metadata.ResumeTemplateSignature, presentation.signature);
  assert.equal(result.metadata.ResumeLayout, capabilities.columns.count === 1 ? 'single-column' : `sidebar-${capabilities.columns.sidebarPosition}`);
  assert.equal(Number(result.metadata.ResumeSidebarFraction), capabilities.columns.sidebarFraction);
  assert.deepEqual(JSON.parse(result.metadata.ResumeColors), presentation.colors);
  assert.equal(result.metadata.ResumeFont, wordFontFamily(presentation.fontFamily));
  assert.equal(Number(result.metadata.ResumeBodyFontPx), presentation.bodyFontPx);
  assert.equal(result.sections.length, new Set(result.sections.map(section => section.id)).size, `${templateId}: sections must occur once`);

  const bodyTable = elements(result.xml, 'w:tbl', true).find(table => table.includes(`w:name="${bookmarkName('workHistory')}"`));
  assert.ok(bodyTable, `${templateId}: work history must be editable Word content`);
  const grid = elements(bodyTable, 'w:tblGrid')[0];
  const gridWidths = [...grid.matchAll(/<w:gridCol\b[^>]*>/g)].map(match => Number(attribute(match[0], 'w:w')));
  assert.deepEqual(gridWidths, expectedBodyGrid(presentation), `${templateId}: physical columns must follow the selected shared template`);
  const cells = elements(bodyTable, 'w:tc', true);
  const paragraphs = elements(result.xml, 'w:p');

  for (const section of result.sections) {
    assert.equal(section.title, getTemplateSectionTitle(state, section.id), `${templateId}: current title for ${section.id}`);
    const name = bookmarkName(section.id);
    const markers = [...result.xml.matchAll(/<w:bookmarkStart\b[^>]*>/g)].filter(match => attribute(match[0], 'w:name') === name);
    assert.equal(markers.length, 1, `${templateId}: one bookmark for ${section.id}`);
    const heading = paragraphs.find(paragraph => paragraph.includes(`w:name="${name}"`));
    assert.ok(heading, `${templateId}: heading for ${section.id}`);
    const isCustom = state.extraSections.custom.some(custom => custom.id === section.id);
    const headingDefinition = isCustom ? capabilities.customHeading : capabilities.heading;
    const transformedTitle = headingDefinition.transform === 'uppercase' ? section.title.toUpperCase()
      : headingDefinition.transform === 'lowercase' ? section.title.toLowerCase() : section.title;
    assert.ok(documentText(heading).includes(transformedTitle), `${templateId}: heading transformation for ${section.id}`);
    assert.match(heading, /<w:keepNext\b/, `${templateId}: keep headings with their content`);
    if (headingDefinition.fill) {
      const fill = resolvePresentationColor(presentation, headingDefinition.fill).slice(1);
      assert.ok(heading.includes(`w:fill="${fill}"`), `${templateId}: heading fill for ${section.id}`);
    }
    if (headingDefinition.borderWidthPx) assert.match(heading, /<w:bottom\b/, `${templateId}: heading underline for ${section.id}`);
    if (section.column !== 'full-width') {
      const expectedColumn = capabilities.columns.count === 1 ? 'main'
        : layout.columns.sidebar.includes(section.id) ? 'sidebar' : 'main';
      assert.equal(section.column, expectedColumn, `${templateId}: user placement for ${section.id}`);
      const sidebarLeft = capabilities.columns.sidebarPosition !== 'right';
      const cellIndex = capabilities.columns.count === 1 ? 0
        : (section.column === 'sidebar') === sidebarLeft ? 0 : cells.length - 1;
      assert.ok(cells[cellIndex].includes(`w:name="${name}"`), `${templateId}: ${section.id} must be in its physical Word column`);
    }
  }

  for (const column of ['sidebar', 'main']) {
    const expected = (capabilities.columns.count === 1 ? (column === 'main' ? layout.sectionOrder : []) : layout.columns[column])
      .filter(id => result.sections.some(section => section.id === id && section.column === column));
    const actual = result.sections.filter(section => section.column === column).sort((a, b) => a.index - b.index).map(section => section.id);
    assert.deepEqual(actual, expected, `${templateId}: current order within ${column}`);
  }

  if (capabilities.columns.sidebarFill) {
    const sideIndex = capabilities.columns.sidebarPosition === 'right' ? cells.length - 1 : 0;
    const fill = resolvePresentationColor(presentation, capabilities.columns.sidebarFill).slice(1);
    const cellProperties = elements(cells[sideIndex], 'w:tcPr')[0];
    assert.ok(cellProperties.includes(`w:fill="${fill}"`), `${templateId}: sidebar shading must be retained`);
  }
}

test('every DOCX template uses its shared visual identity, real column geometry, headings, and current placements', async () => {
  for (const template of TEMPLATES) {
    for (const size of ['small', 'customized']) {
      const state = createDocxFixture(template.id, size);
      assertIdentityAndRails(await inspect(state), state);
    }
  }
});

test('all five reusable fixtures retain every entry and final marker through every DOCX template', async () => {
  for (const template of TEMPLATES) {
    for (const size of DOCX_FIXTURE_SIZES) {
      const state = createDocxFixture(template.id, size);
      const result = await inspect(state);
      const normalized = result.text.toLowerCase();
      for (const job of state.workHistory) {
        assert.ok(normalized.includes(job.jobTitle.toLowerCase()), `${template.id}/${size}: missing ${job.id}`);
        for (const block of docxRichTextBlocks(job.description)) assert.ok(normalized.includes(block.text.toLowerCase()), `${template.id}/${size}: missing work bullet`);
      }
      for (const skill of state.skills.ratings) assert.ok(normalized.includes(skill.name.toLowerCase()), `${template.id}/${size}: missing skill`);
      for (const section of state.extraSections.custom) for (const block of docxRichTextBlocks(section.content)) assert.ok(normalized.includes(block.text.toLowerCase()), `${template.id}/${size}: missing custom content`);
      assert.ok(normalized.includes('november 2023 - present'), `${template.id}/${size}: professional date format`);
      assert.ok(normalized.includes('july 2019'), `${template.id}/${size}: education date`);
      assert.doesNotMatch(result.text, /\b(?:undefined|null|NaN|Invalid Date)\b/);
      const decorations = elements(result.xml, 'w:drawing');
      assert.equal(decorations.length, template.id === 'timeline' ? 4 : 0);
      for (const decoration of decorations) {
        assert.match(decoration, /descr="Decorative timeline circle"/);
        assert.match(documentText(decoration), /^[●○]$/u, 'no essential resume text may be in a shape');
      }
      const mainFlow = result.xml.replace(/<w:drawing\b[\s\S]*?<\/w:drawing>/g, '');
      assert.doesNotMatch(mainFlow, /<(?:wp:anchor|w:framePr|w:tblpPr|w:drawing|w:pict)\b/);
      assert.doesNotMatch(result.xml, /<w:pageBreakBefore\b|<w:br\b[^>]*w:type="page"/);
      assertOnlyBoundedCardsLock(result.xml, `${template.id}/${size}`, template.id);
      assert.doesNotMatch(result.xml, /<\/w:tbl>\s*<w:tbl(?=[\s>])/, `${template.id}/${size}: Word must not merge adjacent root or nested tables`);
      assert.equal(Object.keys(result.zip.files).filter(name => name.startsWith('word/media/')).length, 0);
    }
  }
});

test('timeline decorations stay centered on their rail anchors and contain no resume content', async () => {
  for (const size of DOCX_FIXTURE_SIZES) {
    const result = await inspect(createDocxFixture('timeline', size));
    const drawings = elements(result.xml, 'w:drawing');
    assert.equal(drawings.length, 4);
    const ids = new Set();
    for (const [index, drawing] of drawings.entries()) {
      const anchor = elements(drawing, 'wp:anchor')[0];
      assert.ok(anchor);
      assert.equal(attribute(anchor, 'layoutInCell'), '0', 'decorations must not be clipped to the 2px rule');
      const horizontal = elements(anchor, 'wp:positionH')[0];
      assert.equal(attribute(horizontal, 'relativeFrom'), 'character', 'never double-offset a cell anchor from the page');
      const box = index ? 17 : 24;
      assert.equal(Number(elements(horizontal, 'wp:posOffset')[0].replace(/<[^>]+>/g, '')), Math.round((2 - box) / 2 * 9525));
      assert.equal(attribute(elements(anchor, 'wp:positionV')[0], 'relativeFrom'), 'paragraph');
      assert.match(anchor, /<wp:wrapNone\s*\/>/);
      assert.equal(Number(attribute(elements(anchor, 'wp:extent')[0], 'cx')), box * 9525);
      assert.equal(documentText(anchor), index ? '○' : '●');
      ids.add(attribute(elements(anchor, 'wp:docPr')[0], 'id'));
    }
    assert.equal(ids.size, 4, 'native drawing IDs are document-unique');
  }
});

test('Regal inset stripe and Orbit guide pattern follow the native flowing body', async () => {
  const regalState = createDocxFixture('regal');
  const regalPresentation = getTemplatePresentation(regalState);
  const regal = await inspect(regalState);
  const body = elements(regal.xml, 'w:tbl', true).find(table => table.includes('w:name="section_workHistory"'));
  const cells = elements(body, 'w:tc', true);
  assert.equal(cells.length, 3, 'the stripe is decoration, not a new semantic text column');
  assert.equal(documentText(cells[1]), '');
  const stripeFill = resolvePresentationColor(regalPresentation, regalPresentation.capabilities.columns.sidebarInsetStripe.color).slice(1);
  assert.ok(elements(cells[1], 'w:tcPr')[0].includes(`w:fill="${stripeFill}"`));
  assert.equal(attribute(elements(elements(cells[1], 'w:tcPr')[0], 'w:tcW')[0], 'w:w'), '90');
  assertTableFlows(body, 'Regal body including inset stripe');

  const orbitState = createDocxFixture('orbit');
  const orbitPresentation = getTemplatePresentation(orbitState);
  const orbit = await inspect(orbitState);
  const orbitBody = elements(orbit.xml, 'w:tbl', true).find(table => table.includes('w:name="section_workHistory"'));
  const main = elements(orbitBody, 'w:tc', true).at(-1);
  const fill = elements(elements(main, 'w:tcPr')[0], 'w:shd')[0];
  assert.equal(attribute(fill, 'w:val'), 'thinVertStripe');
  assert.equal(attribute(fill, 'w:color'), resolvePresentationColor(orbitPresentation, orbitPresentation.capabilities.columns.mainGrid.color).slice(1));
  assertTableFlows(orbitBody, 'Orbit native guide pattern');
});

test('Coral draws its offset shadow with an exact decorative cutout and an auto-growing merged native masthead', async () => {
  const fixtures = [createDocxFixture('coral'), createDocxFixture('coral', 'longText'), createDocxFixture('coral', 'longText', {
    contact: { firstName: 'Alexandria International Quality Leadership', surname: 'Morgan Engineering Accessibility Portfolio', city: 'LONG HEADER LOCATION MARKER: Helsinki Metropolitan Product Engineering and Research District' },
    design: { fontStyle: 'large', pageMargin: 64 },
  })];
  for (const state of fixtures) {
    const presentation = getTemplatePresentation(state);
    const { page, header: definition } = presentation.capabilities;
    assert.equal(definition.shadow.offsetPx, 14, 'the exception is deliberately limited to Coral’s 14px CSS shadow');
    const result = await inspect(state);
    const tables = elements(result.xml, 'w:tbl', true);
    const shadow = tables[0];
    const { rows, cells, header } = assertCoralShadowRows(shadow, `Coral ${state.contact.firstName}`);
    assertOnlyBoundedCardsLock(result.xml, 'Coral long-header pagination contract', 'coral');
    const inset = presentation.pageMarginPx * definition.horizontalInsetMultiplier;
    const leftInset = presentation.pageMarginPx * definition.leftInsetMultiplier;
    const headerWidth = Math.round(page.widthPx * 15) - Math.round((leftInset + inset) * 15);
    const offset = 210;
    const grid = elements(shadow, 'w:tblGrid')[0];
    assert.deepEqual(elements(grid, 'w:gridCol').map(column => Number(attribute(column, 'w:w'))), [offset, headerWidth - offset, offset]);
    assert.equal(Number(attribute(elements(directProperties(shadow, 'w:tblPr'), 'w:tblW')[0], 'w:w')), headerWidth + offset);
    assert.equal(Number(attribute(elements(directProperties(shadow, 'w:tblPr'), 'w:tblInd')[0], 'w:w')), Math.round(leftInset * 15));
    assert.ok(Math.round(leftInset * 15) + headerWidth + offset <= Math.round(page.widthPx * 15), 'shadow must remain inside the A4 page width');
    assert.equal(attribute(elements(directProperties(header, 'w:tblPr'), 'w:tblInd')[0], 'w:w'), '0', 'nested masthead must not apply the page indent twice');
    assert.equal(Number(attribute(elements(directProperties(header, 'w:tblPr'), 'w:tblW')[0], 'w:w')), headerWidth);
    const shadowColor = resolvePresentationColor(presentation, definition.shadow.color).slice(1);
    for (const [row, column] of [[1, 1], [2, 1]]) {
      const properties = directProperties(cells[row][column], 'w:tcPr');
      assert.equal(attribute(elements(properties, 'w:shd')[0], 'w:fill'), shadowColor);
    }
    assert.equal(attribute(elements(directProperties(cells[2][1], 'w:tcPr'), 'w:gridSpan')[0], 'w:val'), '2', 'bottom shadow spans the shifted header width');
    assert.equal(attribute(elements(directProperties(cells[0][1], 'w:tcPr'), 'w:tcW')[0], 'w:w'), '210');
    assert.equal(attribute(elements(directProperties(cells[1][1], 'w:tcPr'), 'w:tcW')[0], 'w:w'), '210');
    assert.equal(attribute(elements(directProperties(cells[2][1], 'w:tcPr'), 'w:tcW')[0], 'w:w'), String(headerWidth));
    const headerText = documentText(header);
    for (const value of [state.contact.firstName, state.contact.surname, state.contact.email, state.contact.city]) {
      assert.ok(headerText.includes(value), `long header content remains native editable text: ${value}`);
    }
    assert.equal(documentText(rows[0]), headerText, 'all text belongs to the vertically merged header, never the exact-height cutout');
    assert.equal(documentText(rows[1]), '', 'the auto-height continuation is structural, not duplicated text');
    const body = tables.find(table => table.includes('w:name="section_workHistory"'));
    assertTableFlows(body, 'Coral body below the shadow');
    assert.doesNotMatch(shadow, /<(?:w:drawing|w:pict|wp:anchor|w:tblpPr|w:framePr)\b/, 'the offset shadow must not position essential text in shapes');
  }
});

test('outlined section cards reserve their stroke inside the parent rail instead of clipping the right edge', async () => {
  for (const templateId of ['canvas', 'prism']) {
    for (const pageMargin of [32, 64]) {
      const state = createDocxFixture(templateId, 'medium', { design: { pageMargin } });
      const presentation = getTemplatePresentation(state);
      const definition = presentation.capabilities.heading;
      assert.equal(definition.sectionOutline.widthPx, 1, `${templateId}: fixture must exercise the native 1px card outline`);
      const result = await inspect(state);
      const body = elements(result.xml, 'w:tbl', true).find(table => table.includes('w:name="section_workHistory"'));
      const mainCell = elements(body, 'w:tc', true).at(-1);
      const parentProperties = directProperties(mainCell, 'w:tcPr');
      const parentWidth = Number(attribute(elements(parentProperties, 'w:tcW')[0], 'w:w'));
      const margins = elements(parentProperties, 'w:tcMar')[0];
      const contentWidth = parentWidth - ['left', 'right'].reduce((sum, edge) => sum + Number(attribute(elements(margins, `w:${edge}`)[0], 'w:w') || 0), 0);
      const cards = elements(mainCell, 'w:tbl', true).filter(table => table.includes('<w:bookmarkStart'));
      assert.ok(cards.length >= 2, `${templateId}: multiple cards must share the same safe content boundary`);
      for (const card of cards) {
        const cardWidth = Number(attribute(elements(directProperties(card, 'w:tblPr'), 'w:tblW')[0], 'w:w'));
        assert.equal(cardWidth, contentWidth - 15, `${templateId}/${pageMargin}: reserve exactly the 1px outline inside the parent rail`);
        const cell = elements(card, 'w:tc', true)[0];
        const properties = directProperties(cell, 'w:tcPr');
        assert.equal(Number(attribute(elements(properties, 'w:tcW')[0], 'w:w')), cardWidth);
        for (const edge of ['top', 'right', 'bottom', 'left']) {
          const line = elements(elements(properties, 'w:tcBorders')[0], `w:${edge}`)[0];
          assert.equal(attribute(line, 'w:val'), 'single');
          assert.equal(attribute(line, 'w:sz'), '6', `${templateId}: 1px stroke is 0.75pt / six eighth-points`);
        }
        const padding = definition.sectionPaddingPx * 15;
        const cardMargins = elements(properties, 'w:tcMar')[0];
        for (const edge of ['left', 'right']) assert.equal(Number(attribute(elements(cardMargins, `w:${edge}`)[0], 'w:w')), padding, 'stroke allowance must not consume the configured inner padding');
        if (card.includes('w:name="section_workHistory"')) {
          const entries = elements(cell, 'w:tbl', true).filter(table => state.workHistory.some(entry => documentText(table).includes(entry.jobTitle)));
          assert.equal(entries.length, state.workHistory.length);
          const innerWidth = cardWidth - padding * 2;
          for (const entry of entries) {
            const properties = directProperties(entry, 'w:tblPr');
            const width = Number(attribute(elements(properties, 'w:tblW')[0], 'w:w'));
            const indent = Number(attribute(elements(properties, 'w:tblInd')[0], 'w:w') || 0);
            assert.equal(width + indent, innerWidth, 'nested entry cards must honor the reduced safe width as well');
          }
          assertTableFlows(card, `${templateId}: outlined Experience remains a flowing long section`);
        }
      }
    }
  }
});

test('medium and large resumes start every content rail with an explicitly breakable pagination anchor', async () => {
  const layouts = new Set();
  for (const template of TEMPLATES) {
    for (const size of ['medium', 'large']) {
      const state = createDocxFixture(template.id, size);
      const presentation = getTemplatePresentation(state);
      const result = await inspect(state);
      layouts.add(result.metadata.ResumeLayout);
      const body = elements(result.xml, 'w:tbl', true).find(table => table.includes('w:name="section_workHistory"'));
      assert.ok(body, `${template.id}/${size}: the flowing body must exist`);
      const cells = elements(body, 'w:tc', true);
      // Only the first and last cells contain resume content. Intermediate
      // gutter and timeline-decoration cells do not participate in rail flow.
      const contentCells = presentation.capabilities.columns.count === 1 ? [cells[0]] : [cells[0], cells.at(-1)];
      for (const [index, cell] of contentCells.entries()) {
        assertLeadingBreakableAnchor(cell, `${template.id}/${size}/rail-${index}: pagination anchor`);
      }
      assertTableFlows(body, `${template.id}/${size}: body rows must remain breakable`);
      for (const section of result.sections) {
        const heading = elements(result.xml, 'w:p').find(paragraph => paragraph.includes(`w:name="${bookmarkName(section.id)}"`));
        const keepNext = elements(elements(heading, 'w:pPr')[0], 'w:keepNext')[0];
        assert.ok(keepNext, `${template.id}/${size}/${section.id}: real headings still stay with their content`);
        const value = attribute(keepNext, 'w:val');
        assert.ok(value === undefined || ['true', '1', 'on'].includes(value), `${template.id}/${size}/${section.id}: anchor must not disable heading keep-with-next`);
      }
    }
  }
  assert.deepEqual([...layouts].sort(), ['sidebar-left', 'sidebar-right', 'single-column']);
});

test('nested cards, side-by-side narratives, and full-width summaries have independent pagination anchors', async () => {
  for (const templateId of ['prism', 'canvas', 'orbit', 'minimal', 'summit', 'onyx']) {
    const result = await inspect(createDocxFixture(templateId, 'large'));
    const decoratedNarratives = elements(result.xml, 'w:tbl').filter(table => {
      const cells = elements(table, 'w:tc', true);
      return cells.length === 1 && table.includes('Initiative 1.1.');
    });
    assert.ok(decoratedNarratives.length, `${templateId}: decorated narrative tables must be exercised`);
    for (const table of decoratedNarratives) {
      assertLeadingBreakableAnchor(elements(table, 'w:tc', true)[0], `${templateId}: long decorated content`);
      assertTableFlows(table, `${templateId}: a long narrative card must not lock`);
    }
  }

  const mono = await inspect(createDocxFixture('mono', 'large'));
  const narrativeRows = elements(mono.xml, 'w:tbl').filter(table => {
    const cells = elements(table, 'w:tc', true);
    return cells.length === 2 && table.includes('Initiative 1.1.');
  });
  assert.equal(narrativeRows.length, 1, 'Swiss Minimal uses a separate identity and narrative cell per job');
  for (const [index, cell] of elements(narrativeRows[0], 'w:tc', true).entries()) {
    assertLeadingBreakableAnchor(cell, `Swiss Minimal: nested cell ${index}`);
  }

  const accountant = await inspect(createDocxFixture('accountant', 'large', {
    summary: { content: '<p>A long, editable summary paragraph.</p>'.repeat(160) },
  }));
  const summary = elements(accountant.xml, 'w:tbl', true).find(table => table.includes('w:name="section_summary"'));
  assert.ok(summary && !summary.includes('w:name="section_workHistory"'), 'Structured Finance summary stays above the columns');
  assertLeadingBreakableAnchor(elements(summary, 'w:tc', true)[0], 'Structured Finance: full-width summary');
  assertTableFlows(summary, 'Structured Finance: full-width summary must flow');
});

test('only bounded small cards stay together; long text, headings, and narrow columns remain breakable', async () => {
  const sectionTable = (result, id) => elements(result.xml, 'w:tbl').find(table => table.includes(`w:name="${bookmarkName(id)}"`));
  const base = await inspect(createDocxFixture('prism', 'medium'));
  const details = sectionTable(base, 'personalDetails');
  assert.ok(details, 'Prism Details card must be present');
  const rows = elements(details, 'w:tr', true);
  assert.equal(rows.length, 1);
  assert.equal(rowIsLocked(rows[0]), true, 'the short Details card must move as a whole instead of leaving an empty border fragment');
  assertLeadingBreakableAnchor(elements(details, 'w:tc', true)[0], 'short Details card');
  const experience = sectionTable(base, 'workHistory');
  assert.ok(elements(elements(experience, 'w:tc', true)[0], 'w:tbl').length, 'experience fixture must exercise nested entries');
  assertTableFlows(experience, 'whole Experience card');

  const cases = [
    ['long value', { personalDetails: { nationality: 'Finnish citizen with international working rights. '.repeat(8) } }],
    ['long heading', { design: { sectionTitles: { personalDetails: 'Personal information and professional eligibility '.repeat(8) } } }],
    ['many paragraphs', { personalDetails: { dob: '1990-04-02', nationality: 'Finnish', maritalStatus: 'Married', gender: 'Not specified' } }],
    ['narrow column', {
      personalDetails: { nationality: 'Finnish citizen supporting regional quality and engineering teams across Europe' },
      design: { pageMargin: 144, fontStyle: 'large', lineSpacing: 100,
        templateLayouts: { prism: { sectionColumns: { personalDetails: 'sidebar' } } } },
    }],
  ];
  for (const [name, overrides] of cases) {
    const result = await inspect(createDocxFixture('prism', 'medium', overrides));
    const card = sectionTable(result, 'personalDetails');
    assert.ok(card, `${name}: Details card must retain its content`);
    assertTableFlows(card, `${name}: Details card must not lock`);
    assertLeadingBreakableAnchor(elements(card, 'w:tc', true)[0], `${name}: Details card`);
    assertTableFlows(sectionTable(result, 'workHistory'), `${name}: whole Experience card`);
  }

  const result = await inspect(createDocxFixture('prism', 'small', {
    extraSections: { custom: [{ id: 'custom-total-limit', title: 'Bounded Paragraphs', content: `<p>${'a'.repeat(130)}</p><p>${'b'.repeat(130)}</p><p>${'c'.repeat(130)}</p>` }] },
  }));
  assertTableFlows(sectionTable(result, 'custom-total-limit'), 'individually short paragraphs whose total exceeds the card limit');
});

test('all three monogram templates use a 46px native square with a minimum, not fixed, row height', async () => {
  for (const templateId of ['orbit', 'canvas', 'prism']) {
    const state = createDocxFixture(templateId);
    assert.equal(getTemplatePresentation(state).capabilities.header.monogramSizePx, 46);
    const result = await inspect(state);
    const header = elements(result.xml, 'w:tbl', true)[0];
    const tiles = elements(header, 'w:tbl').filter(table => documentText(table) === 'A');
    assert.equal(tiles.length, 1, `${templateId}: one native monogram tile`);
    const tile = tiles[0];
    const grid = [...elements(tile, 'w:tblGrid')[0].matchAll(/<w:gridCol\b[^>]*>/g)].map(match => Number(attribute(match[0], 'w:w')));
    assert.deepEqual(grid, [690], `${templateId}: 46px monogram width in twips`);
    const row = elements(tile, 'w:tr', true)[0];
    const height = elements(directProperties(row, 'w:trPr'), 'w:trHeight')[0];
    assert.ok(height, `${templateId}: monogram row has a minimum height`);
    assert.equal(attribute(height, 'w:val'), '690');
    assert.equal(attribute(height, 'w:hRule'), 'atLeast', `${templateId}: a square minimum must not fix the height of text content`);
    const cell = elements(tile, 'w:tc', true)[0];
    const cellProperties = directProperties(cell, 'w:tcPr');
    assert.equal(attribute(elements(cellProperties, 'w:tcW')[0], 'w:w'), '690');
    assert.equal(attribute(elements(cellProperties, 'w:vAlign')[0], 'w:val'), 'center');
    const body = elements(result.xml, 'w:tbl', true).find(table => table.includes('w:name="section_workHistory"'));
    assertTableFlows(body, `${templateId}: decorative row sizing must not affect the body`);
  }
});

test('Word bookmarks have unique names and numeric start/end IDs even for long custom IDs', async () => {
  const state = createDocxFixture('metro');
  state.extraSections.custom.push(
    { id: 'custom-project-with-a-very-long-shared-prefix-one', title: 'First Long-ID Section', content: '<p>First unique content</p>' },
    { id: 'custom-project-with-a-very-long-shared-prefix-two', title: 'Second Long-ID Section', content: '<p>Second unique content</p>' },
  );
  const result = await inspect(state);
  const starts = [...result.xml.matchAll(/<w:bookmarkStart\b[^>]*>/g)].map(match => ({ id: attribute(match[0], 'w:id'), name: attribute(match[0], 'w:name') }));
  const ends = [...result.xml.matchAll(/<w:bookmarkEnd\b[^>]*>/g)].map(match => attribute(match[0], 'w:id'));
  assert.equal(new Set(starts.map(start => start.id)).size, starts.length);
  assert.equal(new Set(starts.map(start => start.name)).size, starts.length);
  for (const start of starts) {
    assert.match(start.name, /^[A-Za-z][A-Za-z0-9_]*$/);
    assert.ok(start.name.length <= 40, 'Word bookmark names must fit the supported name limit');
  }
  assert.deepEqual(ends.sort(), starts.map(start => start.id).sort());
});

test('font size, selected palette, custom accent, and explicit font choices reach Word content', async () => {
  for (const templateId of ['classic', 'metro', 'slate', 'developer', 'regal']) {
    for (const [fontStyle, size] of [['small', 10], ['normal', 11], ['large', 12]]) {
      const state = createDocxFixture(templateId, 'small', { design: { fontStyle, fontFamily: 'Georgia', colorScheme: '#123ABC', headingColor: '#234BCD', sidebarColor: '#345CDE' } });
      const result = await inspect(state);
      assert.equal(result.metadata.ResumeBodyFontPx, String(size));
      assert.equal(result.metadata.ResumeFont, 'Georgia');
      assert.ok(result.xml.includes('w:ascii="Georgia"'));
      assert.deepEqual(JSON.parse(result.metadata.ResumeColors), getTemplatePresentation(state).colors);
    }
    const template = TEMPLATES.find(item => item.id === templateId);
    const selected = getTemplateTheme(template, template.theme.presets[1].id);
    const state = createDocxFixture(templateId, 'small', { design: { themePreset: selected.id, colorScheme: selected.colors.accent, headingColor: selected.colors.heading, sidebarColor: selected.colors.sidebar, dividerColor: selected.colors.divider } });
    assert.deepEqual(JSON.parse((await inspect(state)).metadata.ResumeColors), selected.colors);
  }
});

test('rating output is opt-in and header websites are preserved in the shared renderer', async () => {
  const state = createDocxFixture('metro');
  state.websites[0].addToHeader = true;
  const plain = await inspect(state);
  assert.doesNotMatch(plain.text, /\([1-5]\/5\)|[★☆]/u);
  const enabled = await inspect({ ...state, skills: { ...state.skills, showRatings: true } });
  assert.match(enabled.text, /5\/5/);
  const header = elements(plain.xml, 'w:tbl', true)[0];
  assert.ok(documentText(header).includes(state.websites[0].url.replace(/^https?:\/\//, '')), 'header-selected profile link must remain in the Word header');
  const relationships = await plain.zip.file('word/_rels/document.xml.rels').async('string');
  assert.ok(relationships.includes(`Target="${state.websites[0].url}"`), 'header link must retain its full clickable URL');
});

test('template and user-selected page frames anchor all four borders to the physical page', async () => {
  const cases = [['developer', 'none'], ['executive', 'none'], ['classic', 'thin'], ['metro', 'medium'], ['minimal', 'thick']];
  for (const [templateId, pageBorder] of cases) {
    const result = await inspect(createDocxFixture(templateId, 'small', { design: { pageBorder } }));
    const borders = elements(result.xml, 'w:pgBorders')[0];
    assert.ok(borders, `${templateId}/${pageBorder}: missing page border`);
    assert.equal(attribute(borders, 'w:offsetFrom'), 'page', `${templateId}/${pageBorder}: frame must not be displaced by text margins`);
    for (const edge of ['top', 'right', 'bottom', 'left']) {
      const line = elements(borders, `w:${edge}`)[0];
      assert.ok(line, `${templateId}/${pageBorder}: missing ${edge} frame edge`);
      assert.ok(Number(attribute(line, 'w:sz')) > 0);
      assert.notEqual(attribute(line, 'w:val'), 'none');
    }
  }
});

test('adding a page border preserves intrinsic inset frames without putting resume text in the extra layer', async () => {
  for (const templateId of ['developer', 'bordeaux', 'executive']) {
    const plain = await inspect(createDocxFixture(templateId));
    const framed = await inspect(createDocxFixture(templateId, 'small', { design: { pageBorder: 'medium' } }));
    assert.equal(elements(framed.xml, 'w:pgBorders')[0], elements(plain.xml, 'w:pgBorders')[0], `${templateId}: intrinsic frame is preserved`);
    assert.equal(framed.text, plain.text, `${templateId}: no extra visible text or content movement is used to draw the frame`);
    const footers = Object.keys(framed.zip.files).filter(name => /^word\/footer\d+\.xml$/.test(name));
    if (templateId === 'executive') {
      assert.equal(footers.length, 0, 'same-color outer strokes merge visually with the existing wider executive frame');
      continue;
    }
    assert.equal(footers.length, 1);
    const footer = await framed.zip.file(footers[0]).async('string');
    assert.equal(documentText(footer), '', 'decorative frame contains no essential resume text');
    assert.match(footer, /descr="Decorative additional page frame"/);
    for (const axis of ['H', 'V']) assert.equal(attribute(elements(footer, `wp:position${axis}`)[0], 'relativeFrom'), 'page');
    assert.match(footer, /<wp:wrapNone\s*\/>/);
    assert.match(footer, /<a:noFill\s*\/>/);
    assert.match(framed.xml, /<w:footerReference\b[^>]*w:type="default"/, 'native extra ring repeats on every page');
  }
});

test('header cells do not cancel visible template divider lines with explicit no-border overrides', async () => {
  for (const template of TEMPLATES) {
    const state = createDocxFixture(template.id);
    const definition = getTemplatePresentation(state).capabilities.header;
    if (definition.identityInSidebar) continue;
    const configuredEdges = ['top', 'bottom', 'left'].filter(edge => definition[edge]?.widthPx);
    if (!configuredEdges.length) continue;
    const result = await inspect(state);
    const header = elements(result.xml, 'w:tbl', true)[0];
    const tableProperties = elements(header, 'w:tblPr')[0];
    for (const edge of configuredEdges) {
      assert.match(tableProperties, new RegExp(`<w:${edge}\\b[^>]*w:val="(?:single|double)"`), `${template.id}: configured header ${edge}`);
      for (const cell of elements(header, 'w:tc', true)) {
        const cellProperties = elements(cell, 'w:tcPr')[0];
        assert.doesNotMatch(cellProperties, new RegExp(`<w:${edge}\\b[^>]*w:val="none"`), `${template.id}: cell must not override header ${edge} rule`);
      }
    }
  }
});

test('header/body and nested entry tables remain distinct through explicit one-twip separators', async () => {
  for (const template of TEMPLATES) {
    const state = createDocxFixture(template.id);
    const presentation = getTemplatePresentation(state);
    const result = await inspect(state);
    const tables = elements(result.xml, 'w:tbl', true);
    for (let index = 1; index < tables.length; index += 1) {
      const gap = betweenTables(result.xml, tables[index - 1], tables[index]);
      const topMargin = index === tables.length - 1 && presentation.capabilities.columns.topMarginPx;
      if (presentation.capabilities.columns.timelineRail) {
        assertSpacer(gap, Math.round(presentation.capabilities.columns.topPaddingPx * 15), `${template.id}: space above the entire timeline`);
      } else if (topMargin) {
        assertSpacer(gap, 15, `${template.id}: configured space above columns`, { beforeTwips: Math.round(topMargin * 15), lineRule: 'atLeast' });
      } else assertSpacer(gap, 1, `${template.id}: masthead/body separator`);
    }
    if (template.id === 'slate') {
      assert.match(elements(tables[0], 'w:tblPr')[0], /<w:bottom\b[^>]*w:val="double"/, 'Slate must retain its separate double masthead divider');
    }
  }

  // With optional subtitle and description omitted, these equal-width entry
  // tables are direct siblings inside the main rail, not only at document root.
  const state = createDocxFixture('slate', 'medium');
  state.workHistory = state.workHistory.slice(0, 2).map((entry, index) => ({
    ...entry, jobTitle: `NESTED_TABLE_${index}`, employer: '', location: '', description: '',
  }));
  const result = await inspect(state);
  const body = elements(result.xml, 'w:tbl', true).find(table => table.includes('w:name="section_workHistory"'));
  const mainCell = elements(body, 'w:tc', true)[0];
  const tables = elements(mainCell, 'w:tbl', true);
  const entries = state.workHistory.map(entry => tables.find(table => documentText(table).includes(entry.jobTitle)));
  assert.ok(entries.every(Boolean), 'both nested entry tables must exist');
  assert.equal(attribute(elements(entries[0], 'w:tblW')[0], 'w:w'), attribute(elements(entries[1], 'w:tblW')[0], 'w:w'), 'regression fixture must exercise equal-width nested tables');
  assertSpacer(betweenTables(mainCell, entries[0], entries[1]), 1, 'Slate nested entry separator');
});

test('section and entry card gaps sit outside their outlines and shaded content', async () => {
  for (const templateId of ['canvas', 'prism', 'orbit']) {
    const state = createDocxFixture(templateId, 'medium');
    const presentation = getTemplatePresentation(state);
    const result = await inspect(state);
    const body = elements(result.xml, 'w:tbl', true).find(table => table.includes('w:name="section_workHistory"'));
    const mainCell = elements(body, 'w:tc', true).at(-1);
    let entryContainer = mainCell;
    if (presentation.capabilities.heading.sectionOutline) {
      const cards = elements(mainCell, 'w:tbl', true);
      assert.ok(cards.length >= 2, `${templateId}: fixture must contain multiple section cards`);
      for (const card of cards) {
        const heading = elements(card, 'w:p').find(paragraph => paragraph.includes('<w:bookmarkStart'));
        assert.equal(attribute(elements(heading, 'w:spacing')[0], 'w:before'), '0', `${templateId}: section gap must not inflate the inside of the card`);
        const properties = elements(elements(card, 'w:tc', true)[0], 'w:tcPr')[0];
        const outline = elements(properties, 'w:tcBorders')[0];
        for (const edge of ['top', 'bottom', 'left', 'right']) {
          assert.equal(attribute(elements(outline, `w:${edge}`)[0], 'w:val'), 'single', `${templateId}: section ${edge} outline`);
        }
      }
      for (let index = 1; index < cards.length; index += 1) {
        assertSpacer(betweenTables(mainCell, cards[index - 1], cards[index]), Math.round(presentation.spacing.sectionPx * 15), `${templateId}: section-card gap`, { keepNext: true });
      }
      const workCard = cards.find(card => card.includes('w:name="section_workHistory"'));
      entryContainer = elements(workCard, 'w:tc', true)[0];
    }
    const entries = elements(entryContainer, 'w:tbl', true).filter(table => state.workHistory.some(entry => documentText(table).includes(entry.jobTitle)));
    assert.equal(entries.length, state.workHistory.length, `${templateId}: every work entry keeps its own decorated card`);
    for (let index = 0; index < entries.length; index += 1) {
      const title = elements(entries[index], 'w:p').find(paragraph => documentText(paragraph).includes(state.workHistory[index].jobTitle));
      assert.equal(attribute(elements(title, 'w:spacing')[0], 'w:before'), '0', `${templateId}: entry spacing must not inflate the shaded card interior`);
      if (index) {
        const gap = presentation.capabilities.entry.gapPx ?? presentation.spacing.entryPx;
        assertSpacer(betweenTables(entryContainer, entries[index - 1], entries[index]), Math.round(gap * 15), `${templateId}: entry-card gap`, { keepNext: true });
      }
    }
  }
});

test('heading top padding and right-aligned notch markers follow the selected template', async () => {
  for (const template of TEMPLATES) {
    const state = createDocxFixture(template.id);
    const definition = getTemplatePresentation(state).capabilities.heading;
    const topPadding = definition.paddingPx?.[0] || definition.paddingTopPx || 0;
    if (!topPadding) continue;
    const result = await inspect(state);
    const first = result.sections.find(section => section.column === 'main');
    const heading = elements(result.xml, 'w:p').find(paragraph => paragraph.includes(`w:name="${bookmarkName(first.id)}"`));
    assert.equal(Number(attribute(elements(heading, 'w:spacing')[0], 'w:before')), Math.round(topPadding * 15), `${template.id}: first heading retains its own top padding`);
  }

  const result = await inspect(createDocxFixture('muse'));
  const name = bookmarkName(result.sections.find(section => section.column === 'main').id);
  const heading = elements(result.xml, 'w:p').find(paragraph => paragraph.includes(`w:name="${name}"`));
  const rail = elements(result.xml, 'w:tc').find(cell => cell.includes(`w:name="${name}"`));
  const cellProperties = elements(rail, 'w:tcPr')[0];
  const width = Number(attribute(elements(cellProperties, 'w:tcW')[0], 'w:w'));
  const margins = elements(cellProperties, 'w:tcMar')[0];
  const contentWidth = width - ['left', 'right'].reduce((sum, edge) => sum + Number(attribute(elements(margins, `w:${edge}`)[0], 'w:w') || 0), 0);
  const tab = elements(elements(heading, 'w:tabs')[0], 'w:tab')[0];
  assert.equal(attribute(tab, 'w:val'), 'right', 'Muse notch belongs at the right edge, not next to the title');
  assert.equal(Number(attribute(tab, 'w:pos')), contentWidth);
  const tabRun = /<w:tab\s*\/>/.exec(heading);
  assert.ok(tabRun && tabRun.index < heading.indexOf('◆'), 'notch text must follow the real right-tab run');
});

test('native list markers remain white and readable on filled sidebar rails', async () => {
  for (const template of TEMPLATES) {
    const state = createDocxFixture(template.id);
    const presentation = getTemplatePresentation(state);
    if (presentation.capabilities.columns.sidebarStyle !== 'solid') continue;
    const result = await inspect(state);
    const bodyTable = elements(result.xml, 'w:tbl', true).find(table => table.includes('w:name="section_skills"'));
    const cells = elements(bodyTable, 'w:tc', true);
    const sideCell = cells[presentation.capabilities.columns.sidebarPosition === 'right' ? cells.length - 1 : 0];
    for (const paragraph of elements(sideCell, 'w:p')) {
      const numTag = paragraph.match(/<w:numId\b[^>]*>/)?.[0];
      if (!numTag) continue;
      const numId = attribute(numTag, 'w:val');
      const num = elements(result.numberingXml, 'w:num').find(item => attribute(item, 'w:numId') === numId);
      const abstractId = attribute(num.match(/<w:abstractNumId\b[^>]*>/)[0], 'w:val');
      const definition = elements(result.numberingXml, 'w:abstractNum').find(item => attribute(item, 'w:abstractNumId') === abstractId);
      assert.match(definition, /<w:color\b[^>]*w:val="FFFFFF"/, `${template.id}: native sidebar list marker must not disappear against a dark fill`);
    }
  }
});

test('empty optional sections do not produce blank headings or generic placeholders', async () => {
  for (const template of TEMPLATES) {
    const state = createDocxFixture(template.id, 'small', {
      summary: { content: '<p><br></p>' }, workHistory: [], education: [],
      skills: { ratings: [], textContent: '' }, websites: [], personalDetails: {},
      certifications: { content: '' }, languages: [], extraSections: { selected: [], custom: [] },
    });
    state.personalDetails = {};
    const result = await inspect(state);
    assert.deepEqual(result.sections, [], `${template.id}: empty sections must not emit headings`);
    assert.doesNotMatch(result.text, /Custom Section|Additional Information|Your Name/);
  }
});

test('education titles, metadata separators, and coursework follow the shared content definition', async () => {
  const education = {
    id: 'education-contract', degree: 'Degree Marker', fieldOfStudy: 'Discipline Marker',
    schoolName: 'School Marker', location: 'Education City', graduationDate: '2021-05',
    coursework: '<p>COURSEWORK_CONTENT_MARKER</p>',
  };
  for (const template of TEMPLATES) {
    const state = createDocxFixture(template.id, 'small', { education: [education] });
    const entry = getTemplatePresentation(state).capabilities.entry;
    const definition = entry.education;
    const value = field => field === 'degree' ? education.degree || education.level : education[field];
    const title = definition.titleFields.map(value).filter(Boolean).join(definition.titleSeparator);
    let subtitle = definition.subtitleFields.map(value).filter(Boolean).join(definition.subtitleSeparator);
    if (definition.locationSuffixSeparator && education.location) subtitle += `${definition.locationSuffixSeparator}${education.location}`;
    const result = await inspect(state);
    assert.ok(result.text.toLowerCase().includes(title.toLowerCase()), `${template.id}: education title must use its configured fields`);
    assert.ok(result.text.toLowerCase().includes(subtitle.toLowerCase()), `${template.id}: education subtitle must use its configured field order and separator`);
    assert.equal(result.text.includes('COURSEWORK_CONTENT_MARKER'), Boolean(entry.includeCoursework), `${template.id}: coursework visibility must match the UI template`);
  }
});

test('personal-detail labels and stacked versus inline organization follow template content capabilities', async () => {
  const details = { dob: '16 May 1990', nationality: 'Nationality Marker', maritalStatus: 'Status Marker', gender: 'Gender Marker' };
  for (const template of TEMPLATES) {
    const state = createDocxFixture(template.id, 'small', { personalDetails: details });
    const definition = getTemplatePresentation(state).capabilities.content.personalDetails;
    const paragraphs = elements((await inspect(state)).xml, 'w:p').map(documentText);
    for (const [field, value] of Object.entries(details)) {
      const label = definition.labelTransform === 'uppercase' ? definition.labels[field].toUpperCase() : definition.labels[field];
      if (definition.variant === 'stacked-labels') {
        const valueIndex = paragraphs.indexOf(value);
        assert.ok(valueIndex > 0, `${template.id}: ${field} value must have a separate line`);
        assert.equal(paragraphs[valueIndex - 1].replace(/:$/, ''), label, `${template.id}: ${field} label must match the preview`);
      } else {
        assert.ok(paragraphs.some(paragraph => paragraph.includes(value) && paragraph.includes(label)), `${template.id}: ${field} label and value must remain inline`);
      }
    }
  }
});

test('language bullets and grid organization are translated from shared content capabilities', async () => {
  const languages = [{ id: 'lang-a', language: 'First Language Marker' }, { id: 'lang-b', language: 'Second Language Marker' }];
  for (const template of TEMPLATES) {
    const state = createDocxFixture(template.id, 'small', { languages });
    const presentation = getTemplatePresentation(state);
    const definition = presentation.capabilities.content.languages;
    const result = await inspect(state);
    for (const language of languages) {
      const paragraph = elements(result.xml, 'w:p').find(item => documentText(item) === language.language);
      assert.ok(paragraph, `${template.id}: language text must remain editable`);
      assert.equal(/<w:numPr\b/.test(paragraph), definition.variant === 'list', `${template.id}: language list treatment must match the preview`);
    }
    if (definition.variant === 'grid' && presentation.capabilities.columns.count === 1) {
      const grid = elements(result.xml, 'w:tbl').find(table => {
        const cells = elements(table, 'w:tc', true);
        const positions = languages.map(language => cells.findIndex(cell => documentText(cell).includes(language.language)));
        return positions.every(position => position >= 0) && new Set(positions).size === languages.length;
      });
      assert.ok(grid, `${template.id}: short languages must retain their grid in the full-width body`);
    }
  }
});

test('rich DOCX content retains paragraph/list order, inline emphasis, links, and editable text', async () => {
  const source = '<p>Before <strong>bold</strong> and <em>italic</em>.</p><ol><li>First ordered item</li><li>Second ordered item</li></ol><p>After <a href="https://example.com">linked text</a>.</p><ul><li>Final bullet</li></ul>';
  const blocks = docxRichTextBlocks(source);
  assert.deepEqual(blocks.map(block => block.text), ['Before bold and italic.', 'First ordered item', 'Second ordered item', 'After linked text.', 'Final bullet']);
  assert.equal(blocks[1].list, 'decimal');
  assert.equal(blocks[4].list, 'bullet');
  assert.ok(blocks[0].runs.some(run => run.bold && run.text === 'bold'));
  assert.ok(blocks[0].runs.some(run => run.italics && run.text === 'italic'));
  const result = await inspect(createDocxFixture('classic', 'small', { summary: { content: source } }));
  const extracted = (await mammoth.extractRawText({ buffer: result.buffer })).value;
  let last = -1;
  for (const block of blocks) {
    const position = extracted.indexOf(block.text);
    assert.ok(position > last, `Editable text order: ${block.text}`);
    last = position;
  }
  assert.match(result.numberingXml, /w:val="decimal"/);
  assert.match(result.numberingXml, /w:val="bullet"/);
  assert.match(result.xml, /<w:hyperlink\b/);
});

test('app light/dark theme and import metadata cannot change DOCX template content', async () => {
  const state = createDocxFixture('metro', 'customized');
  const originalDocument = globalThis.document;
  try {
    globalThis.document = { documentElement: { dataset: { theme: 'light' } } };
    const light = await inspect(state);
    globalThis.document = { documentElement: { dataset: { theme: 'dark' } } };
    const darkImported = await inspect({ ...state, importMeta: { quality: 0.9, importedAt: '2026-01-01', source: 'uploaded-docx' } });
    assert.deepEqual(darkImported.metadata, light.metadata);
    assert.equal(darkImported.text, light.text);
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
