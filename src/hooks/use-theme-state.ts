'use client';

import { useEffect, useSyncExternalStore } from 'react';

export type ThemeName =
  | 'dark-plus'
  | 'light-plus'
  | 'dracula'
  | 'one-dark'
  | 'github-dark'
  | 'nord'
  | 'solarized-dark'
  | 'monokai-pro'
  | 'xcode-dark'
  | 'system';

export type ThemeMode = 'dark' | 'light';

export const THEME_OPTIONS: Array<{ value: ThemeName; label: string; swatch: string }> = [
  { value: 'dark-plus', label: 'Dark+', swatch: '#1e1e1e' },
  { value: 'light-plus', label: 'Light+', swatch: '#f5f5f5' },
  { value: 'dracula', label: 'Dracula', swatch: '#282a36' },
  { value: 'one-dark', label: 'One Dark Pro', swatch: '#282c34' },
  { value: 'github-dark', label: 'GitHub Dark', swatch: '#0d1117' },
  { value: 'nord', label: 'Nord', swatch: '#2e3440' },
  { value: 'solarized-dark', label: 'Solarized Dark', swatch: '#002b36' },
  { value: 'monokai-pro', label: 'Monokai Pro', swatch: '#2d2a2e' },
  { value: 'xcode-dark', label: 'Xcode Dark', swatch: '#1e2430' },
  { value: 'system', label: 'System', swatch: 'linear-gradient(135deg, #1e1e1e 50%, #f5f5f5 50%)' },
];

function systemMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyThemeAttributes(theme: ThemeName) {
  const mode = theme === 'system' ? systemMode() : theme === 'light-plus' ? 'light' : 'dark';
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.resolvedTheme = mode === 'light' ? 'light-plus' : 'dark-plus';
  root.classList.toggle('light', mode === 'light');
  root.classList.toggle('dark', mode === 'dark');
}

export function applyTheme(theme: ThemeName) {
  applyThemeAttributes(theme);
  window.localStorage.setItem('jayvis-theme', theme);
  window.dispatchEvent(new CustomEvent('jayvis:theme-change'));
}

function storedTheme(): ThemeName {
  if (typeof window === 'undefined') return 'dark-plus';
  const saved =
    window.localStorage.getItem('jayvis-theme') ??
    window.localStorage.getItem('stitchdb-theme');
  return THEME_OPTIONS.some((option) => option.value === saved) ? (saved as ThemeName) : 'dark-plus';
}

function subscribeToTheme(update: () => void) {
  window.addEventListener('jayvis:theme-change', update);
  window.addEventListener('storage', update);
  return () => {
    window.removeEventListener('jayvis:theme-change', update);
    window.removeEventListener('storage', update);
  };
}

export function useThemeName(): ThemeName {
  const theme = useSyncExternalStore<ThemeName>(
    subscribeToTheme,
    storedTheme,
    () => 'dark-plus',
  );

  useEffect(() => {
    applyThemeAttributes(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const update = () => {
      const root = document.documentElement;
      const mode = media.matches ? 'light' : 'dark';
      root.classList.toggle('light', mode === 'light');
      root.classList.toggle('dark', mode === 'dark');
      root.dataset.resolvedTheme = mode === 'light' ? 'light-plus' : 'dark-plus';
    };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [theme]);

  return theme;
}

export function useTheme(): ThemeMode {
  const theme = useThemeName();
  return theme === 'system' ? systemMode() : theme === 'light-plus' ? 'light' : 'dark';
}

export function useResolvedThemeName(): Exclude<ThemeName, 'system'> {
  const theme = useThemeName();
  return theme === 'system' ? (systemMode() === 'light' ? 'light-plus' : 'dark-plus') : theme;
}
