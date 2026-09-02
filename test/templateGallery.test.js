import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { getTemplateTheme, TEMPLATES } from '../src/data/templates.js';

const galleryPath = new URL('../src/pages/onboarding/TemplateGallery.jsx', import.meta.url);
const stylesPath = new URL('../src/pages/onboarding/TemplateGallery.css', import.meta.url);

async function sourceFiles() {
  const [gallery, styles] = await Promise.all([
    readFile(galleryPath, 'utf8'),
    readFile(stylesPath, 'utf8'),
  ]);
  return { gallery, styles };
}

// Source contracts complement viewport/browser checks without adding a DOM
// dependency. Compare declarations independently of formatting/property order.
function cssDeclarations(styles, selector) {
  const declarations = {};
  let found = false;
  for (const match of styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const preceding = styles.slice(0, match.index);
    const depth = (preceding.match(/\{/g) || []).length - (preceding.match(/\}/g) || []).length;
    if (depth) continue;
    const selectors = match[1].replace(/\/\*[\s\S]*?\*\//g, '').split(',').map(value => value.trim().replace(/\s+/g, ' '));
    if (!selectors.includes(selector)) continue;
    found = true;
    Object.assign(declarations, Object.fromEntries(match[2].split(';').filter(value => value.includes(':')).map(value => {
      const separator = value.indexOf(':');
      return [value.slice(0, separator).trim(), value.slice(separator + 1).trim().replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',')];
    })));
  }
  assert.ok(found, `Missing CSS rule: ${selector}`);
  return declarations;
}

function callbackSource(gallery, name) {
  const start = gallery.indexOf(`const ${name} =`);
  assert.notEqual(start, -1, `Missing callback: ${name}`);
  if (gallery.slice(start).startsWith(`const ${name} = useCallback(`)) {
    const end = gallery.indexOf('\n\n', start);
    assert.notEqual(end, -1, `Unclosed callback: ${name}`);
    return gallery.slice(start, end);
  }
  const end = gallery.indexOf('\n  };', start);
  assert.notEqual(end, -1, `Unclosed callback: ${name}`);
  return gallery.slice(start, end + '\n  };'.length);
}

function confirmationSource(gallery) {
  const footer = gallery.match(/<footer\b[^>]*className="template-selection-bar"[\s\S]*?<\/footer>/);
  assert.ok(footer, 'The gallery needs a persistent confirmation footer');
  return footer[0];
}

function continuationHarness(gallery, selectedTemplate) {
  const continuingRef = { current: false };
  const busyStates = [];
  const destinations = [];
  // Exercise the actual callback with its React/router dependencies stubbed.
  // A synchronous ref must reject a second click before React can rerender.
  const handleContinue = runInNewContext(`${callbackSource(gallery, 'handleContinue')}\nhandleContinue;`, {
    continuingRef,
    selectedTemplate,
    setIsContinuing: value => busyStates.push(value),
    useCallback: callback => callback,
    navigate: destination => {
      assert.equal(continuingRef.current, true, 'Lock navigation before calling the router');
      destinations.push(destination);
    },
  });
  return { handleContinue, continuingRef, busyStates, destinations };
}

test('gallery confirmation is outside the long template list and always rendered', async () => {
  const { gallery, styles } = await sourceFiles();
  const footer = confirmationSource(gallery);

  assert.ok(gallery.indexOf(footer) > gallery.indexOf('</main>'), 'Confirmation must not be part of the scrolling grid');
  assert.match(gallery, /<\/main>\s*<footer\b/, 'Do not hide Choose later behind a selection condition');
  assert.match(footer, />Choose later<\/button>/);
  assert.match(footer, />Use this template<\/button>/);
  assert.equal((gallery.match(/>Choose later<\/button>/g) || []).length, 1);
  assert.equal((gallery.match(/>Use this template<\/button>/g) || []).length, 1);
  const bar = cssDeclarations(styles, '.template-selection-bar');
  assert.equal(bar.position, 'fixed');
  assert.equal(bar.bottom, '0');
});

