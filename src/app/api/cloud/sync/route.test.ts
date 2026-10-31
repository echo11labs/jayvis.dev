import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from './route';
import { db } from '@/lib/db';
import * as serverAuth from '@/lib/server-auth';
import type { WorkspaceCatalog } from '@/lib/workspaces';

describe('/api/cloud/sync endpoint', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    // Clean up test database
    try {
      await db.workspaceFile.deleteMany();
      await db.branch.deleteMany();
      await db.workspace.deleteMany();
      await db.user.deleteMany();
    } catch {
      // Ignored if db not initialized
    }
  });

  it('GET returns Local Mode status when not authenticated in self-hosted mode', async () => {
    vi.spyOn(serverAuth, 'getServerAuth').mockResolvedValue({
      isAuthenticated: false,
      userId: 'local-user',
      email: 'local@jayvis.dev',
      tier: 'LOCAL',
      isLocalMode: true,
    });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.mode).toBe('LOCAL');
  });

  it('POST returns 400 when catalog is missing or invalid', async () => {
    vi.spyOn(serverAuth, 'getServerAuth').mockResolvedValue({
      isAuthenticated: true,
      userId: 'user_test123',
      email: 'test@jayvis.dev',
      tier: 'FREE',
      isLocalMode: false,
    });

    const req = new Request('http://localhost:3000/api/cloud/sync', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('INVALID_PAYLOAD');
  });

  it('POST rejects when files exceed user tier quota', async () => {
    vi.spyOn(serverAuth, 'getServerAuth').mockResolvedValue({
      isAuthenticated: true,
      userId: 'user_quota_test',
      email: 'freeuser@jayvis.dev',
      tier: 'FREE', // max 15 files
      isLocalMode: false,
    });

    // Create a catalog with 16 files
    const dummyFiles = Array.from({ length: 16 }, (_, i) => ({
      id: `f-${i}`,
      name: `file-${i}.dbml`,
      rawText: `Table t${i} {}`,
      savedAt: Date.now(),
    }));

    const catalog: WorkspaceCatalog = {
      activeId: 'ws-quota',
      workspaces: [
        {
          id: 'ws-quota',
          name: 'large-workspace',
          branch: 'main',
          branches: [
            {
              name: 'main',
              rawText: '',
              savedAt: Date.now(),
              activeFileId: 'f-0',
              files: dummyFiles,
            },
          ],
        },
      ],
    };

    const req = new Request('http://localhost:3000/api/cloud/sync', {
      method: 'POST',
      body: JSON.stringify({ catalog }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('QUOTA_EXCEEDED');
    expect(data.maxFiles).toBe(15);
    expect(data.currentFiles).toBe(16);
  });

  it('POST saves workspaces and GET retrieves them for authenticated user', async () => {
    const testUserId = 'user_sync_success';
    vi.spyOn(serverAuth, 'getServerAuth').mockResolvedValue({
      isAuthenticated: true,
      userId: testUserId,
      email: 'success@jayvis.dev',
      tier: 'FREE',
      isLocalMode: false,
    });

    const catalog: WorkspaceCatalog = {
      activeId: 'ws-app1',
      workspaces: [
        {
          id: 'ws-app1',
          name: 'ecommerce',
          branch: 'main',
          branches: [
            {
              name: 'main',
              rawText: 'Table users { id int }',
              savedAt: 1000,
              activeFileId: 'f-users',
              files: [
                {
                  id: 'f-users',
                  name: 'users.dbml',
                  rawText: 'Table users { id int }',
                  savedAt: 1000,
                },
                {
                  id: 'f-orders',
                  name: 'orders.dbml',
                  rawText: 'Table orders { id int }',
                  savedAt: 1000,
                },
              ],
            },
          ],
        },
      ],
    };

    const postReq = new Request('http://localhost:3000/api/cloud/sync', {
      method: 'POST',
      body: JSON.stringify({ catalog }),
      headers: { 'Content-Type': 'application/json' },
    });

    const postRes = await POST(postReq);
    const postData = await postRes.json();

    expect(postRes.status).toBe(200);
    expect(postData.success).toBe(true);
    expect(postData.filesCount).toBe(2);

    // Now test GET
    const getRes = await GET();
    const getData = await getRes.json();

    expect(getRes.status).toBe(200);
    expect(getData.success).toBe(true);
    expect(getData.catalog).not.toBeNull();
    expect(getData.catalog.workspaces[0].name).toBe('ecommerce');
    expect(getData.catalog.workspaces[0].branches[0].files).toHaveLength(2);
    expect(getData.catalog.workspaces[0].branches[0].files[0].name).toBe('users.dbml');
  });
});
