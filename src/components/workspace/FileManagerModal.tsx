'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Mark, type MarkName } from '@/lib/ui/marks';
import type { WorkspaceFile } from '@/lib/workspaces';
import { MAX_FILES_PER_USER } from '@/lib/workspaces';
import { useAuthContext } from '@/components/auth/AuthProvider';

const TEMPLATES: Array<{
  id: string;
  name: string;
  desc: string;
  mark: MarkName;
  content: string;
}> = [
  {
    id: 'blank',
    name: 'Blank',
    desc: 'Empty schema document',
    mark: 'fileCode',
    content: '// New schema file\n',
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce',
    desc: 'Orders, products, users & items',
    mark: 'table',
    content: `Table users {
  id integer [pk, increment]
  full_name varchar [not null]
  email varchar [unique, not null]
  created_at timestamp [default: \`now()\`]
}

Table products {
  id integer [pk, increment]
  title varchar [not null]
  price decimal(10,2) [not null]
  stock integer [default: 0]
}

Table orders {
  id integer [pk, increment]
  user_id integer [ref: > users.id]
  total decimal(10,2) [not null]
  status varchar [default: 'pending']
  created_at timestamp [default: \`now()\`]
}

Table order_items {
  id integer [pk, increment]
  order_id integer [ref: > orders.id]
  product_id integer [ref: > products.id]
  quantity integer [default: 1]
  price decimal(10,2) [not null]
}
`,
  },
  {
    id: 'auth',
    name: 'SaaS & Auth',
    desc: 'Users, orgs, accounts & sessions',
    mark: 'shield',
    content: `Table users {
  id uuid [pk]
  name varchar
  email varchar [unique, not null]
  email_verified timestamp
  image varchar
  created_at timestamp [default: \`now()\`]
}

Table accounts {
  id uuid [pk]
  user_id uuid [ref: > users.id]
  type varchar [not null]
  provider varchar [not null]
  provider_account_id varchar [not null]
  access_token text
}

Table sessions {
  id uuid [pk]
  session_token varchar [unique, not null]
  user_id uuid [ref: > users.id]
  expires timestamp [not null]
}

Table organizations {
  id uuid [pk]
  name varchar [not null]
  slug varchar [unique, not null]
  created_at timestamp [default: \`now()\`]
}

Table memberships {
  id uuid [pk]
  user_id uuid [ref: > users.id]
  org_id uuid [ref: > organizations.id]
  role varchar [default: 'member']
}
`,
  },
  {
    id: 'blog',
    name: 'Content & Blog',
    desc: 'Posts, authors, tags & comments',
    mark: 'pencil',
    content: `Table authors {
  id integer [pk, increment]
  username varchar [unique, not null]
  bio text
  website varchar
}

Table posts {
  id integer [pk, increment]
  author_id integer [ref: > authors.id]
  slug varchar [unique, not null]
  title varchar [not null]
  body text
  published boolean [default: false]
  created_at timestamp [default: \`now()\`]
}

Table comments {
  id integer [pk, increment]
  post_id integer [ref: > posts.id]
  author_name varchar [not null]
  content text [not null]
  created_at timestamp [default: \`now()\`]
}

Table tags {
  id integer [pk, increment]
  name varchar [unique, not null]
}

Table post_tags {
  post_id integer [ref: > posts.id]
  tag_id integer [ref: > tags.id]
}
`,
  },
];

interface FileManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: WorkspaceFile[];
  activeFileId?: string;
  openFileIds?: string[];
  onCreateFile: (name: string, content?: string) => void;
  onSelectFile: (fileId: string) => void;
  maxFiles?: number;
  onCloseTab?: (fileId: string) => void;
  onRenameFile?: (fileId: string, newName: string) => void;
  onDeleteFile?: (fileId: string) => void;
  onImportFileContent?: (fileName: string, content: string) => void;
}

