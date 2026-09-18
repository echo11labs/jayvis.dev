/**
 * IndexedDB persistence for the StitchDB schema.
 *
 * Stores the full DatabaseAST (including cached node positions) so the
 * user's work survives page reloads — local-first by default (spec §1.4).
 */

import type { DatabaseAST } from '@/types/ast';

const DB_NAME = 'stitchdb';
const STORE = 'schema';
const KEY = 'current';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
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

export async function saveSchema(ast: DatabaseAST): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(ast, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    // Persistence is best-effort; never block the UI on storage failures.
    console.warn('[persistence] save failed:', err);
  }
}

export async function loadSchema(): Promise<DatabaseAST | null> {
  try {
    const db = await openDB();
    const result = await new Promise<DatabaseAST | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as DatabaseAST) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch (err) {
    console.warn('[persistence] load failed:', err);
    return null;
  }
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
