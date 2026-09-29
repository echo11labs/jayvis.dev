/**
 * IndexedDB persistence for the JayVis.dev schema.
 *
 * Stores the full DatabaseAST (including cached node positions) so the
 * user's work survives page reloads — local-first by default (spec §1.4).
 */

import { sanitizeDbmlText, serializeDBML } from '@/lib/parser/dbml';
import type { WorkspaceCatalog } from '@/lib/workspaces';
import type { DatabaseAST } from '@/types/ast';

const DB_NAME = 'jayvis';
const LEGACY_DB_NAME = 'stitchdb';
const STORE = 'schema';
const KEY = 'current';
const STUDIO_KEY = 'studio';
const DB_VERSION = 1;

export type BaselineMap = Record<string, { ast: DatabaseAST; capturedAt: number }>;

export type MigrationRecord = {
  version: number;
  slot: string;
  engine: 'sqlite' | 'postgres';
  up: string;
  down: string;
  checksum: string;
  appliedAt: number;
  ok: boolean;
  error?: string;
};

export type StudioFile = {
  fileVersion: 1;
  snapshot: WorkspaceSnapshot;
  catalog: WorkspaceCatalog;
  baselines: BaselineMap;
  migrations: MigrationRecord[];
};

export interface WorkspaceSnapshot {
  workspaceVersion: 2;
  ast: DatabaseAST;
  rawText: string;
  savedAt: number;
}

function isDatabaseAST(value: unknown): value is DatabaseAST {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DatabaseAST>;
  return (
    typeof candidate.version === 'string' &&
    !!candidate.tables &&
    typeof candidate.tables === 'object' &&
    !!candidate.references &&
    typeof candidate.references === 'object'
  );
}

export function normalizeWorkspaceRecord(
  value: unknown,
): WorkspaceSnapshot | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<WorkspaceSnapshot>;
  if (
    candidate.workspaceVersion === 2 &&
    isDatabaseAST(candidate.ast) &&
    typeof candidate.rawText === 'string'
  ) {
    return {
      workspaceVersion: 2,
      ast: candidate.ast,
      rawText: sanitizeDbmlText(candidate.rawText),
      savedAt:
        typeof candidate.savedAt === 'number'
          ? candidate.savedAt
          : Date.now(),
    };
  }

  if (isDatabaseAST(value)) {
    return {
      workspaceVersion: 2,
      ast: value,
      rawText: serializeDBML(value),
      savedAt: Date.now(),
    };
  }

  return null;
}

function isCatalog(value: unknown): value is WorkspaceCatalog {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<WorkspaceCatalog>;
  return typeof candidate.activeId === 'string' && Array.isArray(candidate.workspaces) && candidate.workspaces.length > 0;
}

export function normalizeStudioFile(value: unknown): StudioFile | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<StudioFile>;
  const snapshot = normalizeWorkspaceRecord(candidate.snapshot);
  if (candidate.fileVersion !== 1 || !snapshot || !isCatalog(candidate.catalog)) return null;
  const baselines = candidate.baselines && typeof candidate.baselines === 'object' ? candidate.baselines : {};
  const migrations = Array.isArray(candidate.migrations) ? candidate.migrations : [];
  return {
    fileVersion: 1,
    snapshot,
    catalog: candidate.catalog,
    baselines,
    migrations,
  };
}

let studio: StudioFile | null = null;
let studioWriteQueued = false;

export function liveCatalog(): WorkspaceCatalog | null {
  return studio?.catalog ?? null;
}

export function storeCatalog(catalog: WorkspaceCatalog): boolean {
  if (!studio) return false;
  studio = { ...studio, catalog };
  scheduleStudioWrite();
  return true;
}

export function liveBaselines(): BaselineMap | null {
  return studio?.baselines ?? null;
}

export function checksumText(text: string): string {
  let hash = 0;
  for (const char of text) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return hash.toString(16);
}

export function readMigrations(slot: string): MigrationRecord[] {
  return (studio?.migrations ?? []).filter((record) => record.slot === slot);
}

