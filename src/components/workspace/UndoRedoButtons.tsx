'use client';

import { Undo2, Redo2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDiagramStore } from '@/store/diagram-store';

/** Undo/redo button pair with live disabled state from the history stacks. */
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
            className="flex h-8 w-7 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
            title="Undo (⌘Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
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
            className="flex h-8 w-7 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
            title="Redo (⌘⇧Z)"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Redo ({redoStack.length} available)
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
