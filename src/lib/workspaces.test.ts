import { describe, expect, it } from 'vitest';
import {
  activeBranch,
  activeFile,
  activeWorkspace,
  addBranch,
  addFile,
  addWorkspace,
  branchFiles,
  branchOpenFiles,
  closeFileTab,
  createCatalog,
  openFileTab,
  removeFile,
  renameFile,
  selectBranch,
  selectFile,
  selectWorkspace,
  withActiveText,
} from './workspaces';

describe('workspace catalog', () => {
  it('keeps each branch’s schema when switching', () => {
    const catalog = withActiveText(createCatalog('ecommerce-db', 'Table users {}'), 'Table users {\n  id integer\n}');
    const forked = addBranch(catalog, 'checkout', 'Table orders {}');
    expect(forked.error).toBeUndefined();
    const back = selectBranch(forked.catalog, 'main');
    expect(activeBranch(activeWorkspace(back)).rawText).toContain('Table users');
    expect(activeWorkspace(forked.catalog).branch).toBe('checkout');
  });

  it('switches workspaces without dropping the one you left', () => {
    const first = withActiveText(createCatalog('ecommerce-db', 'Table users {}'), 'Table users {}');
    const next = addWorkspace(first, 'Table posts {}');
    const returned = selectWorkspace(next, first.activeId);
    expect(activeWorkspace(returned).name).toBe('ecommerce-db');
    expect(activeBranch(activeWorkspace(returned)).rawText).toBe('Table users {}');
    expect(next.workspaces).toHaveLength(2);
  });

  it('rejects a duplicate branch name', () => {
    const catalog = createCatalog('ecommerce-db', 'Table users {}');
    const result = addBranch(catalog, 'main', 'Table other {}');
    expect(result.error).toMatch(/already exists/);
    expect(result.catalog).toBe(catalog);
  });

  describe('multi-file management and 3-file limit', () => {
    it('initializes with 1 file and provides fallback for legacy branches', () => {
      const catalog = createCatalog('app', 'Table users {}');
      const branch = activeBranch(activeWorkspace(catalog));
      expect(branchFiles(branch)).toHaveLength(1);
      expect(activeFile(branch).name).toBe('schema.dbml');
      expect(activeFile(branch).rawText).toBe('Table users {}');

      // Test backward compatibility with legacy branch without files array
      const legacyBranch: any = { name: 'legacy', rawText: 'Table legacy {}', savedAt: 100 };
      expect(branchFiles(legacyBranch)).toHaveLength(1);
      expect(activeFile(legacyBranch).name).toBe('schema.dbml');
      expect(activeFile(legacyBranch).rawText).toBe('Table legacy {}');
    });

    it('adds files up to the maximum limit of 3 files', () => {
      let catalog = createCatalog('app', 'Table t1 {}');
      const branch1 = activeBranch(activeWorkspace(catalog));
      expect(branchFiles(branch1)).toHaveLength(1);

      // Add file 2
      const res2 = addFile(catalog, 'billing.dbml', 'Table orders {}', undefined, 3);
      expect(res2.error).toBeUndefined();
      expect(res2.file?.name).toBe('billing.dbml');
      catalog = res2.catalog;

      const branch2 = activeBranch(activeWorkspace(catalog));
      expect(branchFiles(branch2)).toHaveLength(2);
      expect(activeFile(branch2).name).toBe('billing.dbml');

      // Add file 3
      const res3 = addFile(catalog, 'auth.dbml', 'Table tokens {}', undefined, 3);
      expect(res3.error).toBeUndefined();
      catalog = res3.catalog;

      const branch3 = activeBranch(activeWorkspace(catalog));
      expect(branchFiles(branch3)).toHaveLength(3);

      // Attempt adding a 4th file - MUST be rejected due to 3-file limit
      const res4 = addFile(catalog, 'extra.dbml', 'Table extra {}', undefined, 3);
      expect(res4.error).toMatch(/Maximum limit of 3 files/);
      expect(branchFiles(activeBranch(activeWorkspace(res4.catalog)))).toHaveLength(3);
    });

    it('prevents adding duplicate file names', () => {
      const catalog = createCatalog('app', 'Table t1 {}');
      const res = addFile(catalog, 'schema.dbml', 'Table t2 {}');
      expect(res.error).toMatch(/already exists/);
    });

    it('switches active file and updates active rawText', () => {
      let catalog = createCatalog('app', 'Table t1 {}');
      const file1Id = activeFile(activeBranch(activeWorkspace(catalog))).id;
      const res = addFile(catalog, 'second.dbml', 'Table t2 {}');
      catalog = res.catalog;
      const file2Id = res.file!.id;

      expect(activeFile(activeBranch(activeWorkspace(catalog))).name).toBe('second.dbml');
      expect(activeBranch(activeWorkspace(catalog)).rawText).toBe('Table t2 {}');

      catalog = selectFile(catalog, file1Id);
      expect(activeFile(activeBranch(activeWorkspace(catalog))).id).toBe(file1Id);
      expect(activeBranch(activeWorkspace(catalog)).rawText).toBe('Table t1 {}');

      // Updating active text updates the currently active file
      catalog = withActiveText(catalog, 'Table t1_updated {}');
      expect(activeFile(activeBranch(activeWorkspace(catalog))).rawText).toBe('Table t1_updated {}');
      // The other file is untouched
      catalog = selectFile(catalog, file2Id);
      expect(activeFile(activeBranch(activeWorkspace(catalog))).rawText).toBe('Table t2 {}');
    });

    it('renames and removes files, but prevents removing the last file', () => {
      let catalog = createCatalog('app', 'Table t1 {}');
      const file1Id = activeFile(activeBranch(activeWorkspace(catalog))).id;

      // Cannot remove only file
      const cannotDelete = removeFile(catalog, file1Id);
      expect(cannotDelete.error).toMatch(/Cannot delete the only file/);

      // Add a 2nd file and rename it
      const res = addFile(catalog, 'temp.dbml', 'Table temp {}');
      catalog = res.catalog;
      const file2Id = res.file!.id;

      const renamed = renameFile(catalog, file2Id, 'renamed.dbml');
      expect(renamed.error).toBeUndefined();
      catalog = renamed.catalog;
      expect(activeFile(activeBranch(activeWorkspace(catalog))).name).toBe('renamed.dbml');

      // Remove the 2nd file
      const removed = removeFile(catalog, file2Id);
      expect(removed.error).toBeUndefined();
      catalog = removed.catalog;
      expect(branchFiles(activeBranch(activeWorkspace(catalog)))).toHaveLength(1);
      expect(activeFile(activeBranch(activeWorkspace(catalog))).id).toBe(file1Id);
    });

    it('closing a tab only removes it from open tabs without deleting the file', () => {
      let catalog = createCatalog('app', 'Table users {}');
      const file1Id = activeFile(activeBranch(activeWorkspace(catalog))).id;

      // Add a 2nd file
      const res = addFile(catalog, 'billing.dbml', 'Table orders {}');
      catalog = res.catalog;
      const file2Id = res.file!.id;

      const branch = activeBranch(activeWorkspace(catalog));
      expect(branchFiles(branch)).toHaveLength(2);
      expect(branchOpenFiles(branch)).toHaveLength(2);
      expect(activeFile(branch).id).toBe(file2Id);

      // Close tab for file2
      catalog = closeFileTab(catalog, file2Id);
      const afterCloseBranch = activeBranch(activeWorkspace(catalog));

      // THE FILE MUST STILL EXIST IN WORKSPACE FILES!
      expect(branchFiles(afterCloseBranch)).toHaveLength(2);
      expect(branchFiles(afterCloseBranch).map((f) => f.name)).toContain('billing.dbml');

      // But it is no longer an open tab
      expect(branchOpenFiles(afterCloseBranch)).toHaveLength(1);
      expect(branchOpenFiles(afterCloseBranch)[0].id).toBe(file1Id);
      expect(activeFile(afterCloseBranch).id).toBe(file1Id);

      // Re-opening the file via openFileTab restores its tab
      catalog = openFileTab(catalog, file2Id);
      const afterReopenBranch = activeBranch(activeWorkspace(catalog));
      expect(branchOpenFiles(afterReopenBranch)).toHaveLength(2);
      expect(activeFile(afterReopenBranch).id).toBe(file2Id);
    });
  });
});