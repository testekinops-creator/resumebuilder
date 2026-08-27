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

test('Finalize panels use measured layout rows instead of a hardcoded header offset', async () => {
  const { editor, styles } = await sourceFiles();

  assert.match(editor, /className="fe-workspace" ref=\{workspaceRef\}/);
  assert.match(editor, /className="fe-tool-content" ref=\{toolContentRef\}/);
  assert.doesNotMatch(styles, /calc\(100vh\s*-\s*48px\)/);
  assert.match(styles, /\.final-editor\s*\{[^}]*height:\s*100dvh;[^}]*overflow:\s*hidden;/s);
  assert.match(styles, /\.fe-workspace\s*\{[^}]*min-height:\s*0;[^}]*overflow:\s*hidden;/s);
  assert.match(styles, /\.fe-tools\s*\{[^}]*min-height:\s*0;[^}]*overflow:\s*hidden;/s);
  assert.match(styles, /\.fe-tool-content\s*\{[^}]*min-height:\s*0;[^}]*overflow-y:\s*auto;[^}]*overscroll-behavior:\s*contain;/s);
});

test('mobile Finalize uses one bounded workspace scroller with sticky tabs', async () => {
  const { styles } = await sourceFiles();
  const mobileRules = styles.slice(styles.indexOf('@media (width<=900px)'));

  assert.match(mobileRules, /\.final-editor\s*\{[^}]*height:\s*100dvh;[^}]*overflow:\s*hidden;/s);
  assert.match(mobileRules, /\.fe-workspace\s*\{[^}]*overflow-y:\s*auto;[^}]*overscroll-behavior:\s*contain;/s);
  assert.match(mobileRules, /\.fe-body\s*\{[^}]*display:\s*contents;/s);
  assert.match(mobileRules, /\.fe-tools\s*\{[^}]*display:\s*contents;/s);
  assert.match(mobileRules, /\.fe-tool-tabs\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;/s);
  assert.match(mobileRules, /\.fe-tool-content\s*\{[^}]*flex:\s*0 0 auto;/s);
});

test('section dragging is panel-bounded and cannot outrank the tabs or header', async () => {
  const { editor, styles } = await sourceFiles();

  assert.match(editor, /modifiers=\{\[restrictDragToPanel\]\}/);
  assert.match(editor, /autoScroll=\{\{ canScroll: canAutoScroll \}\}/);
  assert.match(editor, /<DragOverlay zIndex=\{10\}/);
  assert.doesNotMatch(editor, /zIndex:\s*isDragging/);
  assert.match(styles, /\.fe-tool-tabs\s*\{[^}]*z-index:\s*20;/s);
  assert.match(styles, /\.fe-sortable-item\s*\{[^}]*z-index:\s*auto;/s);
  assert.match(styles, /\.fe-sortable-item\.is-dragging\s*\{[^}]*z-index:\s*10;/s);
});

test('section labels ellipsize without consuming the fixed action controls', async () => {
  const { styles } = await sourceFiles();

  assert.match(styles, /\.fe-sortable-label\s*\{[^}]*text-overflow:\s*ellipsis;[^}]*white-space:\s*nowrap;[^}]*min-width:\s*0;[^}]*overflow:\s*hidden;/s);
  assert.match(styles, /\.fe-section-move-controls\s*\{[^}]*flex:\s*none;/s);
  assert.match(styles, /\.fe-section-move-btn\s*\{[^}]*min-width:\s*30px;/s);
  assert.match(styles, /\.fe-section-column-btn\s*\{[^}]*min-width:\s*30px;/s);
  assert.match(styles, /\.fe-tool-tab\s*\{[^}]*min-width:\s*0;[^}]*overflow:\s*hidden;/s);
});
