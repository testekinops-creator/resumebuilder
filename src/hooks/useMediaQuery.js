import { useEffect, useState } from 'react';

function matchesQuery(query) {
  return typeof window !== 'undefined' && window.matchMedia(query).matches;
}

/** Keeps expensive desktop-only surfaces unmounted on small touch layouts. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => matchesQuery(query));

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const update = () => setMatches(mediaQuery.matches);
    update();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', update);
      return () => mediaQuery.removeEventListener('change', update);
    }
    // Older Mobile Safari exposes the legacy MediaQueryList listener API.
    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, [query]);

  return matches;
}