test('the selected template name and primary action use a valid catalog selection', async () => {
  const { gallery } = await sourceFiles();
  const footer = confirmationSource(gallery);

  assert.match(gallery, /useState\(state\.meta\.templateId \|\| ''\)/);
  assert.match(gallery, /TEMPLATES\.find\(template => template\.id === selected\)/);
  assert.match(footer, /selectedTemplate\??\.name/);
  assert.match(footer, /aria-live="polite"/);
  assert.match(footer, /disabled=\{[^}]*!selectedTemplate[^}]*\}/);
  assert.match(gallery, /selected=\{selected === template\.id\}/);
  assert.match(gallery, /selected \? 'selected' : ''/);
  assert.match(gallery, /selected && <div className="template-check"/);
});

test('selecting a card or preview updates resume metadata and theme without forced scrolling', async () => {
  const { gallery } = await sourceFiles();
  const select = callbackSource(gallery, 'handleSelect');
  const preview = callbackSource(gallery, 'applyPreviewTemplate');

  assert.match(select, /setSelected\(templateId\)/);
  assert.match(select, /type:\s*'SET_TEMPLATE_AND_DESIGN'/);
  assert.match(select, /templateId,/);
  assert.match(select, /getTemplateTheme\(template\)/);
  assert.match(select, /design:\s*\{/);
  for (const property of ['themePreset', 'colorScheme', 'headingColor', 'sidebarColor', 'dividerColor']) {
    assert.match(select, new RegExp(`\\b${property}:`));
  }
  assert.match(preview, /handleSelect\(previewTemplate\.id\)/);
  assert.match(preview, /setPreviewTemplate\(null\)/);
  assert.doesNotMatch(select + preview, /scrollIntoView|scrollTo|scrollTop|navigate\(/);
});

test('every catalog selection applies that exact template and theme, while invalid IDs are ignored', async () => {
  const { gallery } = await sourceFiles();
  const selectedIds = [];
  const actions = [];
  const continuingRef = { current: false };
  const select = runInNewContext(`${callbackSource(gallery, 'handleSelect')}\nhandleSelect;`, {
    TEMPLATES,
    getTemplateTheme,
    continuingRef,
    setSelected: templateId => selectedIds.push(templateId),
    dispatch: action => actions.push(structuredClone(action)),
    useCallback: callback => callback,
  });

  assert.ok(TEMPLATES.length >= 35);
  for (const template of TEMPLATES) {
    actions.length = 0;
    select(template.id);
    assert.equal(selectedIds.at(-1), template.id);
    const theme = getTemplateTheme(template);
    assert.deepEqual(actions[0], {
      type: 'SET_TEMPLATE_AND_DESIGN',
      payload: {
        templateId: template.id,
        design: {
          themePreset: theme.id,
          colorScheme: theme.colors.accent,
          headingColor: theme.colors.heading,
          sidebarColor: theme.colors.sidebar,
          dividerColor: theme.colors.divider,
        },
      },
    });
    assert.equal(actions.length, 1);
  }
  actions.length = 0;
  select('missing-template');
  continuingRef.current = true;
  select(TEMPLATES[0].id);
  assert.equal(actions.length, 0, 'Invalid or in-flight selections must not change resume data');
  assert.equal(selectedIds.length, TEMPLATES.length);
});

test('card keyboard selection supports Space and Enter without hijacking preview controls', async () => {
  const { gallery } = await sourceFiles();

  assert.match(gallery, /role="button"\s+tabIndex=\{0\}/);
  assert.match(gallery, /event\.target\s*!==\s*event\.currentTarget/);
  assert.match(gallery, /\['Enter', ' '\]\.includes\(event\.key\)/);
  assert.match(gallery, /event\.preventDefault\(\)/);
  assert.match(gallery, /event\.stopPropagation\(\);\s*onPreview\(template\)/);
});

test('keyboard focus reveals occluded controls without scrolling for pointer or stale focus', async () => {
  const { gallery } = await sourceFiles();
  const revealSource = callbackSource(gallery, 'revealFocusedControl');

  assert.match(gallery, /onFocusCapture=\{revealFocusedControl\}/);
  assert.match(gallery, /onKeyDownCapture=\{[^}]*event\.key === 'Tab'[^}]*keyboardNavigationRef\.current = true/);
  assert.match(gallery, /onPointerDownCapture=\{[^}]*keyboardNavigationRef\.current = false/);
  assert.match(gallery, /return \(\) => \{\s*observer\.disconnect\(\);\s*window\.cancelAnimationFrame\(frame\);\s*window\.cancelAnimationFrame\(focusFrameRef\.current\)/);

  function focusCase({ keyboard = true, eligible = true, bounds = { top: 160, bottom: 204 }, nameBounds = null, beforeFrame } = {}) {
    const scrolls = [];
    const frames = new Map();
    const keyboardNavigationRef = { current: keyboard };
    const focusFrameRef = { current: 0 };
    const target = {
      isConnected: true,
      matches: () => eligible,
      classList: { contains: () => Boolean(nameBounds) },
      querySelector: () => ({ getBoundingClientRect: () => nameBounds }),
      getBoundingClientRect: () => bounds,
    };
    const document = { activeElement: target };
    const reveal = runInNewContext(`${revealSource}\nrevealFocusedControl;`, {
      keyboardNavigationRef,
      focusFrameRef,
      document,
      pageRef: { current: { querySelector: () => ({ getBoundingClientRect: () => ({ bottom: 72 }) }) } },
      actionBarRef: { current: { getBoundingClientRect: () => ({ top: 600 }) } },
      window: {
        innerHeight: 800,
        cancelAnimationFrame: id => frames.delete(id),
        requestAnimationFrame: callback => { frames.set(1, callback); return 1; },
        scrollBy: options => scrolls.push(structuredClone(options)),
      },
    });
    reveal({ target });
    const scheduled = frames.size;
    beforeFrame?.({ keyboardNavigationRef, document, target });
    for (const frame of frames.values()) frame();
    return { scheduled, scrolls };
  }

  assert.deepEqual(focusCase({ keyboard: false }), { scheduled: 0, scrolls: [] });
  assert.deepEqual(focusCase({ eligible: false }), { scheduled: 0, scrolls: [] });
  assert.deepEqual(focusCase(), { scheduled: 1, scrolls: [] });
  // The visible band is measured header/footer bounds plus a 16px cushion:
  // 88..584px here, not assumed viewport or fixed header/footer heights.
  const occludedBounds = { top: 568, bottom: 612 };
  assert.deepEqual(focusCase({ bounds: occludedBounds }), {
    scheduled: 1, scrolls: [{ top: 28, behavior: 'instant' }],
  });
  assert.deepEqual(focusCase({ bounds: { top: 56, bottom: 100 } }), {
    scheduled: 1, scrolls: [{ top: -32, behavior: 'instant' }],
  });
  assert.deepEqual(focusCase({ bounds: { top: -100, bottom: 900 }, nameBounds: { top: 160, bottom: 184 } }), {
    scheduled: 1, scrolls: [],
  }, 'A tall card keeps its name visible instead of trying to fit the whole card');
  assert.deepEqual(focusCase({ bounds: { top: -100, bottom: 900 }, nameBounds: { top: 600, bottom: 624 } }), {
    scheduled: 1, scrolls: [{ top: 40, behavior: 'instant' }],
  });
  for (const beforeFrame of [
    ({ keyboardNavigationRef }) => { keyboardNavigationRef.current = false; },
    ({ target }) => { target.isConnected = false; },
    ({ document }) => { document.activeElement = {}; },
  ]) {
    assert.deepEqual(focusCase({ bounds: occludedBounds, beforeFrame }), { scheduled: 1, scrolls: [] });
  }
});

test('both confirmation actions share the synchronous duplicate-navigation guard', async () => {
  const { gallery } = await sourceFiles();
  const footer = confirmationSource(gallery);
  const harness = continuationHarness(gallery, { id: 'modern' });

  assert.match(footer, /onClick=\{\(\) => handleContinue\(true\)\}\s+disabled=\{isContinuing\}>Choose later/);
  assert.match(footer, /onClick=\{\(\) => handleContinue\(\)\}\s+disabled=\{!selectedTemplate \|\| isContinuing\}>Use this template/);
  assert.equal((gallery.match(/navigate\(/g) || []).length, 1, 'Neither button should bypass the shared navigation guard');
  harness.handleContinue();
  harness.handleContinue();
  harness.handleContinue(true);
  assert.deepEqual(harness.destinations, ['/upload-resume']);
  assert.deepEqual(harness.busyStates, [true]);
});

test('primary confirmation requires a valid template while Choose later preserves the existing flow', async () => {
  const { gallery } = await sourceFiles();
  const harness = continuationHarness(gallery, undefined);
  const continuation = callbackSource(gallery, 'handleContinue');

  harness.handleContinue();
  assert.equal(harness.continuingRef.current, false);
  assert.deepEqual(harness.destinations, []);
  assert.deepEqual(harness.busyStates, []);
  harness.handleContinue(true);
  harness.handleContinue(true);
  assert.deepEqual(harness.destinations, ['/upload-resume']);
  assert.deepEqual(harness.busyStates, [true]);
  assert.doesNotMatch(continuation, /dispatch\(|setSelected\(/, 'Choose later must not replace the current/default template');
});

test('content reserves the measured footer height as its layout changes', async () => {
  const { gallery, styles } = await sourceFiles();
  const content = cssDeclarations(styles, '.template-gallery-page .onboarding-container');

  assert.match(gallery, /className="onboarding-page template-gallery-page" ref=\{pageRef\}/);
  assert.match(confirmationSource(gallery), /ref=\{actionBarRef\}/);
  assert.match(gallery, /const height = [^;]*actionBar\.getBoundingClientRect\(\)\.height/);
  assert.match(gallery, /page\.style\.setProperty\('--template-action-bar-height', height\)/);
  assert.match(gallery, /measureActionBar\(\);\s*const observer = new ResizeObserver\(scheduleMeasure\)/);
  assert.match(gallery, /observer\.observe\(actionBar\)/);
  assert.match(gallery, /observer\.disconnect\(\)/);
  assert.match(content['padding-bottom'], /var\(--template-action-bar-height(?:,[^)]+)?\)/);
  assert.match(content['padding-bottom'], /\+\s*var\(--space-/);
  assert.match(gallery, /window\.cancelAnimationFrame\(focusFrameRef\.current\)/);
  assert.doesNotMatch(styles, /height:\s*calc\(100(?:d)?vh/, 'The gallery must remain a full document scroller');
});

test('gallery cards and the compact footer can shrink without horizontal overflow', async () => {
  const { styles } = await sourceFiles();
  const content = cssDeclarations(styles, '.template-gallery-page .template-gallery-content');
  const bar = cssDeclarations(styles, '.template-selection-bar');
  const surface = cssDeclarations(styles, '.template-selection-bar-inner');

  assert.equal(content['min-width'], '0');
  assert.equal(content.width, '100%');
  assert.equal(surface['max-width'], content['max-width'], 'The action surface follows the gallery width');
  assert.equal(surface['margin-inline'], 'auto');
  assert.equal(cssDeclarations(styles, '.template-gallery-page .template-card')['min-width'], '0');
  assert.equal(cssDeclarations(styles, '.template-gallery-page .template-grid')['grid-template-columns'], 'repeat(3,minmax(0,1fr))');
  assert.equal(cssDeclarations(styles, '.template-selection-status strong')['overflow-wrap'], 'anywhere');
  assert.equal(bar['pointer-events'], 'none', 'Transparent footer gutters should not intercept gallery clicks');
  assert.equal(surface['pointer-events'], 'auto');
});

test('footer safe-area padding and theme tokens preserve mobile and dark-mode usability', async () => {
  const { styles } = await sourceFiles();
  const bar = cssDeclarations(styles, '.template-selection-bar');
  const surface = cssDeclarations(styles, '.template-selection-bar-inner');
  const buttons = cssDeclarations(styles, '.template-selection-actions .btn');

  assert.match(bar['padding-inline'], /env\(safe-area-inset-left\)/);
  assert.match(bar['padding-inline'], /env\(safe-area-inset-right\)/);
  assert.match(surface.padding, /env\(safe-area-inset-bottom\)/);
  assert.match(surface.background, /var\(--color-surface/);
  assert.match(surface.border, /var\(--color-border\)/);
  assert.ok(surface['box-shadow']);
  assert.ok(cssDeclarations(styles, '[data-theme="dark"] .template-selection-bar-inner')['box-shadow']);
  assert.ok(Number.parseFloat(buttons['min-height']) >= 44, 'Confirmation actions need touch-sized hit areas');
  assert.equal(buttons['white-space'], 'nowrap');
  assert.match(styles, /@media\s*\(max-width:\s*400px\)\s*\{\s*\.template-selection-actions\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(cssDeclarations(styles, '.template-gallery-page .template-card:focus-visible').outline, /var\(--color-border-focus\)/);
});
