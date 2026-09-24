import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  type Completion,
  type CompletionContext,
  type CompletionSource,
} from '@codemirror/autocomplete';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  toggleComment,
} from '@codemirror/commands';
import {
  HighlightStyle,
  StreamLanguage,
  bracketMatching,
  codeFolding,
  foldGutter,
  foldKeymap,
  foldService,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
} from '@codemirror/language';
import { linter, lintGutter, lintKeymap, type Diagnostic as CmDiagnostic } from '@codemirror/lint';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { createStudioSearchPanel } from './search-panel';
import { EditorState } from '@codemirror/state';
import {
  EditorView,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  placeholder,
} from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import type { DatabaseAST } from '@/types/ast';
import type { ValidationIssue } from '@/lib/validation/schema-validation';
import type { CompletionKind } from './dbml-language';
import { classifyWord, completeDbml, lintDbml } from './dbml-language';

export type EditorFontSize = 12 | 13 | 14;
export type EditorFontWeight = 400 | 500 | 600;

const TOKEN_STYLE: Record<ReturnType<typeof classifyWord>, string> = {
  keyword: 'keyword',
  type: 'type',
  setting: 'attribute',
  ident: 'variableName',
  comment: 'comment',
  string: 'string',
  number: 'number',
  punct: 'punctuation',
  space: '',
};

const COMPLETION_TYPE: Record<CompletionKind, string> = {
  keyword: 'keyword',
  type: 'type',
  table: 'class',
  column: 'property',
  setting: 'constant',
  snippet: 'function',
};

export const dbmlLanguage = StreamLanguage.define<{ inBlockComment: boolean }>({
  name: 'dbml',
  startState: () => ({ inBlockComment: false }),
  token(stream, state) {
    if (state.inBlockComment) {
      if (stream.match(/.*?\*\//)) state.inBlockComment = false;
      else stream.skipToEnd();
      return 'comment';
    }

    if (stream.match('//')) {
      stream.skipToEnd();
      return 'comment';
    }

    if (stream.match('/*')) {
      state.inBlockComment = !stream.match(/.*?\*\//);
      if (state.inBlockComment) stream.skipToEnd();
      return 'comment';
    }

    const quote = stream.peek();
    if (quote === "'" || quote === '"') {
      stream.next();
      while (!stream.eol()) {
        if (stream.peek() === '\\') {
          stream.next();
          stream.next();
          continue;
        }
        if (stream.next() === quote) break;
      }
      return 'string';
    }

    if (stream.eatSpace()) return null;
    if (stream.match(/[0-9]+(\.[0-9]+)?/)) return 'number';
    if (stream.match(/[{}\[\]()<>:,.\-]/)) return 'punctuation';
    if (stream.match(/[A-Za-z_][A-Za-z0-9_]*/)) {
      return TOKEN_STYLE[classifyWord(stream.current())];
    }
    stream.next();
    return 'punctuation';
  },
  languageData: {
    commentTokens: { line: '//', block: { open: '/*', close: '*/' } },
    closeBrackets: { brackets: ['(', '[', '{', "'", '"'] },
    indentOnInput: /^\s*[}\]]$/,
  },
});

export const dbmlHighlight = HighlightStyle.define([
  { tag: t.keyword, color: 'var(--color-accent-info)', fontWeight: '600' },
  { tag: t.typeName, color: 'var(--color-accent-success)' },
  { tag: t.string, color: 'var(--color-accent-warning)' },
  { tag: t.comment, color: 'var(--color-text-muted)', fontStyle: 'italic' },
  { tag: t.attributeName, color: 'var(--color-accent-primary)' },
  { tag: t.number, color: 'var(--color-accent-danger)' },
  { tag: t.variableName, color: 'var(--color-text-secondary)' },
  { tag: t.punctuation, color: 'var(--color-text-muted)' },
]);

function applyInsert(insert: string, kind: CompletionKind): Completion['apply'] {
  if (kind !== 'snippet') return insert;
  const nameAt = insert.indexOf('name');
  const columnAt = insert.indexOf('column');
  const selectAt = nameAt >= 0 ? nameAt : columnAt;
  const selectLen = nameAt >= 0 ? 4 : 6;
  return (view, _completion, from, to) => {
    view.dispatch({
      changes: { from, to, insert },
      selection:
        selectAt >= 0
          ? { anchor: from + selectAt, head: from + selectAt + selectLen }
          : { anchor: from + insert.length },
    });
  };
}

export function dbmlCompletionSource(getAst: () => DatabaseAST): CompletionSource {
  return (context: CompletionContext) => {
    const { from, options } = completeDbml(
      context.state.doc.toString(),
      context.pos,
      getAst(),
    );
    if (!options.length) return null;
    return {
      from,
      options: options.map((item) => ({
        label: item.label,
        type: COMPLETION_TYPE[item.kind],
        detail: item.detail,
        apply: applyInsert(item.insert, item.kind),
      })),
    };
  };
}

export function dbmlLinter(
  getLint: () => {
    errorMessage: string | null;
    errorLine?: number | null;
    issues: ValidationIssue[];
  },
) {
  return linter(
    (view) => {
      const { errorMessage, errorLine, issues } = getLint();
      return lintDbml(
        view.state.doc.toString(),
        errorMessage,
        issues,
        errorLine,
      ).map(
        (item): CmDiagnostic => ({
          from: item.from,
          to: item.to,
          severity: item.severity,
          message: item.message,
          source: item.source,
        }),
      );
    },
    { delay: 200 },
  );
}

export function dbmlFoldService(
  state: EditorState,
  lineStart: number,
): { from: number; to: number } | null {
  const line = state.doc.lineAt(lineStart);
  const openAt = line.text.lastIndexOf('{');
  if (openAt < 0) return null;
  const from = line.from + openAt + 1;
  let depth = 1;
  for (let i = from; i < state.doc.length; i += 1) {
    const ch = state.doc.sliceString(i, i + 1);
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return i > from ? { from, to: i } : null;
    }
  }
  return null;
}

