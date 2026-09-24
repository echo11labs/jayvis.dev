import type { ReactNode } from 'react';
import type { IconName } from '@/lib/ui/icons';

export type MarkName =
  | 'table'
  | 'key'
  | 'link'
  | 'error'
  | 'warning'
  | 'info'
  | 'layout'
  | 'search'
  | 'plus'
  | 'close'
  | 'copy'
  | 'check'
  | 'download'
  | 'upload'
  | 'play'
  | 'trash'
  | 'chevronDown'
  | 'chevronRight'
  | 'chevronUp'
  | 'arrowUp'
  | 'arrowDown'
  | 'arrowLeft'
  | 'arrowRight'
  | 'loading'
  | 'note'
  | 'pencil'
  | 'undo'
  | 'redo'
  | 'settings'
  | 'palette'
  | 'keyboard'
  | 'camera'
  | 'hash'
  | 'type'
  | 'unique'
  | 'increment'
  | 'equal'
  | 'maximize'
  | 'split'
  | 'file'
  | 'folder'
  | 'fileCode'
  | 'json'
  | 'code'
  | 'image'
  | 'database'
  | 'terminal'
  | 'pass'
  | 'shield'
  | 'diff'
  | 'circle';

const PATHS: Record<MarkName, ReactNode> = {
  table: <path d="M2.5 3.5h11v9h-11zM2.5 6.5h11M6.5 6.5v6" />,
  key: (
    <>
      <circle cx="6" cy="8" r="2.2" />
      <path d="M8 8h5.5l1.2 1.2-1.2 1.2H12" />
    </>
  ),
  link: <path d="M6.2 9.8 4.5 11.5a2.2 2.2 0 0 1-3.1-3.1L3.1 6.7m6.7-.5 1.7-1.7a2.2 2.2 0 1 1 3.1 3.1L12.9 9.3M6.4 9.6l3.2-3.2" />,
  error: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5v4M8 11.2h.01" />
    </>
  ),
  warning: <path d="M8 2.5 14.5 13.5H1.5L8 2.5ZM8 7v3M8 11.5h.01" />,
  info: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 7.2v4M8 5.2h.01" />
    </>
  ),
  layout: <path d="M2.5 2.5h5v5h-5zM8.5 2.5h5v11h-5zM2.5 8.5h5v5h-5z" />,
  search: (
    <>
      <circle cx="7" cy="7" r="3.5" />
      <path d="m10 10 3 3" />
    </>
  ),
  plus: <path d="M8 3.5v9M3.5 8h9" />,
  close: <path d="m4 4 8 8M12 4 4 12" />,
  copy: <path d="M5.5 5.5h7v8h-7zM3.5 3.5h7v2" />,
  check: <path d="m3.5 8.2 3 3 6-6.5" />,
  download: <path d="M8 3v8M5 8.5 8 11.5 11 8.5M3.5 13h9" />,
  upload: <path d="M8 13V5M5 7.5 8 4.5 11 7.5M3.5 13h9" />,
  play: <path d="M5.5 3.5v9L13 8z" />,
  trash: <path d="M3.5 5h9M6 5V3.5h4V5M5 5l.6 8h4.8L11 5" />,
  chevronDown: <path d="m4 6.5 4 4 4-4" />,
  chevronRight: <path d="m6.5 4 4 4-4 4" />,
  chevronUp: <path d="m4 9.5 4-4 4 4" />,
  arrowUp: <path d="M8 12.5V3.5M4.5 7 8 3.5 11.5 7" />,
  arrowDown: <path d="M8 3.5v9M4.5 9 8 12.5 11.5 9" />,
  arrowLeft: <path d="M12.5 8h-9M7 4.5 3.5 8 7 11.5" />,
  arrowRight: <path d="M3.5 8h9M9 4.5 12.5 8 9 11.5" />,
  loading: <path d="M8 2.5a5.5 5.5 0 1 1-5.2 3.7" />,
  note: <path d="M4 3.5h6.5L12.5 5.5V13H4zM10.5 3.5V5.5h2" />,
  pencil: <path d="M9.5 3.5 12.5 6.5 6 13H3v-3zM8.2 4.8l3 3" />,
  undo: <path d="M5 7H2.5V4.5M2.8 7A5.5 5.5 0 1 1 4 12" />,
  redo: <path d="M11 7h2.5V4.5M13.2 7A5.5 5.5 0 1 0 12 12" />,
  settings: (
    <>
      <circle cx="8" cy="8" r="2" />
      <path d="M8 2.5v1.6M8 11.9v1.6M2.5 8h1.6M11.9 8h1.6M4.1 4.1l1.1 1.1M10.8 10.8l1.1 1.1M11.9 4.1l-1.1 1.1M5.2 10.8 4.1 11.9" />
    </>
  ),
  palette: (
    <>
      <path d="M8 2.5a5.5 5.5 0 1 0 0 11 1.6 1.6 0 0 0 1.2-2.6 1.6 1.6 0 0 1 1.2-2.7H12A4.5 4.5 0 0 0 8 2.5Z" />
      <circle cx="6" cy="6" r=".7" fill="currentColor" stroke="none" />
      <circle cx="9.2" cy="5.6" r=".7" fill="currentColor" stroke="none" />
      <circle cx="5.4" cy="8.6" r=".7" fill="currentColor" stroke="none" />
    </>
  ),
  keyboard: <path d="M2.5 5h11v6h-11zM5 8h.01M8 8h.01M11 8h.01M5.5 10.2h5" />,
  camera: (
    <>
      <path d="M3 5.5h2l1-1.5h4l1 1.5h2v7H3z" />
      <circle cx="8" cy="8.5" r="2" />
    </>
  ),
  hash: <path d="m6 3.5-.8 9M10.8 3.5 10 12.5M3.5 6.5h9M3.2 9.5h9" />,
  type: <path d="M3.5 4.5h9M8 4.5v7M5.5 11.5h5" />,
  unique: <path d="M5 4.5h6l1.5 3L8 13 3.5 7.5z" />,
  increment: <path d="M8 12V4M5 7l3-3 3 3" />,
  equal: <path d="M4 6.2h8M4 9.8h8" />,
  maximize: <path d="M3.5 3.5h4v1.5H5v2.5H3.5zM8.5 3.5h4V5H11v2.5H8.5zM3.5 8.5H5V11h2.5v1.5h-4zM11 8.5h1.5v4H8.5V11H11z" />,
  split: <path d="M2.5 3.5h5v9h-5zM8.5 3.5h5v9h-5z" />,
  file: <path d="M5 2.5h4.5L12 5v8.5H5zM9.5 2.5V5H12" />,
  folder: <path d="M2.5 4.5h4l1.2 1.5H13.5v6H2.5z" />,
  fileCode: <path d="M5 2.5h4.5L12 5v8.5H5zM6.5 8.5 5.2 10 6.5 11.5M9.5 8.5 10.8 10 9.5 11.5" />,
  json: <path d="M6 3.5H4.5A2 2 0 0 0 4 7.4 2 2 0 0 0 4.5 12.5H6M10 3.5h1.5A2 2 0 0 1 12 7.4a2 2 0 0 1-.5 5.1H10" />,
  code: <path d="m5.5 5-2.5 3 2.5 3M10.5 5l2.5 3-2.5 3" />,
  image: (
    <>
      <path d="M2.5 3.5h11v9h-11z" />
      <path d="m2.8 11.2 3.2-3.2 2.2 2.2 1.6-1.6 3.4 2.6" />
      <circle cx="6" cy="6.2" r="1" />
    </>
  ),
  database: (
    <>
      <ellipse cx="8" cy="4.2" rx="5" ry="1.7" />
      <path d="M3 4.2v7.6c0 .9 2.2 1.7 5 1.7s5-.8 5-1.7V4.2" />
    </>
  ),
  terminal: <path d="M2.5 3.5h11v9h-11zM4.5 6.5 6.5 8 4.5 9.5M8 9.5h3" />,
  pass: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="m5.2 8.1 1.9 1.9 3.7-4" />
    </>
  ),
  shield: <path d="M8 2.5 13 4.5v4.2c0 2.8-2.1 4.4-5 5.3-2.9-.9-5-2.5-5-5.3V4.5z" />,
  diff: <path d="M4 3.5h8M4 6.5h5M4 9.5h8M4 12.5h5M12 9v4M10 11h4" />,
  circle: <circle cx="8" cy="8" r="2.2" fill="currentColor" stroke="none" />,
};

