'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Annotation, Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { forceLinting } from '@codemirror/lint';
import { gotoLine, openSearchPanel } from '@codemirror/search';
import { useDiagramStore } from '@/store/diagram-store';
import { validateSchema } from '@/lib/validation/schema-validation';
import {
  dbmlEditorExtensions,
  editorFontTheme,
  gutterExtension,
  wrapExtension,
} from '@/lib/editor/dbml-codemirror';
import { sanitizeDbmlText } from '@/lib/parser/dbml';
import type {
  EditorFontSize,
  EditorFontWeight,
} from '@/hooks/use-workspace-settings';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  errorMessage?: string | null;
  errorLine?: number | null;
  wordWrap?: boolean;
  lineNumbers?: boolean;
  fontSize?: EditorFontSize;
  fontWeight?: EditorFontWeight;
  fontLigatures?: boolean;
}

const ExternalChange = Annotation.define<boolean>();

export function CodeEditor({
  value,
  onChange,
  errorMessage,
  errorLine,
  wordWrap = true,
  lineNumbers = true,
  fontSize = 13,
  fontWeight = 400,
  fontLigatures = true,
}: CodeEditorProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const wrapComp = useRef(new Compartment());
  const gutterComp = useRef(new Compartment());
  const fontComp = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  const astRef = useRef(useDiagramStore.getState().ast);
  const lintRef = useRef({
    errorMessage: errorMessage ?? null,
    errorLine,
    issues: validateSchema(useDiagramStore.getState().ast),
  });
  const ast = useDiagramStore((s) => s.ast);
  const issues = useMemo(() => validateSchema(ast), [ast]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    astRef.current = ast;
  }, [ast]);

  useEffect(() => {
    lintRef.current = {
      errorMessage: errorMessage ?? null,
      errorLine,
      issues,
    };
  }, [errorMessage, errorLine, issues]);

  useEffect(() => {
    const cleaned = sanitizeDbmlText(value);
    if (cleaned !== value) onChangeRef.current(cleaned);
  }, [value]);

  useEffect(() => {
    if (!parentRef.current) return;

    const view = new EditorView({
      parent: parentRef.current,
      state: EditorState.create({
        doc: sanitizeDbmlText(value),
        extensions: [
          ...dbmlEditorExtensions({
            getAst: () => astRef.current,
            getLint: () => lintRef.current,
          }),
          wrapComp.current.of(wrapExtension(wordWrap)),
          gutterComp.current.of(gutterExtension(lineNumbers)),
          fontComp.current.of(editorFontTheme(fontSize, fontWeight, fontLigatures)),
          EditorView.updateListener.of((update) => {
            if (update.selectionSet) {
              const head = update.state.selection.main.head;
              const line = update.state.doc.lineAt(head);
              window.dispatchEvent(
                new CustomEvent('jayvis:editor-cursor', {
                  detail: { line: line.number, col: head - line.from + 1 },
                }),
              );
            }
            if (
              update.docChanged &&
              !update.transactions.some((tr) => tr.annotation(ExternalChange))
            ) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
        ],
      }),
    });
    viewRef.current = view;
    const host = parentRef.current;
    let fixing = false;
    const hideClipboardFields = () => {
      if (fixing) return;
      fixing = true;
      host.querySelectorAll('textarea').forEach((node) => {
        if (node.closest('.cm-content')) return;
        node.setAttribute('aria-hidden', 'true');
        node.setAttribute('tabindex', '-1');
      });
      host.querySelectorAll('.cm-content').forEach((node) => {
        node.setAttribute('aria-hidden', 'true');
        node.setAttribute('role', 'presentation');
        node.removeAttribute('aria-multiline');
        node.removeAttribute('aria-label');
      });
      fixing = false;
    };
    hideClipboardFields();
    const observer = new MutationObserver(hideClipboardFields);
    observer.observe(host, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const next = sanitizeDbmlText(value);
    const current = view.state.doc.toString();
    if (current === next) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: next },
      annotations: ExternalChange.of(true),
    });
  }, [value]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: wrapComp.current.reconfigure(wrapExtension(wordWrap)),
    });
  }, [wordWrap]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: gutterComp.current.reconfigure(gutterExtension(lineNumbers)),
    });
  }, [lineNumbers]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: fontComp.current.reconfigure(
        editorFontTheme(fontSize, fontWeight, fontLigatures),
      ),
    });
  }, [fontSize, fontWeight, fontLigatures]);

  useEffect(() => {
    if (viewRef.current) forceLinting(viewRef.current);
  }, [errorMessage, errorLine, issues]);

  useEffect(() => {
    const runFind = () => {
      const view = viewRef.current;
      if (view) openSearchPanel(view);
    };
    const runGoto = () => {
      const view = viewRef.current;
      if (view) gotoLine(view);
    };
    window.addEventListener('jayvis:editor-find', runFind);
    window.addEventListener('jayvis:editor-goto', runGoto);
    return () => {
      window.removeEventListener('jayvis:editor-find', runFind);
      window.removeEventListener('jayvis:editor-goto', runGoto);
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--color-bg-editor)]">
      <textarea
        readOnly
        tabIndex={-1}
        aria-label="DBML editor"
        value={sanitizeDbmlText(value)}
        className="pointer-events-none absolute h-px w-px overflow-hidden whitespace-pre opacity-0"
      />
      <div ref={parentRef} className="h-full w-full" />
    </div>
  );
}
