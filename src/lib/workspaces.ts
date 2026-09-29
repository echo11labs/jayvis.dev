import { liveCatalog, storeCatalog } from '@/lib/persistence';

export type BranchRecord = {
  name: string;
  rawText: string;
  savedAt: number;
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

export function cleanLabel(value: string, fallback: string) {
  const trimmed = value.trim().replace(/\s+/g, '-').slice(0, 48);
  return trimmed || fallback;
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

export function createCatalog(name: string, rawText: string, now = Date.now()): WorkspaceCatalog {
  const id = newId();
  return {
    activeId: id,
    workspaces: [
      {
        id,
        name: cleanLabel(name, 'workspace'),
        branch: 'main',
        branches: [{ name: 'main', rawText, savedAt: now }],
      },
    ],
  };
}

export function withActiveText(catalog: WorkspaceCatalog, rawText: string, now = Date.now()): WorkspaceCatalog {
  const workspace = activeWorkspace(catalog);
  const branch = activeBranch(workspace);
  if (branch.rawText === rawText) return catalog;
  return mapActive(catalog, (current) => ({
    ...current,
    branches: current.branches.map((item) =>
      item.name === current.branch ? { ...item, rawText, savedAt: now } : item,
    ),
  }));
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
  return {
    activeId: id,
    workspaces: [
      ...catalog.workspaces,
      {
        id,
        name,
        branch: 'main',
        branches: [{ name: 'main', rawText, savedAt: now }],
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
  const next = mapActive(catalog, (current) => ({
    ...current,
    branch: branchName,
    branches: [...current.branches, { name: branchName, rawText, savedAt: now }],
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
