import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerAuth } from '@/lib/server-auth';
import type { WorkspaceCatalog } from '@/lib/workspaces';

export async function GET() {
  try {
    const auth = await getServerAuth();

    if (!auth.isAuthenticated) {
      if (auth.isLocalMode) {
        return NextResponse.json({
          success: true,
          mode: 'LOCAL',
          tier: 'LOCAL',
          maxFiles: 10,
          message: 'Running in Local-First Mode (100% Offline with IndexedDB storage).',
        });
      }
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Sign in to access Cloud Storage.' },
        { status: 401 },
      );
    }

    const user = await db.user.findUnique({
      where: { id: auth.userId! },
      include: {
        workspaces: {
          include: {
            branches: {
              include: {
                files: true,
              },
            },
          },
        },
      },
    });

    const maxAllowed = auth.tier === 'PRO' ? 9999 : 15;

    if (!user || user.workspaces.length === 0) {
      return NextResponse.json({
        success: true,
        catalog: null,
        tier: auth.tier,
        maxFiles: maxAllowed,
      });
    }

    const catalog: WorkspaceCatalog = {
      activeId: user.workspaces[0].id,
      workspaces: user.workspaces.map((ws) => ({
        id: ws.id,
        name: ws.name,
        branch: ws.branch,
        branches: ws.branches.map((b) => ({
          name: b.name,
          rawText: b.rawText,
          savedAt: b.updatedAt.getTime(),
          activeFileId: b.activeFileId ?? undefined,
          files: b.files.map((f) => ({
            id: f.id,
            name: f.name,
            rawText: f.rawText,
            savedAt: f.updatedAt.getTime(),
          })),
        })),
      })),
    };

    return NextResponse.json({
      success: true,
      catalog,
      tier: auth.tier,
      maxFiles: maxAllowed,
    });
  } catch (error) {
    console.error('[API /api/cloud/sync GET error]:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getServerAuth();

    if (!auth.isAuthenticated) {
      if (auth.isLocalMode) {
        return NextResponse.json({
          success: true,
          mode: 'LOCAL',
          tier: 'LOCAL',
          maxFiles: 10,
          message: 'Local Mode: changes persist locally in browser storage.',
        });
      }
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Sign in to sync with Cloud Storage.' },
        { status: 401 },
      );
    }

    const body = (await req.json()) as { catalog?: WorkspaceCatalog };
    if (!body || !body.catalog || !Array.isArray(body.catalog.workspaces)) {
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', message: 'Workspace catalog is required.' },
        { status: 400 },
      );
    }

    const catalog = body.catalog;

    // Calculate total files across workspaces
    let totalFiles = 0;
    for (const ws of catalog.workspaces) {
      for (const branch of ws.branches) {
        totalFiles += Math.max(1, branch.files?.length || 1);
      }
    }

    // Quota Enforcement
    const maxAllowed = auth.tier === 'PRO' ? 9999 : 15;
    if (totalFiles > maxAllowed) {
      return NextResponse.json(
        {
          error: 'QUOTA_EXCEEDED',
          message: `Workspace limit exceeded. ${auth.tier} tier allows up to ${maxAllowed} files, but catalog contains ${totalFiles} files.`,
          maxFiles: maxAllowed,
          currentFiles: totalFiles,
          tier: auth.tier,
        },
        { status: 403 },
      );
    }

    // Upsert User and sync in transaction
    await db.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { id: auth.userId! },
        update: {
          email: auth.email,
        },
        create: {
          id: auth.userId!,
          email: auth.email,
          tier: auth.tier,
        },
      });

      const incomingWsIds = catalog.workspaces.map((w) => w.id);

      // Clean up workspaces removed from catalog
      await tx.workspace.deleteMany({
        where: {
          userId: user.id,
          id: { notIn: incomingWsIds },
        },
      });

      for (const ws of catalog.workspaces) {
        await tx.workspace.upsert({
          where: { id: ws.id },
          create: {
            id: ws.id,
            userId: user.id,
            name: ws.name,
            branch: ws.branch,
          },
          update: {
            name: ws.name,
            branch: ws.branch,
          },
        });

        const incomingBranchNames = ws.branches.map((b) => b.name);
        await tx.branch.deleteMany({
          where: {
            workspaceId: ws.id,
            name: { notIn: incomingBranchNames },
          },
        });

        for (const b of ws.branches) {
          const branch = await tx.branch.upsert({
            where: {
              workspaceId_name: {
                workspaceId: ws.id,
                name: b.name,
              },
            },
            create: {
              workspaceId: ws.id,
              name: b.name,
              rawText: b.rawText,
              activeFileId: b.activeFileId ?? null,
            },
            update: {
              rawText: b.rawText,
              activeFileId: b.activeFileId ?? null,
            },
          });

          const files = b.files && b.files.length > 0 ? b.files : [
            {
              id: b.activeFileId || 'default-file',
              name: 'schema.dbml',
              rawText: b.rawText,
              savedAt: Date.now(),
            },
          ];

          const incomingFileIds = files.map((f) => f.id);
          await tx.workspaceFile.deleteMany({
            where: {
              branchId: branch.id,
              id: { notIn: incomingFileIds },
            },
          });

          for (const f of files) {
            await tx.workspaceFile.upsert({
              where: { id: f.id },
              create: {
                id: f.id,
                branchId: branch.id,
                name: f.name,
                rawText: f.rawText,
              },
              update: {
                name: f.name,
                rawText: f.rawText,
              },
            });
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      syncedAt: Date.now(),
      workspacesCount: catalog.workspaces.length,
      filesCount: totalFiles,
      maxFiles: maxAllowed,
      tier: auth.tier,
    });
  } catch (error) {
    console.error('[API /api/cloud/sync POST error]:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: (error as Error).message },
      { status: 500 },
    );
  }
}
