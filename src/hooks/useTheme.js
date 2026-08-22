import { useState, useLayoutEffect, useCallback } from 'react';

export function getInitialTheme() {
  try {
    const saved = localStorage.getItem('resumeBuilder_theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // Private browsing or a blocked storage policy should not stop the app.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  // Apply the saved theme before paint so navigation and direct page loads do
  // not briefly render the landing page in the opposite theme.
  useLayoutEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem('resumeBuilder_theme', theme);
    } catch {
      // The selected theme remains active for the current session.
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  return { theme, toggle, isDark: theme === 'dark' };
}
