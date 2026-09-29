'use client';

import { useEffect, useMemo, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDiagramStore } from '@/store/diagram-store';
import { applyTheme, useThemeName, THEME_OPTIONS } from '@/hooks/use-theme-state';
import {
  useWorkspaceSettings,
  type EditorFontSize,
  type EditorFontWeight,
} from '@/hooks/use-workspace-settings';
import type { SampleName } from '@/components/workspace/Toolbar';
import { Mark } from '@/lib/ui/marks';
import { summarizeValidation } from '@/lib/validation/schema-validation';
import { Disclosure } from '@/components/workspace/Disclosure';

export type LeftTab = 'files' | 'tables' | 'schema' | 'settings';

interface LeftPanelProps {
  workspaceName: string;
  onToggle: () => void;
  onSelectTable: (name: string) => void;
  onOpenSample: (name: SampleName) => void;
  onImport: () => void;
  onAddTable: () => void;
  onGenerateMigration: () => void;
}

const sampleNames: Array<{ name: SampleName; label: string }> = [
  { name: 'ecommerce', label: 'ecommerce' },
  { name: 'blog', label: 'blog' },
  { name: 'saas', label: 'saas' },
  { name: 'auth', label: 'auth' },
  { name: 'analytics', label: 'analytics' },
];

function cardinalityMark(value: string) {
  if (value === '1:1') return '1:1';
  if (value === 'N:M') return '*:*';
  return '1:*';
}

function EngineLabel() {
  const [label, setLabel] = useState('SQLite');
  useEffect(() => {
    const read = () => {
      setLabel(window.localStorage.getItem('jayvis-sql-engine') === 'postgres' ? 'PostgreSQL' : 'SQLite');
    };
    read();
    window.addEventListener('jayvis-sql-engine', read);
    return () => window.removeEventListener('jayvis-sql-engine', read);
  }, []);
  return <p className="mt-1 pl-6 text-[11px] text-[var(--color-text-muted)]">{label}</p>;
}

