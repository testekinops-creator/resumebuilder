import assert from 'node:assert/strict';
import test from 'node:test';
import { docxFilename, sanitizeDocxState } from '../src/utils/docxContent.js';
import { createDocxFixture, DOCX_FIXTURE_SIZES } from '../scripts/fixtures/docxResumeFixtures.mjs';
import { TEMPLATES } from '../src/data/templates.js';

test('DOCX content normalization is a non-mutating copy and preserves rich text', () => {
  const original = createDocxFixture('metro', 'customized');
  original.summary.content = '<p>Clear <strong>ownership</strong> &amp; accessible <em>delivery</em>.</p><ul><li>First</li></ul><p>After the list.</p>';
  original.websites[0].addToHeader = true;
  const before = structuredClone(original);
  const normalized = sanitizeDocxState(original);
  assert.deepEqual(original, before);
  assert.notStrictEqual(normalized, original);
  assert.notStrictEqual(normalized.design.templateLayouts, original.design.templateLayouts);
  assert.notStrictEqual(normalized.workHistory, original.workHistory);
  assert.equal(normalized.summary.content, original.summary.content);
  assert.equal(normalized.websites[0].addToHeader, true);
  assert.equal(normalized.meta.templateId, 'metro');
  assert.deepEqual(normalized.design.templateLayouts.metro, original.design.templateLayouts.metro);
});

test('DOCX normalization clears non-text values and sentinel strings before rendering', () => {
  const state = sanitizeDocxState({
    contact: { firstName: 'Alex\u0000', surname: 'Morgan', email: ' undefined ', phone: NaN, city: { name: 'unexpected' }, pinCode: 0 },
    summary: { content: 'null' }, certifications: { content: ['not', 'html'] },
    workHistory: [null, 'invalid', {}, { id: 'blank' }, { id: 'valid', jobTitle: 'Quality Engineer', employer: 'NaN', startDate: 'Invalid Date', currentJob: 'true', description: undefined }],
    education: [{ id: 'edu', degree: 'B.Sc.', graduationDate: Infinity }],
    websites: [null, { url: 'null' }, { url: 'https://example.com', addToHeader: 'true' }],
    languages: [null, { language: 'undefined' }, { language: 'English' }],
    skills: { ratings: [null, { name: 'null' }, { name: 'Testing', rating: NaN }], showRatings: 'true' },
    extraSections: { selected: [null, 'custom-1', 'custom-1'], custom: [null, { id: 'custom-1', title: 'Projects', content: '<p>Safe content</p>' }, { id: 'custom-1', title: 'Duplicate', content: 'duplicate' }] },
    design: { sectionSpacing: NaN, paragraphSpacing: '75', pageMargin: null, sectionTitles: { skills: 42, summary: {} } },
  });
  assert.equal(state.contact.firstName, 'Alex');
  assert.equal(state.contact.email, '');
  assert.equal(state.contact.phone, '');
  assert.equal(state.contact.city, '');
  assert.equal(state.contact.pinCode, '0');
  assert.equal(state.summary.content, '');
  assert.equal(state.certifications.content, '');
  assert.equal(state.workHistory.length, 1);
  assert.equal(state.workHistory[0].startDate, '');
  assert.equal(state.workHistory[0].currentJob, false);
  assert.equal(state.education[0].graduationDate, '');
  assert.deepEqual(state.websites, [{ url: 'https://example.com', addToHeader: false }]);
  assert.equal(state.languages.length, 1);
  assert.equal(state.skills.ratings.length, 1);
  assert.equal(state.skills.showRatings, false);
  assert.equal(state.skills.ratings[0].rating, 1);
  assert.deepEqual(state.extraSections.selected, ['custom-1']);
  assert.equal(state.extraSections.custom.length, 1);
  assert.equal(state.design.paragraphSpacing, 75);
  assert.equal(state.design.pageMargin, undefined);
  assert.equal(state.design.sectionSpacing, undefined);
});

test('malformed collections normalize to empty arrays and contact aliases remain usable', () => {
  for (const input of [undefined, null, 4, [], 'invalid']) {
    const state = sanitizeDocxState(input);
    assert.equal(state.meta.templateId, 'classic');
    for (const key of ['workHistory', 'education', 'websites', 'languages']) assert.deepEqual(state[key], []);
    assert.deepEqual(state.skills.ratings, []);
    assert.deepEqual(state.extraSections.custom, []);
  }
  const state = sanitizeDocxState({ contact: { firstName: 'Zoë', lastName: 'Łukasz' }, workHistory: {}, websites: 'bad', extraSections: { custom: {} } });
  assert.equal(state.contact.surname, 'Łukasz');
  assert.deepEqual(state.workHistory, []);
  assert.deepEqual(state.websites, []);
});

