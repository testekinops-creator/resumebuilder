import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const editorPath = new URL('../src/pages/builder/FinalEditor.jsx', import.meta.url);
const stylesPath = new URL('../src/pages/builder/FinalEditor.css', import.meta.url);

async function sourceFiles() {
  const [editor, styles] = await Promise.all([
    readFile(editorPath, 'utf8'),
    readFile(stylesPath, 'utf8'),
  ]);
  return { editor, styles };
}

// Read individual declarations so harmless formatting/property-order changes
// do not fail the layout contracts. Scope conditional rules with cssBlock().
function cssDeclarations(styles, selector) {
  const declarations = {};
  let found = false;
  for (const match of styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const preceding = styles.slice(0, match.index);
    const depth = (preceding.match(/\{/g) || []).length - (preceding.match(/\}/g) || []).length;
    if (depth) continue;
    const selectors = match[1].split(',').map(value => value.trim().replace(/\s+/g, ' '));
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

function assertDeclarations(styles, selector, expected) {
  const declarations = cssDeclarations(styles, selector);
  for (const [property, value] of Object.entries(expected)) {
    assert.equal(declarations[property], value, `${selector} ${property}`);
  }
}

function cssBlock(styles, header) {
  const match = styles.match(header);
  assert.ok(match, `Missing CSS block: ${header}`);
  const start = styles.indexOf('{', match.index);
  let depth = 1;
  for (let end = start + 1; end < styles.length; end += 1) {
    if (styles[end] === '{') depth += 1;
    if (styles[end] === '}') depth -= 1;
    if (!depth) return styles.slice(start + 1, end);
  }
  assert.fail(`Unclosed CSS block: ${header}`);
}

function componentSource(editor, name) {
  const start = editor.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Missing shared component: ${name}`);
  const end = editor.indexOf('\nfunction ', start + 1);
  return editor.slice(start, end < 0 ? undefined : end);
}

test('Finalize panels use measured layout rows instead of a hardcoded header offset', async () => {
  const { editor, styles } = await sourceFiles();

  assert.match(editor, /className="fe-workspace" ref=\{workspaceRef\}/);
  assert.match(editor, /className="fe-tool-content" ref=\{toolContentRef\}/);
  assert.doesNotMatch(styles, /calc\(100vh\s*-\s*48px\)/);
  assertDeclarations(styles, '.final-editor', { height: '100dvh', overflow: 'hidden' });
  assertDeclarations(styles, '.fe-workspace', { 'min-height': '0', overflow: 'hidden' });
  assertDeclarations(styles, '.fe-tools', { 'min-height': '0', overflow: 'hidden' });
  assertDeclarations(styles, '.fe-tool-content', { 'min-height': '0', 'overflow-y': 'auto', 'overscroll-behavior': 'contain' });
});

test('mobile Finalize uses one bounded workspace scroller with sticky tabs', async () => {
  const { editor, styles } = await sourceFiles();
  const mobileRules = cssBlock(styles, /@media\s*\(\s*width\s*<=\s*900px\s*\)/);

  assertDeclarations(mobileRules, '.final-editor', { height: '100dvh', overflow: 'hidden' });
  assertDeclarations(mobileRules, '.fe-workspace', { 'overflow-y': 'auto', 'overscroll-behavior': 'contain' });
  assertDeclarations(mobileRules, '.fe-body', { display: 'contents' });
  assertDeclarations(mobileRules, '.fe-tools', { display: 'contents' });
  assertDeclarations(mobileRules, '.fe-tool-tabs', { position: 'sticky', top: '0' });
  assertDeclarations(mobileRules, '.fe-tool-content', { flex: '0 0 auto', overflow: 'visible' });
  assertDeclarations(mobileRules, '.fe-mobile-summary', { display: 'grid', 'grid-template-columns': 'minmax(0,1fr)' });
  assertDeclarations(mobileRules, '.fe-actions', { display: 'none' });
  assert.match(editor, /className="fe-mobile-primary-bar"/);
});

test('section dragging is panel-bounded and cannot outrank the tabs or header', async () => {
  const { editor, styles } = await sourceFiles();

  assert.match(editor, /modifiers=\{\[restrictDragToPanel\]\}/);
  assert.match(editor, /autoScroll=\{\{ canScroll: canAutoScroll \}\}/);
  assert.match(editor, /<DragOverlay zIndex=\{10\}/);
  assert.doesNotMatch(editor, /zIndex:\s*isDragging/);
  assertDeclarations(styles, '.fe-tool-tabs', { 'z-index': '20' });
  assertDeclarations(styles, '.fe-sortable-item', { 'z-index': 'auto' });
  assertDeclarations(styles, '.fe-sortable-item.is-dragging', { 'z-index': '10' });
});

test('section labels ellipsize without consuming the fixed action controls', async () => {
  const { styles } = await sourceFiles();

  assertDeclarations(styles, '.fe-sortable-label', { 'text-overflow': 'ellipsis', 'white-space': 'nowrap', 'min-width': '0', overflow: 'hidden' });
  assertDeclarations(styles, '.fe-section-move-controls', { flex: 'none' });
  assertDeclarations(styles, '.fe-section-move-btn', { 'min-width': '30px' });
  assertDeclarations(styles, '.fe-section-column-btn', { 'min-width': '30px' });
});

test('Finalize tabs stay single-line and scroll within their strip without clipping labels', async () => {
  const { styles } = await sourceFiles();

  assertDeclarations(styles, '.fe-tool-tabs', { 'overflow-x': 'auto', 'overflow-y': 'hidden', 'max-width': '100%', 'overscroll-behavior-inline': 'contain' });
  assertDeclarations(styles, '.fe-tool-tab', { flex: '1 0 auto', 'white-space': 'nowrap', 'min-height': '48px', 'font-size': 'var(--font-size-sm)' });
  const tabStyles = cssDeclarations(styles, '.fe-tool-tab');
  assert.notEqual(tabStyles.overflow, 'hidden');
  assert.notEqual(tabStyles['text-overflow'], 'ellipsis');
  assertDeclarations(styles, '.fe-tool-tab:focus-visible', { 'outline-offset': '-4px' });
});

test('accessible tabs reveal the selected item on activation and resize without scrolling ancestors', async () => {
  const { editor } = await sourceFiles();
  const tabs = componentSource(editor, 'FinalizeTabs');

  assert.match(tabs, /role="tablist"/);
  assert.match(tabs, /role="tab"/);
  assert.match(tabs, /aria-selected=\{activeTab === tab\.id\}/);
  assert.match(tabs, /tabIndex=\{activeTab === tab\.id \? 0 : -1\}/);
  assert.match(tabs, /aria-controls="fe-tool-panel"/);
  assert.match(editor, /id="fe-tool-panel" role="tabpanel" aria-labelledby=\{`fe-tab-\$\{activeTab\}`\}/);
  assert.match(tabs, /getNextTabId\(/);
  assert.match(tabs, /getTabScrollLeft\(/);
  assert.match(tabs, /new ResizeObserver\(revealSelectedTab\)/);
  assert.match(tabs, /observer\.observe\(strip\)/);
  assert.match(tabs, /observer\.disconnect\(\)/);
  assert.match(tabs, /\[activeTab, tabListRef\]/);
  assert.match(tabs, /strip\.scrollTo\(\{\s*left[,\s]/);
  assert.doesNotMatch(tabs, /scrollIntoView|strip\.scrollTo\(\{[^}]*\btop\s*:/);
  assert.match(tabs, /focus\(\{\s*preventScroll:\s*true\s*\}\)/);
});

test('narrow Finalize replaces the nonshrinking action rail with the shared native review drawer', async () => {
  const { editor, styles } = await sourceFiles();
  const narrowLayout = cssBlock(styles, /@container\s+finalize-layout\s*\(\s*width\s*<=\s*80rem\s*\)/);
  const drawer = componentSource(editor, 'FinalizeReviewDrawer');

  assertDeclarations(styles, '.final-editor', { container: 'finalize-layout / inline-size' });
  assertDeclarations(styles, '.fe-actions', { 'min-width': '20rem', width: 'clamp(20rem,20cqi,23rem)', flex: '0 0 clamp(20rem,20cqi,23rem)', overflow: 'hidden' });
  assertDeclarations(narrowLayout, '.fe-actions', { display: 'none' });
  assertDeclarations(narrowLayout, '.fe-review-actions-toggle', { display: 'inline-flex' });
  assert.match(editor, /<FinalizeActionPanel[^>]*idPrefix="desktop"/);
  assert.match(editor, /<FinalizeActionPanel[^>]*idPrefix="drawer"/);
  assert.match(drawer, /<dialog\b/);
  assert.match(drawer, /dialog\.showModal\(\)/);
  assert.match(drawer, /dialog\.close\(\)/);
  assert.match(drawer, /onCancel=\{onClose\}/);
  assert.match(drawer, /event\.key === 'Escape'/);
  assert.match(drawer, /aria-labelledby="fe-review-drawer-title"/);
  assert.match(drawer, /previousFocus\?\.focus\?\.\(\{ preventScroll: true \}\)/);
});

test('the shared action panel owns one padded scrollbar without shrinking its cards', async () => {
  const { editor, styles } = await sourceFiles();
  const panel = componentSource(editor, 'FinalizeActionPanel');

  assert.match(panel, /<ProfileCompletion\b/);
  assert.match(panel, /<ResumeReview\b/);
  assert.match(panel, /<FinalizeActionButtons\b/);
  assertDeclarations(styles, '.fe-action-panel', { container: 'action-panel / inline-size', 'min-height': '0', 'overflow-x': 'hidden', 'overflow-y': 'auto', 'overscroll-behavior': 'contain', 'scrollbar-gutter': 'stable', padding: 'var(--space-5) var(--space-4)' });
  assertDeclarations(styles, '.fe-action-panel>*', { flex: '0 0 auto', 'min-width': '0' });
  assertDeclarations(styles, '.fe-review-drawer', { overflow: 'hidden' });
  for (const selector of ['.fe-resume-review', '.fe-resume-review ul', '.fe-profile-completion']) {
    const declarations = cssDeclarations(styles, selector);
    assert.doesNotMatch(declarations.overflow || '', /auto|scroll/, `${selector} must not add a nested scrollbar`);
    assert.doesNotMatch(declarations['overflow-y'] || '', /auto|scroll/, `${selector} must not add a nested scrollbar`);
  }
});

test('completion switches from its ring to a bar using available card width', async () => {
  const { editor, styles } = await sourceFiles();
  const compact = cssBlock(styles, /@container\s+profile-completion\s*\(\s*width\s*<\s*17rem\s*\)/);
  const completion = componentSource(editor, 'ProfileCompletion');

  assertDeclarations(styles, '.fe-profile-completion', { container: 'profile-completion / inline-size', position: 'relative' });
  assertDeclarations(styles, '.fe-score-circle', { width: '80px', height: '80px' });
  assertDeclarations(compact, '.fe-score-circle', { display: 'none' });
  assertDeclarations(compact, '.fe-profile-progress', { display: 'block' });
  assertDeclarations(compact, '.fe-profile-percentage', { display: 'block' });
  assert.match(completion, /role="progressbar"/);
  assert.match(completion, /aria-label="Profile completion"/);
  assert.match(completion, /aria-valuenow=\{completeness\}/);
  assert.match(completion, /className="fe-score-circle" aria-hidden="true"/);
  assert.match(completion, /className="fe-profile-progress" aria-hidden="true"/);
});

test('Resume Check separates its score and count and stacks its header inside narrow cards', async () => {
  const { editor, styles } = await sourceFiles();
  const wideReview = cssBlock(styles, /@container\s+resume-review\s*\(\s*width\s*>=\s*24rem\s*\)/);
  const review = componentSource(editor, 'ResumeReview');

  assertDeclarations(styles, '.fe-resume-review', { container: 'resume-review / inline-size', 'min-width': '0', width: '100%' });
  assertDeclarations(styles, '.fe-resume-review-heading', { 'flex-direction': 'column' });
  assertDeclarations(wideReview, '.fe-resume-review-heading', { 'flex-direction': 'row' });
  assertDeclarations(styles, '.fe-review-status', { 'flex-wrap': 'wrap', 'max-width': '100%', 'font-size': 'var(--font-size-sm)' });
  assertDeclarations(styles, '.fe-review-score', { 'white-space': 'nowrap', color: 'var(--color-text-primary)' });
  assertDeclarations(styles, '.fe-review-count', { 'min-width': '0', 'overflow-wrap': 'anywhere' });
  assertDeclarations(styles, '.fe-resume-review li span', { 'font-size': 'var(--font-size-sm)', 'line-height': '1.5', 'overflow-wrap': 'anywhere', color: 'var(--color-text-secondary)' });
  assert.match(review, /className="fe-review-score"/);
  assert.match(review, /className="fe-review-count"/);
  assert.match(review, /Resume Check score \$\{score\} out of 100/);
});

test('both review entry points are readable full-width buttons with touch and focus targets', async () => {
  const { editor, styles } = await sourceFiles();
  const review = componentSource(editor, 'ResumeReview');

  assert.match(review, /<button[^>]*className="fe-resume-review-more"[^>]*onClick=\{onOpen\}/);
  assert.match(review, /<button[^>]*className="[^"]*fe-open-check"[^>]*onClick=\{onOpen\}/);
  for (const selector of ['.fe-resume-review-more', '.fe-open-check']) {
    assertDeclarations(styles, selector, { width: '100%', 'min-height': '44px', 'font-size': 'var(--font-size-sm)' });
    assert.match(cssDeclarations(styles, `${selector}:focus-visible`).outline, /var\(--color-border-focus\)/);
  }
  assert.match(editor, /const openResumeCheck = \(\) => \{\s*setShowReviewActions\(false\);\s*activateTab\('check'\);/);
  assert.match(editor, /onOpenCheck: openResumeCheck/);
  assert.match(editor, /requestAnimationFrame\(scrollToolsToTop\)/);
});

test('shared actions stack Print and Email by container width and keep every action touch-friendly', async () => {
  const { styles } = await sourceFiles();
  const narrowActions = cssBlock(styles, /@container\s+finalize-actions\s*\(\s*width\s*<\s*18\.5rem\s*\)/);

  assertDeclarations(styles, '.fe-action-buttons', { width: '100%', 'min-width': '0', container: 'finalize-actions / inline-size' });
  assertDeclarations(styles, '.fe-utility-actions', { 'grid-template-columns': 'repeat(2,minmax(0,1fr))' });
  assertDeclarations(narrowActions, '.fe-utility-actions', { 'grid-template-columns': 'minmax(0,1fr)' });
  assertDeclarations(styles, '.fe-action-button', { width: '100%', 'min-height': '44px' });
  assertDeclarations(styles, '.fe-finish-button', { 'min-height': '44px' });
});