export function LeftPanel({
  workspaceName,
  onToggle,
  onSelectTable,
  onOpenSample,
  onImport,
  onAddTable,
  onGenerateMigration,
}: LeftPanelProps) {
  const ast = useDiagramStore((s) => s.ast);
  const selectedTable = useDiagramStore((s) => s.selectedTable);
  const theme = useThemeName();
  const [settings, updateSettings] = useWorkspaceSettings();
  const [searchOpen, setSearchOpen] = useState(false);
  const [open, setOpen] = useState({
    tables: true,
    relations: true,
    enums: false,
    groups: false,
    samples: false,
    views: true,
    settings: false,
  });
  const [query, setQuery] = useState('');
  const [headerTools, setHeaderTools] = useState(false);

  const tableEntries = useMemo(() => Object.entries(ast.tables), [ast.tables]);
  const references = useMemo(() => Object.values(ast.references), [ast.references]);
  const enums = useMemo(() => Object.values(ast.enums ?? {}), [ast.enums]);
  const groups = useMemo(() => Object.values(ast.tableGroups ?? {}), [ast.tableGroups]);
  const issues = useMemo(() => summarizeValidation(ast), [ast]);
  const q = query.trim().toLowerCase();
  const visibleTables = useMemo(
    () =>
      q
        ? tableEntries.filter(
            ([name, table]) =>
              name.toLowerCase().includes(q) ||
              table.fields.some((field) => field.name.toLowerCase().includes(q)),
          )
        : tableEntries,
    [q, tableEntries],
  );
  const visibleRefs = useMemo(
    () =>
      q
        ? references.filter(
            (ref) =>
              ref.sourceTable.toLowerCase().includes(q) ||
              ref.targetTable.toLowerCase().includes(q) ||
              ref.sourceField.toLowerCase().includes(q) ||
              ref.targetField.toLowerCase().includes(q),
          )
        : references,
    [q, references],
  );
  const visibleEnums = useMemo(
    () =>
      q
        ? enums.filter(
            (item) =>
              item.name.toLowerCase().includes(q) ||
              item.values.some((value) => value.name.toLowerCase().includes(q)),
          )
        : enums,
    [enums, q],
  );
  const visibleGroups = useMemo(
    () =>
      q
        ? groups.filter(
            (group) =>
              group.name.toLowerCase().includes(q) ||
              group.tables.some((name) => name.toLowerCase().includes(q)),
          )
        : groups,
    [groups, q],
  );

  const toggleSetting = (key: keyof typeof settings) => {
    updateSettings({ [key]: !settings[key] });
  };
  const toggleSection = (key: keyof typeof open) => {
    setOpen((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <aside
      className="flex h-full w-full flex-col bg-[var(--color-bg-panel)] text-[var(--color-text-primary)]"
      aria-label="Schema Explorer"
    >
      <div
        className="group flex h-8 shrink-0 items-center px-3"
        onMouseEnter={() => setHeaderTools(true)}
        onMouseLeave={() => setHeaderTools(false)}
        onFocus={() => setHeaderTools(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setHeaderTools(false);
        }}
      >
        <span className="text-[11px] text-[var(--color-text-muted)]">Schema Explorer</span>
        <button
          type="button"
          onClick={() => setSearchOpen((open) => !open)}
          className="ml-auto flex h-5 w-5 items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          aria-label="Search schema"
        >
          <Mark name="search" />
        </button>
        {headerTools && (
          <button
            type="button"
            onClick={onToggle}
            className="flex h-5 w-5 items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            aria-label="Hide Schema Explorer"
          >
            <Mark name="close" />
          </button>
        )}
      </div>

      {searchOpen && (
        <div className="px-3 pb-2">
          <label className="flex h-6 items-center gap-1.5 border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] px-2">
            <Mark name="search" className="text-[var(--color-text-muted)]" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search schema"
              className="h-full w-full bg-transparent text-[11px] outline-none placeholder:text-[var(--color-text-muted)]"
            />
          </label>
        </div>
      )}

      <div className="border-b border-[var(--color-border-subtle)] px-3 pb-3">
        <div className="flex items-center gap-2 font-mono text-[12px]">
          <Mark name="database" className="text-[var(--color-text-muted)]" />
          <span className="truncate text-[var(--color-text-primary)]">{workspaceName}</span>
        </div>
        <EngineLabel />
      </div>

      <ScrollArea className="flex-1">
        <Disclosure
          label="Tables"
          count={tableEntries.length}
          open={open.tables}
          onOpenChange={() => toggleSection('tables')}
          action={
            <button
              type="button"
              onClick={onAddTable}
              className="flex h-7 w-7 items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              aria-label="Add table"
            >
              +
            </button>
          }
        >
          {visibleTables.length === 0 && (
            <EmptyLine>{tableEntries.length === 0 ? 'No tables yet' : 'No matches'}</EmptyLine>
          )}
          {visibleTables.map(([name]) => {
            const tableIssues = issues.issues.filter((issue) => issue.tableName === name);
            const severity = tableIssues.some((issue) => issue.severity === 'error')
              ? 'error'
              : tableIssues.some((issue) => issue.severity === 'warning')
                ? 'warning'
                : null;
            return (
              <CatalogRow
                key={name}
                icon="table"
                label={name}
                active={selectedTable === name}
                severity={severity}
                onClick={() => onSelectTable(name)}
              />
            );
          })}
        </Disclosure>

        <Disclosure
          label="Relations"
          count={references.length}
          open={open.relations}
          onOpenChange={() => toggleSection('relations')}
        >
          {visibleRefs.length === 0 && (
            <EmptyLine>{references.length === 0 ? 'No relations' : 'No matches'}</EmptyLine>
          )}
          {visibleRefs.map((ref) => (
            <button
              key={ref.id}
              type="button"
              onClick={() => onSelectTable(ref.sourceTable)}
              aria-label={`${ref.sourceTable} to ${ref.targetTable}`}
              className="flex w-full items-baseline gap-2 px-2.5 py-1.5 text-left font-mono text-[12px] hover:bg-[var(--color-bg-tertiary)]"
            >
              <span className="truncate text-[var(--color-text-primary)]">{ref.sourceTable}</span>
              <span aria-hidden className="text-[var(--color-text-muted)]">to</span>
              <span className="truncate text-[var(--color-text-muted)]">{ref.targetTable}</span>
              <span aria-hidden className="ml-auto shrink-0 text-[10px] tracking-wide text-[var(--color-text-muted)]">
                {cardinalityMark(ref.cardinality)}
              </span>
            </button>
          ))}
        </Disclosure>

        {enums.length > 0 && <Disclosure
          label="Enums"
          count={enums.length}
          open={open.enums}
          onOpenChange={() => toggleSection('enums')}
        >
          {visibleEnums.length === 0 && (
            <EmptyLine>{enums.length === 0 ? 'No enums' : 'No matches'}</EmptyLine>
          )}
          {visibleEnums.map((item) => (
            <div key={item.name} className="px-2.5 py-1.5">
              <div className="truncate font-mono text-[12px] text-[var(--color-text-primary)]">{item.name}</div>
              <div className="truncate text-[11px] text-[var(--color-text-muted)]">
                {item.values.map((value) => value.name).join(', ') || 'No values'}
              </div>
            </div>
          ))}
        </Disclosure>}

        {groups.length > 0 && <Disclosure
          label="Groups"
          count={groups.length}
          open={open.groups}
          onOpenChange={() => toggleSection('groups')}
        >
          {visibleGroups.length === 0 && (
            <EmptyLine>{groups.length === 0 ? 'No groups' : 'No matches'}</EmptyLine>
          )}
          {visibleGroups.map((group) => (
            <div key={group.name} className="py-1">
              <div className="truncate px-2.5 font-mono text-[12px] text-[var(--color-text-primary)]">{group.name}</div>
              {group.tables.map((name) => (
                <button
                  key={`${group.name}-${name}`}
                  type="button"
                  onClick={() => onSelectTable(name)}
                  className="block w-full truncate px-5 py-1 text-left font-mono text-[12px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
                >
                  {name}
                </button>
              ))}
            </div>
          ))}
        </Disclosure>}

        <Disclosure
          label="Views"
          count={0}
          open={open.views}
          onOpenChange={() => toggleSection('views')}
        >
          <EmptyLine>None</EmptyLine>
        </Disclosure>

        <Disclosure
          label="Samples"
          count={sampleNames.length}
          open={open.samples}
          onOpenChange={() => toggleSection('samples')}
        >
          {sampleNames.map(({ name, label }) => (
            <CatalogRow key={name} icon="file" label={label} onClick={() => onOpenSample(name)} />
          ))}
          <CatalogRow icon="upload" label="Import file…" muted onClick={onImport} />
          <CatalogRow icon="link" label="Diff…" muted onClick={onGenerateMigration} />
        </Disclosure>

        <Disclosure
          label="Settings"
          open={open.settings}
          onOpenChange={() => toggleSection('settings')}
          detail={THEME_OPTIONS.find((option) => option.value === theme)?.label}
        >
          <div className="grid grid-cols-5 gap-1.5 px-2.5 pb-2 pt-1">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => applyTheme(option.value)}
                className={`h-6 border ${
                  theme === option.value
                    ? 'border-[var(--color-accent-primary)]'
                    : 'border-[var(--color-border-subtle)]'
                }`}
                style={{ background: option.swatch }}
                title={option.label}
              />
            ))}
          </div>
          <SettingRow label="Auto-save" checked={settings.autoSave} onChange={() => toggleSetting('autoSave')} />
          <SettingRow label="Minimap" checked={settings.minimap} onChange={() => toggleSetting('minimap')} />
          <SettingRow label="Grid" checked={settings.grid} onChange={() => toggleSetting('grid')} />
          <SettingRow label="Word wrap" checked={settings.wordWrap} onChange={() => toggleSetting('wordWrap')} />
          <SettingRow label="Line numbers" checked={settings.lineNumbers} onChange={() => toggleSetting('lineNumbers')} />
          <label className="flex h-8 items-center justify-between px-2.5 text-[12px]">
            Font size
            <select
              value={String(settings.fontSize)}
              onChange={(event) =>
                updateSettings({ fontSize: Number(event.target.value) as EditorFontSize })
              }
              className="h-6 border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] px-1 text-[11px]"
            >
              <option value="12">12</option>
              <option value="13">13</option>
              <option value="14">14</option>
            </select>
          </label>
          <label className="flex h-8 items-center justify-between px-2.5 text-[12px]">
            Weight
            <select
              value={String(settings.fontWeight)}
              onChange={(event) =>
                updateSettings({ fontWeight: Number(event.target.value) as EditorFontWeight })
              }
              className="h-6 border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] px-1 text-[11px]"
            >
              <option value="400">Regular</option>
              <option value="500">Medium</option>
              <option value="600">Semibold</option>
            </select>
          </label>
        </Disclosure>
      </ScrollArea>
    </aside>
  );
}

function SettingRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex h-8 items-center justify-between px-2.5 text-[12px]">
      {label}
      <input type="checkbox" checked={checked} onChange={onChange} />
    </label>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 py-1.5 text-[12px] text-[var(--color-text-muted)]">{children}</p>
  );
}

function CatalogRow({
  label,
  detail,
  active,
  muted,
  icon,
  severity,
  onClick,
}: {
  label: string;
  detail?: string;
  active?: boolean;
  muted?: boolean;
  icon?: 'table' | 'link' | 'file' | 'upload';
  severity?: 'error' | 'warning' | null;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 w-full items-center gap-2.5 px-3 text-left font-mono text-[12px] ${
        active
          ? 'bg-[var(--color-selection)] text-[var(--color-text-primary)]'
          : muted
            ? 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]'
            : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
      }`}
    >
      <Mark name={icon ?? 'link'} className="text-[var(--color-text-muted)]" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {severity && (
        <Mark
          name={severity}
          className={
            severity === 'warning'
              ? 'text-[var(--color-accent-warning)]'
              : 'text-[var(--color-accent-danger)]'
          }
        />
      )}
      {detail && <span className="text-[10px] text-[var(--color-text-muted)]">{detail}</span>}
    </button>
  );
}
