import assert from 'node:assert/strict';
import test from 'node:test';
import { TEMPLATES } from '../src/data/templates.js';
import { defineTemplatePresentation } from '../src/data/templatePresentation.js';

const createBlueprint = blueprint => defineTemplatePresentation({
  id: 'future-template', baseTemplate: 'blueprint', layout: '2-column', blueprint,
});
const fields = ['header', 'heading', 'entry', 'skills', 'density', 'ratio', 'sidebarStyle', 'sidebarPosition'];

test('all 35 existing templates retain their declared presentation', () => {
  assert.equal(TEMPLATES.length, 35);
  for (const template of TEMPLATES) {
    assert.deepEqual(defineTemplatePresentation(template), template.presentation, template.id);
    assert.equal(Object.isFrozen(template.presentation), true, template.id);
  }
});

test('future templates may combine existing supported blueprint capabilities', () => {
  const blueprint = {
    header: 'module', heading: 'diamond', entry: 'cards', skills: 'chips',
    density: 'airy', ratio: 'wide', sidebarStyle: 'tint', sidebarPosition: 'right',
    signature: 'future:module:diamond:cards',
  };
  const presentation = createBlueprint(blueprint);
  assert.equal(presentation.header.variant, 'module');
  assert.equal(presentation.heading.variant, 'diamond');
  assert.equal(presentation.entry.variant, 'cards');
  assert.equal(presentation.skills.variant, 'chips');
  assert.equal(presentation.density.variant, 'airy');
  assert.equal(presentation.columns.sidebarFraction, 0.41);
  assert.equal(presentation.columns.sidebarStyle, 'tint');
  assert.equal(presentation.columns.sidebarPosition, 'right');
  assert.equal(presentation.blueprint.signature, blueprint.signature);
});

test('omitted and undefined options preserve existing blueprint defaults', () => {
  const expected = createBlueprint({});
  assert.equal(expected.header.variant, 'left');
  assert.equal(expected.heading.variant, 'underline');
  assert.equal(expected.entry.variant, 'standard');
  assert.equal(expected.skills.variant, 'list');
  assert.equal(expected.density.variant, 'normal');
  assert.equal(expected.columns.sidebarFraction, 0.38);
  assert.equal(expected.columns.sidebarStyle, 'plain');
  assert.equal(expected.columns.sidebarPosition, 'left');
  for (const blueprint of [undefined, null, Object.fromEntries(fields.map(key => [key, undefined]))]) {
    const actual = createBlueprint(blueprint);
    for (const key of ['header', 'heading', 'entry', 'skills', 'density', 'columns', 'page']) {
      assert.deepEqual(actual[key], expected[key], key);
    }
  }
});

test('explicit default and catalogue capability values are supported', () => {
  const explicitDefaults = {
    header: 'left', heading: 'underline', entry: 'standard', skills: 'list',
    density: 'normal', ratio: 'balanced', sidebarStyle: 'plain', sidebarPosition: 'left',
  };
  assert.doesNotThrow(() => createBlueprint(explicitDefaults));
  for (const field of fields) {
    const knownValues = new Set(TEMPLATES.map(template => template.blueprint?.[field]).filter(value => value !== undefined));
    for (const value of knownValues) {
      assert.doesNotThrow(() => createBlueprint({ ...explicitDefaults, [field]: value }), `${field}: ${value}`);
    }
  }
});

for (const field of fields) {
  test(`unknown blueprint ${field} fails with the template and field identified`, () => {
    for (const value of ['unsupported-variant', '__proto__', 'constructor', 'toString', '', null, false, 0, {}, [], Object.create(null), Symbol('invalid')]) {
      assert.throws(() => createBlueprint({ [field]: value }), error => {
        assert.equal(error instanceof Error, true);
        assert.match(error.message, /Template future-template/);
        assert.ok(error.message.includes(`unsupported blueprint ${field}:`));
        return true;
      });
    }
  });
}

test('unknown legacy templates still require explicit capabilities', () => {
  assert.throws(() => defineTemplatePresentation({ id: 'unregistered-legacy', baseTemplate: 'unregistered-legacy' }),
    /Template unregistered-legacy requires presentation capabilities/);
});
