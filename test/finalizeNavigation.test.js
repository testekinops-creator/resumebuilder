import assert from 'node:assert/strict';
import test from 'node:test';
import { getNextTabId, getTabScrollLeft } from '../src/utils/finalizeNavigation.js';

const strip = { scrollLeft: 100, viewportWidth: 240, scrollWidth: 600, tabStart: 160, tabEnd: 280 };

test('tab scrolling keeps a fully visible selection stationary', () => {
  assert.equal(getTabScrollLeft(strip), 100);
  assert.equal(getTabScrollLeft({ ...strip, tabStart: 104, tabEnd: 336 }), 100);
});

test('tab scrolling reveals clipped selections with focus-ring padding', () => {
  assert.equal(getTabScrollLeft({ ...strip, tabStart: 80, tabEnd: 200 }), 76);
  assert.equal(getTabScrollLeft({ ...strip, tabStart: 260, tabEnd: 380 }), 144);
  assert.equal(getTabScrollLeft({ ...strip, tabStart: 260, tabEnd: 380, padding: 12 }), 152);
  assert.equal(getTabScrollLeft({ ...strip, tabStart: 260, tabEnd: 380, padding: 0 }), 140);
});

test('tab scrolling recomputes visibility after the strip resizes', () => {
  assert.equal(getTabScrollLeft({ ...strip, viewportWidth: 160 }), 124);
  assert.equal(getTabScrollLeft({ ...strip, scrollLeft: 450, viewportWidth: 400, tabStart: 460, tabEnd: 590 }), 200);
});

test('tab scrolling returns zero when the strip does not overflow', () => {
  assert.equal(getTabScrollLeft({ ...strip, scrollWidth: 220 }), 0);
  assert.equal(getTabScrollLeft({ ...strip, scrollWidth: 240 }), 0);
});

test('tab scrolling clamps both edges and handles a temporarily hidden strip', () => {
  assert.equal(getTabScrollLeft({ ...strip, tabStart: 0, tabEnd: 120 }), 0);
  assert.equal(getTabScrollLeft({ ...strip, tabStart: 480, tabEnd: 600 }), 360);
  assert.equal(getTabScrollLeft({ ...strip, scrollLeft: -20, tabStart: 4, tabEnd: 120 }), 0);
  assert.equal(getTabScrollLeft({ ...strip, scrollLeft: 700, tabStart: 400, tabEnd: 590 }), 360);
  assert.equal(getTabScrollLeft({ ...strip, viewportWidth: 0 }), 100);
});

test('oversized tabs start-align instead of oscillating between clipped edges', () => {
  const oversized = { ...strip, tabStart: 150, tabEnd: 450 };
  const target = getTabScrollLeft(oversized);
  assert.equal(target, 150);
  assert.equal(getTabScrollLeft({ ...oversized, scrollLeft: target }), target);
  assert.equal(getTabScrollLeft({ ...strip, tabStart: 150, tabEnd: 390 }), 150);
});

test('nearly full-width tabs sacrifice extra padding rather than clipping labels', () => {
  const target = getTabScrollLeft({ ...strip, tabStart: 150, tabEnd: 388 });
  assert.equal(target, 149);
  assert.ok(target <= 150);
  assert.ok(target + strip.viewportWidth >= 388);
  assert.equal(getTabScrollLeft({ ...strip, tabStart: 80, tabEnd: 200, padding: -10 }), 80);
});

const tabs = ['templates', 'design', 'sections', 'check'];

test('tab arrow navigation moves and wraps in both directions', () => {
  assert.equal(getNextTabId(tabs, 'design', 'ArrowRight'), 'sections');
  assert.equal(getNextTabId(tabs, 'sections', 'ArrowLeft'), 'design');
  assert.equal(getNextTabId(tabs, 'check', 'ArrowRight'), 'templates');
  assert.equal(getNextTabId(tabs, 'templates', 'ArrowLeft'), 'check');
});

test('Home and End select the edge tabs', () => {
  assert.equal(getNextTabId(tabs, 'sections', 'Home'), 'templates');
  assert.equal(getNextTabId(tabs, 'design', 'End'), 'check');
});

test('tab navigation handles missing selection and single-tab lists', () => {
  assert.equal(getNextTabId(tabs, 'missing', 'ArrowRight'), 'templates');
  assert.equal(getNextTabId(tabs, 'missing', 'ArrowLeft'), 'check');
  for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
    assert.equal(getNextTabId(['check'], 'check', key), 'check');
  }
});

test('unhandled keys and empty tab lists leave navigation to the browser', () => {
  for (const key of ['Tab', 'Enter', ' ', 'ArrowDown', 'Escape']) {
    assert.equal(getNextTabId(tabs, 'design', key), null);
  }
  for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End', 'Tab']) {
    assert.equal(getNextTabId([], 'design', key), null);
  }
});
