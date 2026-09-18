'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Optional parse-error message shown as a footer banner. */
  errorMessage?: string | null;
}

/**
 * Lightweight DBML code editor.
 *
 * Uses a synchronized textarea + line-number gutter instead of CodeMirror
 * to keep the client bundle small (the heavy @codemirror/* dependency
 * tree was causing Turbopack to OOM in this memory-constrained sandbox).
 * All real parsing still happens server-side via the DBML mini-service.
 */
export function CodeEditor({ value, onChange, errorMessage }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [lineCount, setLineCount] = useState(1);

  // Recompute line numbers whenever the document changes.
  useEffect(() => {
    const lines = value.split('\n').length;
    setLineCount(lines);
  }, [value]);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Tab inserts two spaces instead of moving focus.
      if (e.key === 'Tab') {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const next = value.slice(0, start) + '  ' + value.slice(end);
        onChange(next);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 2;
        });
      }
      // Auto-indent on Enter.
      if (e.key === 'Enter') {
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const currentLine = value.slice(lineStart, start);
        const indent = currentLine.match(/^[ \t]*/)?.[0] ?? '';
        if (indent) {
          e.preventDefault();
          const insert = '\n' + indent;
          const next = value.slice(0, start) + insert + value.slice(ta.selectionEnd);
          onChange(next);
          requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = start + insert.length;
          });
        }
      }
    },
    [value, onChange],
  );

  const lines = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[#0a0a0a]">
      {/* Line-number gutter */}
      <div
        ref={gutterRef}
        className="flex-shrink-0 select-none overflow-hidden border-r border-zinc-800/80 bg-[#0a0a0a] py-3 pl-3 pr-2 text-right font-mono text-[13px] leading-[20px] text-zinc-600"
        style={{ minWidth: '3rem' }}
        aria-hidden="true"
      >
        {lines.map((n) => (
          <div key={n} className="h-[20px]">
            {n}
          </div>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        wrap="off"
        className="flex-1 resize-none overflow-auto bg-transparent py-3 px-3 font-mono text-[13px] leading-[20px] text-zinc-200 outline-none placeholder:text-zinc-700 caret-indigo-400 selection:bg-indigo-500/30"
        style={{ tabSize: 2 }}
        placeholder="// Write DBML here…"
      />

      {errorMessage && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 border-t border-rose-500/30 bg-rose-950/90 px-3 py-2 text-[11px] font-mono text-rose-300 backdrop-blur-sm">
          <span className="font-bold text-rose-400">Parse Error: </span>
          {errorMessage}
        </div>
      )}
    </div>
  );
}