const ICON_TO_MARK: Record<IconName, MarkName> = {
  explorer: 'folder',
  outline: 'table',
  references: 'link',
  settings: 'settings',
  file: 'file',
  fileCode: 'fileCode',
  folder: 'folder',
  table: 'table',
  search: 'search',
  split: 'split',
  error: 'error',
  warning: 'warning',
  info: 'info',
  check: 'check',
  close: 'close',
  plus: 'plus',
  trash: 'trash',
  copy: 'copy',
  arrowUp: 'arrowUp',
  arrowDown: 'arrowDown',
  arrowLeft: 'arrowLeft',
  arrowRight: 'arrowRight',
  chevronDown: 'chevronDown',
  chevronRight: 'chevronRight',
  chevronUp: 'chevronUp',
  loading: 'loading',
  undo: 'undo',
  redo: 'redo',
  theme: 'palette',
  desktop: 'layout',
  palette: 'palette',
  keyboard: 'keyboard',
  database: 'database',
  download: 'download',
  upload: 'upload',
  terminal: 'terminal',
  key: 'key',
  link: 'link',
  hash: 'hash',
  shield: 'shield',
  pencil: 'pencil',
  note: 'note',
  layout: 'layout',
  maximize: 'maximize',
  camera: 'camera',
  play: 'play',
  pass: 'pass',
  type: 'type',
  image: 'image',
  symbolClass: 'table',
  json: 'json',
  code: 'code',
  diff: 'diff',
  remove: 'close',
  circle: 'circle',
  unique: 'unique',
  equal: 'equal',
  increment: 'increment',
};

interface MarkProps {
  name: MarkName;
  title?: string;
  className?: string;
  spin?: boolean;
}

export function Mark({ name, title, className, spin }: MarkProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={`inline-block shrink-0${spin ? ' animate-spin' : ''}${className ? ` ${className}` : ''}`}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}

export function markFromIcon(name: IconName): MarkName {
  return ICON_TO_MARK[name];
}
