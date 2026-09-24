/**
 * IndexedDB persistence for the JayVis.dev schema.
 *
 * Stores the full DatabaseAST (including cached node positions) so the
 * user's work survives page reloads — local-first by default (spec §1.4).
 */

import { sanitizeDbmlText, serializeDBML } from '@/lib/parser/dbml';
import type { DatabaseAST } from '@/types/ast';

const DB_NAME = 'jayvis';
const LEGACY_DB_NAME = 'stitchdb';
const STORE = 'schema';
const KEY = 'current';
const DB_VERSION = 1;

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

async function readRecord(name: string): Promise<unknown> {
  const db = await openNamedDB(name);
  try {
    if (!db.objectStoreNames.contains(STORE)) return null;
    return await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function saveWorkspace(
  snapshot: WorkspaceSnapshot,
): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(snapshot, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    // Persistence is best-effort; never block the UI on storage failures.
    console.warn('[persistence] save failed:', err);
  }
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
