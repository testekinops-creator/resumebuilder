/**
 * Reveal a tab using only its strip's horizontal scroll position. Tab bounds
 * are measured in the strip's content coordinates, not viewport coordinates.
 */
export function getTabScrollLeft({ scrollLeft, viewportWidth, scrollWidth, tabStart, tabEnd, padding = 4 }) {
  const width = Math.max(0, viewportWidth);
  const maximum = Math.max(0, scrollWidth - width);
  const clamp = value => Math.min(maximum, Math.max(0, value));
  const current = clamp(scrollLeft);

  if (!width || !maximum) return current;

  const tabWidth = Math.max(0, tabEnd - tabStart);
  // An oversized tab cannot fit in full; keep its label's beginning visible.
  if (tabWidth >= width) return clamp(tabStart);

  // Preserve focus-ring space when possible without hiding a nearly full tab.
  const inset = Math.min(Math.max(0, padding), (width - tabWidth) / 2);
  if (tabStart < current + inset) return clamp(tabStart - inset);
  if (tabEnd > current + width - inset) return clamp(tabEnd - width + inset);
  return current;
}

export function getNextTabId(tabIds, activeId, key) {
  if (!tabIds.length) return null;

  const index = tabIds.indexOf(activeId);
  switch (key) {
    case 'ArrowRight':
      return tabIds[(index + 1) % tabIds.length];
    case 'ArrowLeft':
      return tabIds[(Math.max(0, index) - 1 + tabIds.length) % tabIds.length];
    case 'Home':
      return tabIds[0];
    case 'End':
      return tabIds[tabIds.length - 1];
    default:
      return null;
  }
}
