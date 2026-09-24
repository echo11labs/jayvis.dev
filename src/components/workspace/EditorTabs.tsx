'use client';

import { Codicon } from '@/components/ui/codicon';
import type { CanvasView } from '@/components/workspace/Toolbar';

interface EditorTabsProps {
  activeView: CanvasView;
  onChangeView: (view: CanvasView) => void;
}

export function EditorTabs({ activeView, onChangeView }: EditorTabsProps) {
  return (
    <div className="flex h-9 shrink-0 items-stretch border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-tabbar)]">
      <button
        type="button"
        onClick={() => onChangeView('dbml')}
        className={`flex items-center gap-1.5 px-3 text-[13px] ${
          activeView === 'dbml' || activeView === 'split'
            ? 'bg-[var(--color-bg-editor)] text-[var(--color-text-primary)]'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
        }`}
      >
        <Codicon name="fileCode" />
        schema.dbml
      </button>
      <button
        type="button"
        onClick={() => onChangeView('erd')}
        className={`flex items-center gap-1.5 px-3 text-[13px] ${
          activeView === 'erd'
            ? 'bg-[var(--color-bg-editor)] text-[var(--color-text-primary)]'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
        }`}
      >
        <Codicon name="type" />
        schema.erd
      </button>
      <div className="ml-auto flex items-center px-1">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('jayvis:editor-find'))}
          className="flex h-7 w-7 items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-bg-app)] hover:text-[var(--color-text-primary)]"
          title="Find (⌘F)"
        >
          <Codicon name="search" />
        </button>
        <button
          type="button"
          onClick={() => onChangeView(activeView === 'split' ? 'dbml' : 'split')}
          className={`flex h-7 w-7 items-center justify-center ${
            activeView === 'split'
              ? 'bg-[var(--color-bg-app)] text-[var(--color-text-primary)]'
              : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-app)] hover:text-[var(--color-text-primary)]'
          }`}
          title="Split Editor (⌘\\)"
        >
          <Codicon name="split" />
        </button>
      </div>
    </div>
  );
}
