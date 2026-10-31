'use client';

import { useState } from 'react';
import { Mark } from '@/lib/ui/marks';
import type { WorkspaceFile } from '@/lib/workspaces';
import { MAX_FILES_PER_USER } from '@/lib/workspaces';
import { useAuthContext } from '@/components/auth/AuthProvider';

interface EditorTabsProps {
  files?: WorkspaceFile[];
  activeFileId?: string;
  maxFiles?: number;
  onSelectFile?: (id: string) => void;
  onAddFile?: () => void;
  onCloseTab?: (id: string) => void;
  onRemoveFile?: (id: string) => void;
  onRenameFile?: (id: string, newName: string) => void;
  onClose?: () => void;
}

export function EditorTabs({
  files = [],
  activeFileId,
  maxFiles,
  onSelectFile,
  onAddFile,
  onCloseTab,
  onRemoveFile,
  onRenameFile,
  onClose,
}: EditorTabsProps) {
  const { maxFiles: authMaxFiles, tier } = useAuthContext();
  const effectiveMaxFiles = maxFiles ?? authMaxFiles ?? MAX_FILES_PER_USER;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const displayFiles: WorkspaceFile[] =
    files.length > 0
      ? files
      : [{ id: 'default', name: 'schema.dbml', rawText: '', savedAt: Date.now() }];

  const handleStartRename = (file: WorkspaceFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(file.id);
    setEditingName(file.name);
  };

  const handleFinishRename = (id: string) => {
    if (editingId && onRenameFile && editingName.trim()) {
      onRenameFile(id, editingName.trim());
    }
    setEditingId(null);
  };

  const canAdd = !Number.isFinite(effectiveMaxFiles) || displayFiles.length < effectiveMaxFiles;

  return (
    <div className="flex h-8 shrink-0 items-stretch border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-tabbar)] text-[12px]">
      <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
        {displayFiles.map((file) => {
          const isActive = activeFileId ? file.id === activeFileId : true;
          const isRenaming = editingId === file.id;

          return (
            <div
              key={file.id}
              onClick={() => onSelectFile?.(file.id)}
              onDoubleClick={(e) => handleStartRename(file, e)}
              className={`group relative flex h-full items-center gap-2 border-r border-[var(--color-border-subtle)] px-3 font-mono cursor-pointer select-none transition-colors ${
                isActive
                  ? 'bg-[var(--color-bg-editor)] text-[var(--color-text-primary)] border-t-2 border-t-[var(--color-accent-primary)] font-medium'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
              }`}
              title={`${file.name} (Double-click to rename)`}
            >
              <Mark
                name={
                  file.name.endsWith('.json')
                    ? 'json'
                    : file.name.endsWith('.sql')
                      ? 'database'
                      : 'fileCode'
                }
                className="shrink-0 text-[var(--color-text-muted)]"
              />

              {isRenaming ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleFinishRename(file.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFinishRename(file.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-24 rounded bg-[var(--color-bg-app)] px-1 py-0.5 text-[11px] text-[var(--color-text-primary)] outline-none ring-1 ring-[var(--color-accent-primary)]"
                />
              ) : (
                <span className="max-w-[130px] truncate text-[11px]">{file.name}</span>
              )}

              {displayFiles.length > 1 && (onCloseTab || onRemoveFile) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    (onCloseTab ?? onRemoveFile)?.(file.id);
                  }}
                  className={`flex h-4 w-4 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] ${
                    isActive
                      ? 'opacity-70 hover:opacity-100'
                      : 'opacity-0 group-hover:opacity-70 hover:!opacity-100'
                  }`}
                  title={`Close tab (${file.name})`}
                  aria-label={`Close tab (${file.name})`}
                >
                  <Mark name="close" />
                </button>
              )}
            </div>
          );
        })}

        {/* Add File button */}
        <div className="flex items-center px-1.5">
          {canAdd ? (
            <button
              type="button"
              onClick={onAddFile}
              className="flex h-6 items-center gap-1 rounded px-1.5 text-[11px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
              title={
                Number.isFinite(effectiveMaxFiles) && tier !== 'LOCAL'
                  ? `Add new file (${displayFiles.length}/${effectiveMaxFiles} - ${tier} tier)`
                  : 'Add new file'
              }
              aria-label="Add new file"
            >
              <Mark name="plus" />
              {Number.isFinite(effectiveMaxFiles) && tier !== 'LOCAL' && (
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  {displayFiles.length}/{effectiveMaxFiles}
                </span>
              )}
            </button>
          ) : (
            <span
              className="rounded bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-muted)]"
              title={`Maximum ${effectiveMaxFiles} files reached for ${tier} tier`}
            >
              {displayFiles.length}/{effectiveMaxFiles} max
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center px-2">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('jayvis:add-table'))}
          className="mr-1 flex h-6 items-center gap-1 rounded px-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
          title="Add table (T)"
          aria-label="Add table"
        >
          <Mark name="plus" />
          <span>Table</span>
        </button>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('jayvis:editor-format'))}
          className="mr-1 flex h-6 items-center gap-1 rounded px-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
          title="Format Code (⌥⇧F)"
          aria-label="Format Code"
        >
          <Mark name="code" />
          <span>Format</span>
        </button>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('jayvis:editor-find'))}
          className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
          title="Find (⌘F)"
        >
          <Mark name="search" />
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-0.5 flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
            title="Close editor pane"
            aria-label="Close editor pane"
          >
            <Mark name="close" />
          </button>
        )}
      </div>
    </div>
  );
}
