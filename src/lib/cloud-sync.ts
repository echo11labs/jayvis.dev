import type { WorkspaceCatalog } from '@/lib/workspaces';

export interface CloudSyncResponse {
  ok: boolean;
  mode?: 'LOCAL' | 'CLOUD';
  catalog?: WorkspaceCatalog | null;
  error?: string;
  message?: string;
  maxFiles?: number;
  currentFiles?: number;
  tier?: string;
  syncedAt?: number;
}

/**
 * Pushes the full workspace catalog to the cloud backend.
 * Gracefully handles offline / local mode when not authenticated.
 */
export async function pushCatalogToCloud(
  catalog: WorkspaceCatalog,
): Promise<CloudSyncResponse> {
  try {
    const res = await fetch('/api/cloud/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ catalog }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        error: data.error || 'SYNC_FAILED',
        message: data.message || `Sync failed with status ${res.status}`,
        maxFiles: data.maxFiles,
        currentFiles: data.currentFiles,
        tier: data.tier,
      };
    }

    return {
      ok: true,
      mode: data.mode ?? 'CLOUD',
      syncedAt: data.syncedAt,
      tier: data.tier,
      maxFiles: data.maxFiles,
    };
  } catch (err) {
    return {
      ok: false,
      error: 'NETWORK_ERROR',
      message: (err as Error).message || 'Network request failed',
    };
  }
}

/**
 * Pulls the user's persisted workspace catalog from the cloud.
 */
export async function pullCatalogFromCloud(): Promise<CloudSyncResponse> {
  try {
    const res = await fetch('/api/cloud/sync', {
      method: 'GET',
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        error: data.error || 'FETCH_FAILED',
        message: data.message,
      };
    }

    return {
      ok: true,
      mode: data.mode ?? 'CLOUD',
      catalog: data.catalog ?? null,
      tier: data.tier,
      maxFiles: data.maxFiles,
    };
  } catch (err) {
    return {
      ok: false,
      error: 'NETWORK_ERROR',
      message: (err as Error).message,
    };
  }
}
