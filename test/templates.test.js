import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterTemplates,
  getTemplateTheme,
  TEMPLATE_CATEGORIES,
  TEMPLATES,
} from '../src/data/templates.js';
import { getResumeLayout } from '../src/utils/resumeSections.js';

function layoutState(templateId) {
  return {
    meta: { templateId },
    design: { templateLayouts: {} },
    extraSections: { selected: ['custom-projects'], custom: [{ id: 'custom-projects', title: 'Projects', content: '<p>Project</p>' }] },
  };
}

test('catalog contains at least 35 structurally unique template identities', () => {
  assert.ok(TEMPLATES.length >= 35);
  assert.equal(new Set(TEMPLATES.map(template => template.id)).size, TEMPLATES.length);
  assert.equal(new Set(TEMPLATES.map(template => template.designSignature)).size, TEMPLATES.length);
  assert.ok(TEMPLATES.filter(template => template.baseTemplate === 'blueprint').length >= 20);
  for (const template of TEMPLATES) {
    assert.ok(template.description.length > 20, `${template.id} needs a meaningful description`);
    assert.ok(template.categories.includes(template.layout === '2-column' ? 'two-column' : 'single-column'));
    assert.ok(template.theme.presets.length >= 3, `${template.id} needs selectable themes`);
  }
});

test('category filters and ATS labels derive from template metadata', () => {
  const categoryIds = new Set(TEMPLATE_CATEGORIES.map(category => category.id));
  assert.ok(categoryIds.has('ats'));
  assert.ok(categoryIds.has('technical'));
  assert.ok(categoryIds.has('two-column'));
  assert.deepEqual(filterTemplates('all').map(template => template.id), TEMPLATES.map(template => template.id));
  assert.ok(filterTemplates('ats').length >= 10);
  assert.ok(filterTemplates('ats').every(template => template.atsFriendly));
  assert.ok(filterTemplates('two-column').every(template => template.layout === '2-column'));
});

test('theme presets and custom colors are settings rather than extra template cards', () => {
  const template = TEMPLATES.find(item => item.id === 'orbit');
  const preset = template.theme.presets[1];
  const selected = getTemplateTheme(template, preset.id);
  assert.equal(selected.id, preset.id);
  assert.deepEqual(selected.colors, preset.colors);
  const custom = getTemplateTheme(template, preset.id, { accent: '#123ABC', sidebar: 'not-a-color' });
  assert.equal(custom.colors.accent, '#123ABC');
  assert.equal(custom.colors.sidebar, preset.colors.sidebar);
});

test('each template resolves a complete template-scoped section composition', () => {
  for (const template of TEMPLATES) {
    const state = layoutState(template.id);
    const layout = getResumeLayout(state, template.id);
    assert.equal(layout.isTwoColumn, template.layout === '2-column');
    assert.equal(layout.sectionOrder.length, new Set(layout.sectionOrder).size);
    assert.ok(layout.sectionOrder.includes('summary'));
    assert.ok(layout.sectionOrder.includes('custom-projects'));
    assert.deepEqual(
      new Set([...layout.columns.sidebar, ...layout.columns.main]),
      new Set(layout.sectionOrder),
      `${template.id} must place every section exactly once`,
    );
    if (layout.isTwoColumn) {
      assert.ok(layout.columns.sidebar.length > 0, `${template.id} needs a sidebar default`);
      assert.ok(layout.columns.main.length > 0, `${template.id} needs a main-column default`);
    }
  }
});
