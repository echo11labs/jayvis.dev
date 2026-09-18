'use client';

import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

/**
 * Subscribe to the current theme. The ThemeToggle component writes the
 * theme to localStorage and toggles the `light`/`dark` class on <html>.
 * This hook observes the class attribute so all components re-render
 * when the theme changes.
 */
export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const getTheme = (): Theme =>
      document.documentElement.classList.contains('light') ? 'light' : 'dark';

    setTheme(getTheme());

    // Observe the html class for changes (ThemeToggle adds/removes 'light').
    const observer = new MutationObserver(() => {
      setTheme(getTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}