test('DOCX normalizes current layout records without erasing legacy layout fallback', () => {
  const legacy = sanitizeDocxState({ design: { sectionOrder: ['skills', 'summary', 'skills'], sectionColumns: { skills: 'sidebar', summary: 'main', invalid: 'left' } } });
  assert.equal(legacy.design.templateLayouts, undefined);
  assert.deepEqual(legacy.design.sectionOrder, ['skills', 'summary']);
  assert.deepEqual(legacy.design.sectionColumns, { skills: 'sidebar', summary: 'main' });
  const scoped = sanitizeDocxState({ design: { templateLayouts: { metro: { sectionOrder: ['skills', null, 'summary'], sectionColumns: { skills: 'sidebar', summary: 'main', bad: 'wrong' } }, broken: null } } });
  assert.deepEqual(scoped.design.templateLayouts, { metro: { sectionOrder: ['skills', 'summary'], sectionColumns: { skills: 'sidebar', summary: 'main' } } });
});

test('skill rating visibility remains explicitly opt-in and bounded', () => {
  const normalized = sanitizeDocxState({ skills: { showRatings: true, ratings: [{ name: 'One', rating: -4 }, { name: 'Two', rating: 19 }, { name: 'Three', rating: 3.4 }] } });
  assert.equal(normalized.skills.showRatings, true);
  assert.deepEqual(normalized.skills.ratings.map(skill => skill.rating), [1, 5, 3]);
  for (const value of [undefined, false, 'true', 1]) assert.equal(sanitizeDocxState({ skills: { showRatings: value } }).skills.showRatings, false);
});

test('DOCX filename uses the full name for generic titles and preserves meaningful custom titles', () => {
  const state = { contact: { firstName: 'Deepak', surname: 'Hegde' }, meta: { name: 'My Resume' } };
  for (const title of [undefined, null, '', 'Resume', 'My Resume', 'My Resume (3)', 'null']) assert.equal(docxFilename(state, title), 'Deepak_Hegde_Resume.docx');
  assert.equal(docxFilename(state, 'Senior QA Engineer'), 'Senior_QA_Engineer.docx');
  assert.equal(docxFilename({ ...state, meta: { name: 'Engineering Portfolio' } }), 'Engineering_Portfolio.docx');
  assert.equal(docxFilename({}), 'Resume.docx');
  assert.equal(docxFilename({ contact: { firstName: 'Zoë', lastName: 'Łukasz' } }), 'Zoë_Łukasz_Resume.docx');
});

test('DOCX filenames remove path/control characters, repeated extensions, and Windows device names', () => {
  assert.equal(docxFilename({}, 'CON.docx'), 'Resume_CON.docx');
  assert.equal(docxFilename({}, 'LPT1'), 'Resume_LPT1.docx');
  assert.equal(docxFilename({}, 'NUL.txt'), 'Resume_NUL.txt.docx');
  assert.equal(docxFilename({}, 'Alex Resume.docx.docx'), 'Alex_Resume.docx');
  const name = docxFilename({}, '../../Resume: QA|2026?\u0000\u202E   ');
  // eslint-disable-next-line no-control-regex -- This assertion verifies removal of unsafe control characters.
  assert.doesNotMatch(name, /[\\/:*?"<>|\u0000-\u001F\u202A-\u202E]/);
  assert.doesNotMatch(name, /^[. ]|[. ]\.docx$/);
  const longName = docxFilename({}, '界'.repeat(200));
  assert.equal([...longName.replace(/\.docx$/, '')].length, 100);
});

test('every template has reusable deterministic small, medium, large, long-text, and customized fixtures', () => {
  for (const template of TEMPLATES) {
    for (const size of DOCX_FIXTURE_SIZES) {
      const fixture = createDocxFixture(template.id, size);
      assert.equal(fixture.meta.templateId, template.id);
      assert.ok(fixture.workHistory.length > 0);
      assert.deepEqual(fixture, createDocxFixture(template.id, size));
    }
    assert.ok(createDocxFixture(template.id, 'medium').workHistory.length > createDocxFixture(template.id).workHistory.length);
    assert.ok(createDocxFixture(template.id, 'large').extraSections.custom.some(section => section.title === 'Awards & Recognition'));
  }
  assert.throws(() => createDocxFixture('classic', 'unknown'), /Unknown DOCX fixture size/);
});

test('fixture overrides merge nested records, replace arrays, and do not share state', () => {
  const fixture = createDocxFixture('classic', 'small', { design: { fontStyle: 'large' }, workHistory: [] });
  assert.equal(fixture.design.fontStyle, 'large');
  assert.equal(fixture.design.fontFamily, 'Inter');
  assert.deepEqual(fixture.workHistory, []);
  fixture.skills.ratings[0].name = 'Changed';
  assert.notEqual(createDocxFixture('classic').skills.ratings[0].name, 'Changed');
});
