import { liveCatalog, storeCatalog } from '@/lib/persistence';

export const MAX_FILES_PER_USER = Infinity;

export type WorkspaceFile = {
  id: string;
  name: string;
  rawText: string;
  savedAt: number;
};

export type BranchRecord = {
  name: string;
  rawText: string;
  savedAt: number;
  activeFileId?: string;
  openFileIds?: string[];
  files?: WorkspaceFile[];
};

export type WorkspaceRecord = {
  id: string;
  name: string;
  branch: string;
  branches: BranchRecord[];
};

export type WorkspaceCatalog = {
  activeId: string;
  workspaces: WorkspaceRecord[];
};

const STORAGE_KEY = 'jayvis-workspace-catalog';

function newId() {
  return `ws-${Math.random().toString(36).slice(2, 10)}`;
}

function newFileId() {
  return `file-${Math.random().toString(36).slice(2, 10)}`;
}

export function cleanLabel(value: string, fallback: string) {
  const trimmed = value.trim().replace(/\s+/g, '-').slice(0, 48);
  return trimmed || fallback;
}

export function cleanFileName(name: string, fallback = 'schema.dbml'): string {
  const trimmed = name.trim().replace(/[\s/\\]+/g, '-').slice(0, 64);
  if (!trimmed) return fallback;
  if (!/\.[a-zA-Z0-9]+$/.test(trimmed)) {
    return `${trimmed}.dbml`;
  }
  return trimmed;
}