export function appendMigration(record: Omit<MigrationRecord, 'version'>): MigrationRecord | null {
  if (!studio) return null;
  const version = studio.migrations.reduce((max, item) => Math.max(max, item.version), 0) + 1;
  const stored = { ...record, version };
  studio = { ...studio, migrations: [...studio.migrations, stored] };
  scheduleStudioWrite();
  return stored;
}

export function storeBaseline(slot: string, ast: DatabaseAST, capturedAt: number): boolean {
  if (!studio) return false;
  studio = {
    ...studio,
    baselines: {
      ...studio.baselines,
      [slot]: { ast, capturedAt },
    },
  };
  scheduleStudioWrite();
  return true;
}

function scheduleStudioWrite() {
  if (!studio || studioWriteQueued) return;
  studioWriteQueued = true;
  queueMicrotask(() => {
    studioWriteQueued = false;
    const file = studio;
    if (!file) return;
    void putRecord(STUDIO_KEY, file).then(() => {
      if (studio !== file) scheduleStudioWrite();
    });
  });
}

function openNamedDB(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(name, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function openDB(): Promise<IDBDatabase> {
  return openNamedDB(DB_NAME);
}

async function readRecord(name: string, key = KEY): Promise<unknown> {
  const db = await openNamedDB(name);
  try {
    if (!db.objectStoreNames.contains(STORE)) return null;
    return await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

async function putRecord(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function saveWorkspace(
  snapshot: WorkspaceSnapshot,
): Promise<void> {
  try {
    if (studio) {
      studio = {
        ...studio,
        snapshot,
        catalog: {
          ...studio.catalog,
          workspaces: studio.catalog.workspaces.map((workspace) => {
            if (workspace.id !== studio?.catalog.activeId) return workspace;
            return {
              ...workspace,
              branches: workspace.branches.map((branch) =>
                branch.name === workspace.branch
                  ? { ...branch, rawText: snapshot.rawText, savedAt: snapshot.savedAt }
                  : branch,
              ),
            };
          }),
        },
      };
      scheduleStudioWrite();
      return;
    }
    await putRecord(KEY, snapshot);
  } catch (err) {
    // Persistence is best-effort; never block the UI on storage failures.
    console.warn('[persistence] save failed:', err);
  }
}

export async function readStudio(): Promise<StudioFile | null> {
  try {
    const file = normalizeStudioFile(await readRecord(DB_NAME, STUDIO_KEY));
    studio = file;
    return file;
  } catch (err) {
    console.warn('[persistence] studio load failed:', err);
    return null;
  }
}

export async function openStudio(file: StudioFile): Promise<StudioFile> {
  const normalized = normalizeStudioFile(file) ?? file;
  studio = normalized;
  try {
    await putRecord(STUDIO_KEY, normalized);
  } catch (err) {
    console.warn('[persistence] studio save failed:', err);
  }
  return normalized;
}

export async function loadWorkspace(): Promise<WorkspaceSnapshot | null> {
  try {
    const current = normalizeWorkspaceRecord(await readRecord(DB_NAME));
    if (current) return current;
    const legacy = normalizeWorkspaceRecord(await readRecord(LEGACY_DB_NAME));
    if (legacy) {
      await saveWorkspace(legacy);
      return legacy;
    }
    return null;
  } catch (err) {
    console.warn('[persistence] load failed:', err);
    return null;
  }
}

/** Compatibility helper for callers that only need to persist a valid AST. */
export async function saveSchema(ast: DatabaseAST): Promise<void> {
  return saveWorkspace({
    workspaceVersion: 2,
    ast,
    rawText: serializeDBML(ast),
    savedAt: Date.now(),
  });
}

/** Compatibility helper for callers that only need the last valid AST. */
export async function loadSchema(): Promise<DatabaseAST | null> {
  return (await loadWorkspace())?.ast ?? null;
}

export async function clearSchema(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn('[persistence] clear failed:', err);
  }
}