export function wrapExtension(enabled: boolean) {
  return enabled ? EditorView.lineWrapping : [];
}

export function gutterExtension(showLineNumbers: boolean) {
  return [
    ...(showLineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : []),
    foldGutter(),
    lintGutter(),
  ];
}

export function editorFontTheme(
  fontSize: EditorFontSize,
  fontWeight: EditorFontWeight,
  ligatures: boolean,
) {
  return EditorView.theme({
    '&': {
      height: '100%',
      fontSize: `${fontSize}px`,
      fontWeight: String(fontWeight),
      fontFamily:
        'var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      backgroundColor: 'var(--color-bg-editor)',
      color: 'var(--color-text-primary)',
    },
    '.cm-scroller': {
      fontFamily: 'inherit',
      lineHeight: '1.6',
    },
    '.cm-content': {
      fontFamily: 'inherit',
      fontWeight: 'inherit',
      caretColor: 'var(--color-accent-info)',
      fontFeatureSettings: ligatures ? '"calt" 1, "liga" 1' : '"calt" 0, "liga" 0',
      fontVariantLigatures: ligatures ? 'contextual' : 'none',
      lineHeight: '1.6',
      padding: '12px 0',
      tabSize: '2',
    },
    '.cm-line': {
      minHeight: '1.6em',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--color-bg-editor)',
      borderRight: '1px solid var(--color-border-subtle)',
      color: 'var(--color-text-muted)',
      fontFamily: 'inherit',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'color-mix(in srgb, var(--color-bg-panel) 70%, transparent)',
    },
    '.cm-activeLine': {
      backgroundColor: 'color-mix(in srgb, var(--color-bg-panel) 40%, transparent)',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor:
        'color-mix(in srgb, var(--color-accent-primary) 25%, transparent) !important',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: 'var(--color-accent-info)',
    },
    '.cm-placeholder': {
      color: 'var(--color-text-muted)',
    },
    '.cm-matchingBracket': {
      backgroundColor: 'color-mix(in srgb, var(--color-accent-info) 22%, transparent)',
      outline: '1px solid var(--color-accent-info)',
    },
    '.cm-nonmatchingBracket': {
      backgroundColor: 'color-mix(in srgb, var(--color-accent-danger) 22%, transparent)',
    },
    '.cm-selectionMatch': {
      backgroundColor: 'color-mix(in srgb, var(--color-accent-warning) 22%, transparent)',
    },
    '.cm-foldGutter span': {
      color: 'var(--color-text-muted)',
    },
    '.cm-panels': {
      backgroundColor: 'var(--color-bg-panel)',
      color: 'var(--color-text-primary)',
      borderBottom: '1px solid var(--color-border-subtle)',
    },
    '.jv-find': {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '8px 10px 10px',
      backgroundColor: 'var(--color-bg-panel)',
      fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
    },
    '.jv-find-row': {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    },
    '.jv-find-head': {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    '.jv-find-input': {
      minWidth: '0',
      flex: '1',
      height: '28px',
      borderRadius: '6px',
      border: '1px solid var(--color-border-subtle)',
      backgroundColor: 'var(--color-bg-app)',
      color: 'var(--color-text-primary)',
      padding: '0 10px',
      fontSize: '12px',
      outline: 'none',
    },
    '.jv-find-input:focus': {
      borderColor: 'var(--color-accent-primary)',
    },
    '.jv-find-actions': {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px',
    },
    '.jv-find-btn': {
      height: '28px',
      borderRadius: '6px',
      border: '1px solid var(--color-border-subtle)',
      backgroundColor: 'transparent',
      color: 'var(--color-text-secondary)',
      padding: '0 10px',
      fontSize: '12px',
      cursor: 'pointer',
    },
    '.jv-find-btn:hover': {
      backgroundColor: 'var(--color-bg-tertiary)',
      color: 'var(--color-text-primary)',
    },
    '.jv-find-toggle[aria-pressed="true"]': {
      borderColor: 'var(--color-accent-primary)',
      backgroundColor: 'color-mix(in srgb, var(--color-accent-primary) 18%, transparent)',
      color: 'var(--color-text-primary)',
    },
    '.jv-find-close': {
      width: '28px',
      flex: 'none',
      padding: '0',
      fontSize: '16px',
      lineHeight: '1',
    },
    '.cm-searchMatch': {
      backgroundColor: 'color-mix(in srgb, var(--color-accent-warning) 32%, transparent)',
    },
    '.cm-searchMatch-selected': {
      backgroundColor: 'color-mix(in srgb, var(--color-accent-primary) 42%, transparent)',
    },
    '.cm-panels-bottom': {
      borderTop: '1px solid var(--color-border-subtle)',
      borderBottom: 'none',
    },
    '.cm-search': {
      fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
      fontSize: '11px',
      padding: '6px 8px',
    },
    '.cm-textfield': {
      backgroundColor: 'var(--color-bg-app)',
      border: '1px solid var(--color-border-subtle)',
      color: 'var(--color-text-primary)',
      borderRadius: '4px',
      padding: '2px 6px',
    },
    '.cm-button': {
      background: 'var(--color-bg-app)',
      border: '1px solid var(--color-border-subtle)',
      color: 'var(--color-text-secondary)',
      borderRadius: '4px',
    },
    '.cm-tooltip': {
      backgroundColor: 'var(--color-bg-app)',
      border: '1px solid var(--color-border-subtle)',
      color: 'var(--color-text-primary)',
      fontFamily: 'inherit',
      fontSize: '11px',
      boxShadow: '0 10px 30px rgb(0 0 0 / 0.28)',
    },
    '.cm-tooltip-autocomplete > ul': {
      maxHeight: '240px',
      fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: 'var(--color-bg-tertiary)',
      color: 'var(--color-text-primary)',
    },
    '.cm-completionLabel': {
      fontFamily: 'inherit',
    },
    '.cm-completionDetail': {
      color: 'var(--color-text-muted)',
      fontStyle: 'normal',
    },
  });
}

export function dbmlEditorExtensions(options: {
  getAst: () => DatabaseAST;
  getLint: () => {
    errorMessage: string | null;
    errorLine?: number | null;
    issues: ValidationIssue[];
  };
}) {
  return [
    dbmlLanguage,
    syntaxHighlighting(dbmlHighlight),
    history(),
    drawSelection(),
    dropCursor(),
    highlightSpecialChars(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    codeFolding(),
    foldService.of(dbmlFoldService),
    highlightActiveLine(),
    highlightSelectionMatches(),
    search({ top: true, createPanel: createStudioSearchPanel }),
    indentUnit.of('  '),
    EditorState.tabSize.of(2),
    placeholder('// Write DBML here…'),
    EditorView.contentAttributes.of({
      role: 'presentation',
      'aria-hidden': 'true',
    }),
    autocompletion({
      override: [dbmlCompletionSource(options.getAst)],
      activateOnTyping: true,
      icons: true,
    }),
    dbmlLinter(options.getLint),
    keymap.of([
      { key: 'Mod-/', run: toggleComment },
      ...closeBracketsKeymap,
      ...completionKeymap,
      ...lintKeymap,
      ...foldKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...defaultKeymap,
      indentWithTab,
    ]),
  ];
}