export function FileManagerModal({
  open,
  onOpenChange,
  files,
  activeFileId,
  openFileIds = [],
  maxFiles,
  onCreateFile,
  onSelectFile,
  onRenameFile,
  onDeleteFile,
  onImportFileContent,
}: FileManagerModalProps) {
  const { maxFiles: authMaxFiles, tier } = useAuthContext();
  const effectiveMaxFiles = maxFiles ?? authMaxFiles ?? MAX_FILES_PER_USER;
  const [tab, setTab] = useState<'create' | 'manage' | 'import'>('create');
  const [fileName, setFileName] = useState('');
  const [selectedExtension, setSelectedExtension] = useState<'.dbml' | '.sql' | '.json'>('.dbml');
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const isAtLimit = Number.isFinite(effectiveMaxFiles) && files.length >= effectiveMaxFiles;

  useEffect(() => {
    if (open) {
      const nextIndex = files.length + 1;
      setFileName(`schema-${nextIndex}`);
      setSelectedTemplate('blank');
      setRenamingId(null);
      setTab(isAtLimit ? 'manage' : 'create');
    }
  }, [open, files.length, isAtLimit]);

  const handleCreate = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isAtLimit) return;

    let trimmed = fileName.trim();
    if (!trimmed) {
      trimmed = `schema-${files.length + 1}`;
    }

    if (!trimmed.toLowerCase().endsWith(selectedExtension)) {
      if (/\.[a-zA-Z0-9]+$/.test(trimmed)) {
        trimmed = trimmed.replace(/\.[a-zA-Z0-9]+$/, selectedExtension);
      } else {
        trimmed = `${trimmed}${selectedExtension}`;
      }
    }

    const template = TEMPLATES.find((t) => t.id === selectedTemplate);
    const content = template ? template.content : '';

    onCreateFile(trimmed, content);
    onOpenChange(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile || !onImportFileContent) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = typeof evt.target?.result === 'string' ? evt.target.result : '';
      onImportFileContent(droppedFile.name, text);
      onOpenChange(false);
    };
    reader.readAsText(droppedFile);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked || !onImportFileContent) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = typeof evt.target?.result === 'string' ? evt.target.result : '';
      onImportFileContent(picked.name, text);
      onOpenChange(false);
    };
    reader.readAsText(picked);
  };

  const countLines = (rawText: string) => {
    if (!rawText) return 0;
    return rawText.split('\n').length;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] overflow-hidden border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-0 text-[var(--color-text-primary)] shadow-2xl">
        {/* Header */}
        <DialogHeader className="border-b border-[var(--color-border-subtle)] px-5 py-3.5">
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">
              Workspace Files
            </DialogTitle>
            <span className="font-mono text-[11px] text-[var(--color-text-muted)]">
              {files.length}/{effectiveMaxFiles} files
              {tier && tier !== 'LOCAL' && (
                <span className="ml-1 text-[10px] text-[var(--color-accent-primary)] font-sans">
                  ({tier})
                </span>
              )}
            </span>
          </div>
        </DialogHeader>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-4 border-b border-[var(--color-border-subtle)] px-5">
          <button
            type="button"
            onClick={() => setTab('create')}
            disabled={isAtLimit}
            className={`border-b-2 pb-2.5 pt-2 text-xs font-medium transition-colors ${
              tab === 'create'
                ? 'border-[var(--color-accent-primary)] text-[var(--color-text-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            New File
          </button>
          <button
            type="button"
            onClick={() => setTab('manage')}
            className={`border-b-2 pb-2.5 pt-2 text-xs font-medium transition-colors ${
              tab === 'manage'
                ? 'border-[var(--color-accent-primary)] text-[var(--color-text-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            All Files ({files.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('import')}
            className={`border-b-2 pb-2.5 pt-2 text-xs font-medium transition-colors ${
              tab === 'import'
                ? 'border-[var(--color-accent-primary)] text-[var(--color-text-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            Import
          </button>
        </div>

        {/* Tab 1: Create File */}
        {tab === 'create' && (
          <form onSubmit={handleCreate}>
            <div className="space-y-4 p-5">
              {/* File Name & Extension Input Group */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                  File name
                </label>
                <div className="flex items-center overflow-hidden rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] focus-within:border-[var(--color-accent-primary)]">
                  <input
                    autoFocus
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="schema-name"
                    className="h-8 flex-1 bg-transparent px-3 font-mono text-xs text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
                  />
                  <div className="flex items-center border-l border-[var(--color-border-subtle)] p-0.5">
                    {(['.dbml', '.sql', '.json'] as const).map((ext) => {
                      const isSelected = selectedExtension === ext;
                      return (
                        <button
                          key={ext}
                          type="button"
                          onClick={() => setSelectedExtension(ext)}
                          className={`rounded px-2 py-0.5 font-mono text-[11px] transition-colors ${
                            isSelected
                              ? 'bg-[var(--color-bg-tertiary)] font-medium text-[var(--color-text-primary)]'
                              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                          }`}
                        >
                          {ext}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Starter Template Grid */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                  Starter template
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map((tmpl) => {
                    const isSelected = selectedTemplate === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => setSelectedTemplate(tmpl.id)}
                        className={`flex items-start gap-2.5 rounded-md border p-2.5 text-left transition-colors ${
                          isSelected
                            ? 'border-[var(--color-accent-primary)] bg-[var(--color-selection)] text-[var(--color-text-primary)]'
                            : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] text-[var(--color-text-muted)] hover:border-[var(--color-border-default)] hover:text-[var(--color-text-secondary)]'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          <Mark
                            name={tmpl.mark}
                            className={`h-3.5 w-3.5 ${
                              isSelected
                                ? 'text-[var(--color-accent-primary)]'
                                : 'text-[var(--color-text-muted)]'
                            }`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-[var(--color-text-primary)]">
                            {tmpl.name}
                          </div>
                          <div className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">
                            {tmpl.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-app)]/40 px-5 py-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-7 rounded px-3 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAtLimit}
                className="flex h-7 items-center gap-1.5 rounded bg-[var(--color-accent-primary)] px-3 text-xs font-medium text-white shadow-xs transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Mark name="plus" className="h-3 w-3" />
                Create File
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Manage Files */}
        {tab === 'manage' && (
          <div className="space-y-3 p-5">
            <div className="divide-y divide-[var(--color-border-subtle)] rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)]">
              {files.map((file) => {
                const isActive = activeFileId === file.id;
                const isRenaming = renamingId === file.id;

                return (
                  <div
                    key={file.id}
                    className="flex items-center justify-between px-3 py-2.5 transition-colors hover:bg-[var(--color-bg-tertiary)]/30"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <Mark
                        name={
                          file.name.endsWith('.json')
                            ? 'json'
                            : file.name.endsWith('.sql')
                              ? 'database'
                              : 'fileCode'
                        }
                        className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent-primary)]"
                      />

                      <div className="min-w-0 flex-1">
                        {isRenaming ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (renameValue.trim() && onRenameFile) {
                                    onRenameFile(file.id, renameValue.trim());
                                  }
                                  setRenamingId(null);
                                }
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                              className="h-6 w-44 rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-2 font-mono text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)]"
                            />
                            <button
                              type="button"
                              className="h-6 rounded bg-[var(--color-bg-tertiary)] px-2 text-[11px] text-[var(--color-text-primary)] hover:bg-[var(--color-border-default)]"
                              onClick={() => {
                                if (renameValue.trim() && onRenameFile) {
                                  onRenameFile(file.id, renameValue.trim());
                                }
                                setRenamingId(null);
                              }}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="h-6 px-1.5 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                              onClick={() => setRenamingId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="truncate font-mono text-xs text-[var(--color-text-primary)]">
                              {file.name}
                            </span>
                            {isActive && (
                              <span className="rounded bg-[var(--color-accent-primary)]/15 px-1.5 py-0.2 font-mono text-[9px] font-medium text-[var(--color-accent-primary)]">
                                active
                              </span>
                            )}
                          </div>
                        )}
                        <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                          {countLines(file.rawText)} lines
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 ml-2">
                      {!isActive && (
                        <button
                          type="button"
                          className="h-6 rounded px-2 text-[11px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
                          onClick={() => {
                            onSelectFile(file.id);
                            onOpenChange(false);
                          }}
                        >
                          Open
                        </button>
                      )}
                      <button
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
                        title="Rename"
                        onClick={() => {
                          setRenamingId(file.id);
                          setRenameValue(file.name);
                        }}
                      >
                        <Mark name="pencil" className="h-3 w-3" />
                      </button>
                      {files.length > 1 && onDeleteFile && (
                        <button
                          type="button"
                          className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-accent-danger)]"
                          title="Delete"
                          onClick={() => onDeleteFile(file.id)}
                        >
                          <Mark name="trash" className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {isAtLimit && (
              <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-2.5 text-[11px] text-amber-200">
                <p className="font-medium">File limit reached ({files.length} of {effectiveMaxFiles} files)</p>
                <p className="mt-0.5 text-[10px] text-amber-300/80">
                  {tier === 'LOCAL'
                    ? 'Self-hosted local mode limit reached. Delete a file to add another, or configure Cloud in .env.'
                    : tier === 'FREE'
                    ? 'Cloud Free limit reached (15 files). Delete a file or upgrade to Pro for unlimited files.'
                    : 'Pro workspace file limit reached.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Import */}
        {tab === 'import' && (
          <div className="p-5">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-app)] px-6 py-9 text-center transition-colors hover:border-[var(--color-accent-primary)]/70"
            >
              <Mark name="upload" className="mb-2 h-6 w-6 text-[var(--color-text-muted)]" />
              <div className="text-xs font-medium text-[var(--color-text-primary)]">
                Drop your schema file here
              </div>
              <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                Supports .dbml, .sql (DDL), .json (AST), or .txt
              </div>

              <div className="mt-4">
                <label>
                  <input
                    type="file"
                    accept=".dbml,.sql,.json,.txt"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <button
                    type="button"
                    className="h-7 rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] px-3 text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                    onClick={(e) => {
                      const input = (e.currentTarget.parentElement?.querySelector(
                        'input[type="file"]',
                      ) as HTMLInputElement);
                      input?.click();
                    }}
                  >
                    Browse file
                  </button>
                </label>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
