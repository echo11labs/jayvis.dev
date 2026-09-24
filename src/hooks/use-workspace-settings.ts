'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type EditorFontSize = 12 | 13 | 14;
export type EditorFontWeight = 400 | 500 | 600;

export interface WorkspaceSettings {
  autoSave: boolean;
  minimap: boolean;
  grid: boolean;
  snap: boolean;
  wordWrap: boolean;
  lineNumbers: boolean;
  fontSize: EditorFontSize;
  fontWeight: EditorFontWeight;
  fontLigatures: boolean;
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  autoSave: true,
  minimap: false,
  grid: true,
  snap: true,
  wordWrap: true,
  lineNumbers: true,
  fontSize: 13,
  fontWeight: 400,
  fontLigatures: true,
};

const STORAGE_KEY = 'jayvis-settings';
const LEGACY_STORAGE_KEY = 'stitchdb-settings';
const CHANGE_EVENT = 'jayvis:settings-change';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

export function normalizeWorkspaceSettings(value: unknown): WorkspaceSettings {
  const candidate = isRecord(value) ? value : {};
  return {
    autoSave:
      typeof candidate.autoSave === 'boolean'
        ? candidate.autoSave
        : DEFAULT_WORKSPACE_SETTINGS.autoSave,
    minimap:
      typeof candidate.minimap === 'boolean'
        ? candidate.minimap
        : DEFAULT_WORKSPACE_SETTINGS.minimap,
    grid:
      typeof candidate.grid === 'boolean'
        ? candidate.grid
        : DEFAULT_WORKSPACE_SETTINGS.grid,
    snap:
      typeof candidate.snap === 'boolean'
        ? candidate.snap
        : DEFAULT_WORKSPACE_SETTINGS.snap,
    wordWrap:
      typeof candidate.wordWrap === 'boolean'
        ? candidate.wordWrap
        : DEFAULT_WORKSPACE_SETTINGS.wordWrap,
    lineNumbers:
      typeof candidate.lineNumbers === 'boolean'
        ? candidate.lineNumbers
        : DEFAULT_WORKSPACE_SETTINGS.lineNumbers,
    fontSize: [12, 13, 14].includes(candidate.fontSize as number)
      ? (candidate.fontSize as EditorFontSize)
      : DEFAULT_WORKSPACE_SETTINGS.fontSize,
    fontWeight: [400, 500, 600].includes(candidate.fontWeight as number)
      ? (candidate.fontWeight as EditorFontWeight)
      : DEFAULT_WORKSPACE_SETTINGS.fontWeight,
    fontLigatures:
      typeof candidate.fontLigatures === 'boolean'
        ? candidate.fontLigatures
        : DEFAULT_WORKSPACE_SETTINGS.fontLigatures,
  };
}

let cachedSettings: WorkspaceSettings = DEFAULT_WORKSPACE_SETTINGS;

function sameSettings(a: WorkspaceSettings, b: WorkspaceSettings): boolean {
  return (
    a.autoSave === b.autoSave &&
    a.minimap === b.minimap &&
    a.grid === b.grid &&
    a.snap === b.snap &&
    a.wordWrap === b.wordWrap &&
    a.lineNumbers === b.lineNumbers &&
    a.fontSize === b.fontSize &&
    a.fontWeight === b.fontWeight &&
    a.fontLigatures === b.fontLigatures
  );
}

function readSettings(): WorkspaceSettings {
  if (typeof window === 'undefined') return cachedSettings;
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    const next = normalizeWorkspaceSettings(raw ? JSON.parse(raw) : null);
    if (sameSettings(cachedSettings, next)) return cachedSettings;
    cachedSettings = next;
    return cachedSettings;
  } catch {
    return cachedSettings;
  }
}

function subscribe(update: () => void) {
  window.addEventListener(CHANGE_EVENT, update);
  window.addEventListener('storage', update);
  return () => {
    window.removeEventListener(CHANGE_EVENT, update);
    window.removeEventListener('storage', update);
  };
}

export function updateWorkspaceSettings(
  patch: Partial<WorkspaceSettings>,
): WorkspaceSettings {
  const next = normalizeWorkspaceSettings({ ...readSettings(), ...patch });
  cachedSettings = next;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  return next;
}

export function useWorkspaceSettings(): [
  WorkspaceSettings,
  (patch: Partial<WorkspaceSettings>) => void,
] {
  const settings = useSyncExternalStore(
    subscribe,
    readSettings,
    () => cachedSettings,
  );
  const update = useCallback((patch: Partial<WorkspaceSettings>) => {
    updateWorkspaceSettings(patch);
  }, []);
  return [settings, update];
}