function uniqueLabel(existing: string[], base: string) {
  if (!existing.includes(base)) return base;
  let index = 2;
  while (existing.includes(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function mapActive(
  catalog: WorkspaceCatalog,
  update: (workspace: WorkspaceRecord) => WorkspaceRecord,
): WorkspaceCatalog {
  return {
    ...catalog,
    workspaces: catalog.workspaces.map((workspace) =>
      workspace.id === catalog.activeId ? update(workspace) : workspace,
    ),
  };
}

export function activeWorkspace(catalog: WorkspaceCatalog): WorkspaceRecord {
  return catalog.workspaces.find((workspace) => workspace.id === catalog.activeId) ?? catalog.workspaces[0];
}

export function activeBranch(workspace: WorkspaceRecord): BranchRecord {
  return workspace.branches.find((branch) => branch.name === workspace.branch) ?? workspace.branches[0];
}

export function branchFiles(branch: BranchRecord): WorkspaceFile[] {
  if (Array.isArray(branch.files) && branch.files.length > 0) {
    return branch.files;
  }
  return [
    {
      id: branch.activeFileId || 'file-default',
      name: 'schema.dbml',
      rawText: branch.rawText,
      savedAt: branch.savedAt,
    },
  ];
}

export function branchOpenFiles(branch: BranchRecord): WorkspaceFile[] {
  const all = branchFiles(branch);
  if (!branch.openFileIds || branch.openFileIds.length === 0) {
    return all;
  }
  const openSet = new Set(branch.openFileIds);
  const open = all.filter((f) => openSet.has(f.id));
  return open.length > 0 ? open : [activeFile(branch)];
}

export function activeFile(branch: BranchRecord): WorkspaceFile {
  const files = branchFiles(branch);
  return files.find((file) => file.id === branch.activeFileId) ?? files[0];
}

export function openFileTab(catalog: WorkspaceCatalog, fileId: string): WorkspaceCatalog {
  const workspace = activeWorkspace(catalog);
  const branch = activeBranch(workspace);
  const files = branchFiles(branch);
  const target = files.find((f) => f.id === fileId);
  if (!target) return catalog;

  const currentOpen = branchOpenFiles(branch).map((f) => f.id);
  const nextOpen = currentOpen.includes(fileId) ? currentOpen : [...currentOpen, fileId];

  return mapActive(catalog, (current) => ({
    ...current,
    branches: current.branches.map((b) =>
      b.name === current.branch
        ? {
            ...b,
            activeFileId: fileId,
            openFileIds: nextOpen,
            rawText: target.rawText,
          }
        : b,
    ),
  }));
}

export function closeFileTab(catalog: WorkspaceCatalog, fileId: string): WorkspaceCatalog {
  const workspace = activeWorkspace(catalog);
  const branch = activeBranch(workspace);
  const files = branchFiles(branch);
  const open = branchOpenFiles(branch);
  if (open.length <= 1) {
    return catalog;
  }

  const remaining = open.filter((f) => f.id !== fileId);
  const currentActiveId = branch.activeFileId ?? files[0].id;
  const nextActive =
    currentActiveId === fileId
      ? remaining[0]
      : (remaining.find((f) => f.id === currentActiveId) ?? remaining[0]);

  return mapActive(catalog, (current) => ({
    ...current,
    branches: current.branches.map((b) =>
      b.name === current.branch
        ? {
            ...b,
            activeFileId: nextActive.id,
            openFileIds: remaining.map((f) => f.id),
            rawText: nextActive.rawText,
          }
        : b,
    ),
  }));
}

export function createCatalog(
  name: string,
  rawText: string,
  now = Date.now(),
  fileName = 'schema.dbml',
): WorkspaceCatalog {
  const id = newId();
  const fileId = newFileId();
  const initialFile: WorkspaceFile = {
    id: fileId,
    name: cleanFileName(fileName),
    rawText,
    savedAt: now,
  };
  return {
    activeId: id,
    workspaces: [
      {
        id,
        name: cleanLabel(name, 'workspace'),
        branch: 'main',
        branches: [
          {
            name: 'main',
            rawText,
            savedAt: now,
            activeFileId: fileId,
            openFileIds: [fileId],
            files: [initialFile],
          },
        ],
      },
    ],
  };
}

export function withActiveText(catalog: WorkspaceCatalog, rawText: string, now = Date.now()): WorkspaceCatalog {
  const workspace = activeWorkspace(catalog);
  const branch = activeBranch(workspace);
  const currentActiveFile = activeFile(branch);
  if (branch.rawText === rawText && currentActiveFile.rawText === rawText) return catalog;

  return mapActive(catalog, (current) => ({
    ...current,
    branches: current.branches.map((item) => {
      if (item.name !== current.branch) return item;
      const existingFiles = branchFiles(item);
      const activeId = item.activeFileId ?? existingFiles[0]?.id;
      const updatedFiles = existingFiles.map((file) =>
        file.id === activeId ? { ...file, rawText, savedAt: now } : file,
      );
      return {
        ...item,
        rawText,
        savedAt: now,
        activeFileId: activeId,
        files: updatedFiles,
      };
    }),
  }));
}

export function addFile(
  catalog: WorkspaceCatalog,
  name: string,
  rawText = '',
  now = Date.now(),
  maxLimit: number = MAX_FILES_PER_USER,
): { catalog: WorkspaceCatalog; file?: WorkspaceFile; error?: string } {
  const workspace = activeWorkspace(catalog);
  const branch = activeBranch(workspace);
  const files = branchFiles(branch);

  if (Number.isFinite(maxLimit) && files.length >= maxLimit) {
    return {
      catalog,
      error: `Maximum limit of ${maxLimit} files reached for this workspace.`,
    };
  }

  const fileName = cleanFileName(name, `schema-${files.length + 1}.dbml`);
  if (files.some((f) => f.name.toLowerCase() === fileName.toLowerCase())) {
    return { catalog, error: `File "${fileName}" already exists` };
  }

  const fileId = newFileId();
  const newFile: WorkspaceFile = {
    id: fileId,
    name: fileName,
    rawText,
    savedAt: now,
  };

  const nextFiles = [...files, newFile];
  const currentOpen = branchOpenFiles(branch).map((f) => f.id);
  const nextOpen = currentOpen.includes(fileId) ? currentOpen : [...currentOpen, fileId];

  const next = mapActive(catalog, (current) => ({
    ...current,
    branches: current.branches.map((b) =>
      b.name === current.branch
        ? {
            ...b,
            activeFileId: fileId,
            openFileIds: nextOpen,
            rawText,
            savedAt: now,
            files: nextFiles,
          }
        : b,
    ),
  }));

  return { catalog: next, file: newFile };
}

export function selectFile(catalog: WorkspaceCatalog, fileId: string): WorkspaceCatalog {
  const workspace = activeWorkspace(catalog);
  const branch = activeBranch(workspace);
  const files = branchFiles(branch);
  const target = files.find((f) => f.id === fileId);
  if (!target) return catalog;

  const currentOpen = branchOpenFiles(branch).map((f) => f.id);
  const nextOpen = currentOpen.includes(fileId) ? currentOpen : [...currentOpen, fileId];

  if (branch.activeFileId === fileId && currentOpen.includes(fileId)) return catalog;

  return mapActive(catalog, (current) => ({
    ...current,
    branches: current.branches.map((b) =>
      b.name === current.branch
        ? {
            ...b,
            activeFileId: fileId,
            openFileIds: nextOpen,
            rawText: target.rawText,
          }
        : b,
    ),
  }));
}

export function removeFile(
  catalog: WorkspaceCatalog,
  fileId: string,
): { catalog: WorkspaceCatalog; error?: string } {
  const workspace = activeWorkspace(catalog);
  const branch = activeBranch(workspace);
  const files = branchFiles(branch);

  if (files.length <= 1) {
    return { catalog, error: 'Cannot delete the only file in the workspace' };
  }

  if (!files.some((f) => f.id === fileId)) {
    return { catalog, error: 'File not found' };
  }

  const remaining = files.filter((f) => f.id !== fileId);
  const remainingOpen = branchOpenFiles(branch)
    .filter((f) => f.id !== fileId)
    .map((f) => f.id);
  const nextOpen = remainingOpen.length > 0 ? remainingOpen : [remaining[0].id];
  const currentActiveId = branch.activeFileId ?? files[0].id;
  const nextActive =
    currentActiveId === fileId
      ? remaining[0]
      : (remaining.find((f) => f.id === currentActiveId) ?? remaining[0]);

  const next = mapActive(catalog, (current) => ({
    ...current,
    branches: current.branches.map((b) =>
      b.name === current.branch
        ? {
            ...b,
            activeFileId: nextActive.id,
            openFileIds: nextOpen,
            rawText: nextActive.rawText,
            files: remaining,
          }
        : b,
    ),
  }));

  return { catalog: next };
}

export function renameFile(
  catalog: WorkspaceCatalog,
  fileId: string,
  newName: string,
): { catalog: WorkspaceCatalog; error?: string } {
  const workspace = activeWorkspace(catalog);
  const branch = activeBranch(workspace);
  const files = branchFiles(branch);
  const target = files.find((f) => f.id === fileId);
  if (!target) return { catalog, error: 'File not found' };

  const cleaned = cleanFileName(newName, target.name);
  if (files.some((f) => f.id !== fileId && f.name.toLowerCase() === cleaned.toLowerCase())) {
    return { catalog, error: `File "${cleaned}" already exists` };
  }

  const updatedFiles = files.map((f) => (f.id === fileId ? { ...f, name: cleaned } : f));
  const next = mapActive(catalog, (current) => ({
    ...current,
    branches: current.branches.map((b) =>
      b.name === current.branch
        ? {
            ...b,
            files: updatedFiles,
          }
        : b,
    ),
  }));

  return { catalog: next };
}

export function renameActive(catalog: WorkspaceCatalog, name: string): WorkspaceCatalog {
  const nextName = cleanLabel(name, activeWorkspace(catalog).name);
  return mapActive(catalog, (workspace) => ({ ...workspace, name: nextName }));
}

export function selectWorkspace(catalog: WorkspaceCatalog, id: string): WorkspaceCatalog {
  if (!catalog.workspaces.some((workspace) => workspace.id === id)) return catalog;
  return { ...catalog, activeId: id };
}

export function addWorkspace(catalog: WorkspaceCatalog, rawText = '', now = Date.now()): WorkspaceCatalog {
  const name = uniqueLabel(
    catalog.workspaces.map((workspace) => workspace.name),
    'workspace',
  );
  const id = newId();
  const fileId = newFileId();
  return {
    activeId: id,
    workspaces: [
      ...catalog.workspaces,
      {
        id,
        name,
        branch: 'main',
        branches: [
          {
            name: 'main',
            rawText,
            savedAt: now,
            activeFileId: fileId,
            openFileIds: [fileId],
            files: [
              {
                id: fileId,
                name: 'schema.dbml',
                rawText,
                savedAt: now,
              },
            ],
          },
        ],
      },
    ],
  };
}

export function selectBranch(catalog: WorkspaceCatalog, name: string): WorkspaceCatalog {
  const workspace = activeWorkspace(catalog);
  if (!workspace.branches.some((branch) => branch.name === name)) return catalog;
  return mapActive(catalog, (current) => ({ ...current, branch: name }));
}

export function addBranch(
  catalog: WorkspaceCatalog,
  name: string,
  rawText: string,
  now = Date.now(),
): { catalog: WorkspaceCatalog; error?: string } {
  const branchName = cleanLabel(name, '');
  if (!branchName) return { catalog, error: 'Name the branch first' };
  const workspace = activeWorkspace(catalog);
  if (workspace.branches.some((branch) => branch.name === branchName)) {
    return { catalog, error: `Branch ${branchName} already exists` };
  }
  const fileId = newFileId();
  const next = mapActive(catalog, (current) => ({
    ...current,
    branch: branchName,
    branches: [
      ...current.branches,
      {
        name: branchName,
        rawText,
        savedAt: now,
        activeFileId: fileId,
        openFileIds: [fileId],
        files: [
          {
            id: fileId,
            name: 'schema.dbml',
            rawText,
            savedAt: now,
          },
        ],
      },
    ],
  }));
  return { catalog: next };
}

function isCatalog(value: unknown): value is WorkspaceCatalog {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<WorkspaceCatalog>;
  return (
    typeof candidate.activeId === 'string' &&
    Array.isArray(candidate.workspaces) &&
    candidate.workspaces.length > 0 &&
    candidate.workspaces.every((workspace) => {
      const entry = workspace as Partial<WorkspaceRecord>;
      return (
        typeof entry.id === 'string' &&
        typeof entry.name === 'string' &&
        typeof entry.branch === 'string' &&
        Array.isArray(entry.branches) &&
        entry.branches.length > 0
      );
    })
  );
}

export function readCatalog(): WorkspaceCatalog | null {
  const live = liveCatalog();
  if (live) return live;
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    return isCatalog(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCatalog(catalog: WorkspaceCatalog) {
  if (storeCatalog(catalog)) return;
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
}

export function clearCatalogStorage() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
