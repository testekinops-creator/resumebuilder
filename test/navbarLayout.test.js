import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [navbar, styles] = await Promise.all([
  readFile(new URL('../src/components/Navbar.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/Navbar.css', import.meta.url), 'utf8'),
]);

function cssBlock(source, header) {
  const match = source.match(header);
  assert.ok(match, `Missing CSS block: ${header}`);
  const start = source.indexOf('{', match.index);
  let depth = 1;
  for (let end = start + 1; end < source.length; end += 1) {
    if (source[end] === '{') depth += 1;
    if (source[end] === '}') depth -= 1;
    if (!depth) return source.slice(start + 1, end);
  }
  assert.fail(`Unclosed CSS block: ${header}`);
}

function assertDeclarations(source, selector, expected) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = cssBlock(source, new RegExp(`(^|\\n)\\s*${escaped}\\s*\\{`));
  const declarations = Object.fromEntries(block.split(';').filter(value => value.includes(':')).map(value => {
    const separator = value.indexOf(':');
    return [value.slice(0, separator).trim(), value.slice(separator + 1).trim().replace(/\s+/g, ' ')];
  }));
  for (const [property, value] of Object.entries(expected)) {
    assert.equal(declarations[property], value, `${selector} ${property}`);
  }
}

test('shared navigation retains fully labeled routes and a separately placed theme control', () => {
  assert.match(navbar, /aria-label="Main navigation"/);
  assert.match(navbar, /to="\/" className="navbar-brand" aria-label="Resume Builder home"/);
  assert.match(navbar, /to="\/dashboard"/);
  assert.match(navbar, /<span>My Resumes<\/span>/);
  assert.match(navbar, /to="\/get-started"/);
  assert.match(navbar, /<span>Build My Resume<\/span>/);
  assert.match(navbar, /<button\s+type="button"\s+className="btn-icon theme-toggle"/);
  assert.match(navbar, /aria-label="Toggle dark mode"/);
  assert.match(navbar, /aria-pressed=\{isDark\}/);
  assert.ok(navbar.indexOf('className="btn-icon theme-toggle"') < navbar.indexOf('className="navbar-actions"'));
  assert.doesNotMatch(styles, /display:\s*none|text-overflow:\s*ellipsis/);
});

test('navigation sizes its shared grid without clipping overflow', () => {
  assertDeclarations(styles, '.navbar', {
    container: 'app-navigation / inline-size',
    'min-width': '0',
    width: '100%',
    position: 'sticky',
  });
  assertDeclarations(styles, '.navbar-container', {
    display: 'grid',
    'grid-template-columns': 'minmax(0, 1fr) 44px auto',
    'min-width': '0',
    width: '100%',
  });
  assertDeclarations(styles, '.navbar-title', { 'overflow-wrap': 'anywhere' });
  assert.doesNotMatch(styles, /overflow(?:-x)?:\s*(?:hidden|clip)/);
});

test('narrow navigation moves both labeled links into a full-width responsive row', () => {
  const narrow = cssBlock(styles, /@container\s+app-navigation\s*\(width\s*<=\s*40rem\)/);
  const fallback = cssBlock(styles, /@supports\s+not\s*\(container-type:\s*inline-size\)/);
  const fallbackNarrow = cssBlock(fallback, /@media\s*\(width\s*<=\s*40rem\)/);

  for (const source of [narrow, fallbackNarrow]) {
    assertDeclarations(source, '.navbar-container', {
      'grid-template-columns': 'minmax(0, 1fr) 44px',
      'padding-inline': 'max(var(--space-3), env(safe-area-inset-left)) max(var(--space-3), env(safe-area-inset-right))',
    });
    assertDeclarations(source, '.navbar-actions', {
      display: 'grid',
      'grid-column': '1 / -1',
      'grid-template-columns': 'repeat(2, minmax(0, 1fr))',
    });
    assertDeclarations(source, '.navbar-actions .btn', {
      'white-space': 'normal',
      'overflow-wrap': 'anywhere',
    });
  }
});

test('header controls keep 44px touch targets and theme-aware foregrounds', () => {
  assertDeclarations(styles, '.navbar-actions .btn', {
    'min-width': '44px',
    'min-height': '44px',
    'line-height': '1.25',
  });
  assertDeclarations(styles, '.navbar .theme-toggle', {
    width: '44px',
    height: '44px',
    'min-width': '44px',
    'min-height': '44px',
    color: 'var(--color-navbar-text)',
  });
  assertDeclarations(styles, '.navbar .theme-toggle:hover', { color: 'var(--color-navbar-text)' });
  assertDeclarations(styles, '.navbar-brand', { 'min-height': '44px' });
});
