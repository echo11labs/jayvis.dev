import { describe, expect, it } from 'vitest';
import { normalizeWorkspaceSettings } from './use-workspace-settings';

describe('workspace settings', () => {
  it('fills missing flags from defaults', () => {
    expect(normalizeWorkspaceSettings({ minimap: false })).toMatchObject({
      autoSave: true,
      minimap: false,
      grid: true,
      snap: true,
      wordWrap: true,
      lineNumbers: true,
      fontSize: 13,
      fontWeight: 400,
      fontLigatures: true,
    });
  });

  it('rejects malformed values', () => {
    expect(normalizeWorkspaceSettings({ autoSave: 'yes' })).toMatchObject({
      autoSave: true,
    });
    expect(
      normalizeWorkspaceSettings({ fontSize: 99, fontWeight: 100, fontLigatures: 'on' }),
    ).toMatchObject({
      fontSize: 13,
      fontWeight: 400,
      fontLigatures: true,
    });
  });
});
