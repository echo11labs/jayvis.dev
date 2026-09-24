'use client';

import { Codicon } from '@/components/ui/codicon';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDiagramStore } from '@/store/diagram-store';

export function UndoRedoButtons() {
  const undoStack = useDiagramStore((s) => s.undoStack);
  const redoStack = useDiagramStore((s) => s.redoStack);
  const undo = useDiagramStore((s) => s.undo);
  const redo = useDiagramStore((s) => s.redo);

  return (
    <div className="flex items-center gap-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className="flex h-7 w-7 items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-bg-app)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-30"
            title="Undo (⌘Z)"
          >
            <Codicon name="undo" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Undo ({undoStack.length} available)
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className="flex h-7 w-7 items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-bg-app)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-30"
            title="Redo (⌘⇧Z)"
          >
            <Codicon name="redo" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Redo ({redoStack.length} available)
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
