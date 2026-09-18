'use client';

import { useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Key,
  Type,
  Link2,
  Hash,
  ShieldCheck,
} from 'lucide-react';
import { useDiagramStore } from '@/store/diagram-store';
import {
  validateSchema,
  severityColor,
  severityBg,
  type ValidationIssue,
} from '@/lib/validation/schema-validation';
import { useTheme as useThemeState } from '@/hooks/use-theme-state';

interface ValidationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_ICONS = {
  'primary-key': Key,
  naming: Hash,
  reference: Link2,
  type: Type,
  index: ShieldCheck,
};

function IssueRow({ issue }: { issue: ValidationIssue }) {
  const setSelectedTable = useDiagramStore((s) => s.setSelectedTable);
  const Icon =
    issue.severity === 'error'
      ? AlertCircle
      : issue.severity === 'warning'
        ? AlertTriangle
        : Info;
  const CatIcon = CATEGORY_ICONS[issue.category];

  return (
    <div
      className={`rounded-lg border p-3 ${severityBg(issue.severity)}`}
      onClick={() => {
        if (issue.tableName) setSelectedTable(issue.tableName);
      }}
      role={issue.tableName ? 'button' : undefined}
    >
      <div className="flex items-start gap-2.5">
        <Icon
          className={`mt-0.5 h-4 w-4 flex-shrink-0 ${severityColor(issue.severity)}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CatIcon className="h-3 w-3 text-zinc-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              {issue.category}
            </span>
            {issue.tableName && (
              <span className="font-mono text-[10px] text-zinc-600">
                {issue.tableName}
                {issue.fieldName ? `.${issue.fieldName}` : ''}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-300">{issue.message}</p>
          {issue.fix && (
            <p className="mt-1 text-[11px] italic text-zinc-500">
              {issue.fix}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ValidationPanel({ open, onOpenChange }: ValidationPanelProps) {
  const ast = useDiagramStore((s) => s.ast);
  const [filter, setFilter] = useState<'all' | 'error' | 'warning'>('all');
  const theme = useThemeState();
  const isDark = theme === 'dark';
  const sheetCls = isDark
    ? 'border-zinc-800 bg-zinc-950'
    : 'border-zinc-200 bg-white';
  const titleCls = isDark ? 'text-zinc-100' : 'text-zinc-900';

  const issues = useMemo(() => validateSchema(ast), [ast]);
  const filtered = useMemo(
    () => (filter === 'all' ? issues : issues.filter((i) => i.severity === filter)),
    [issues, filter],
  );

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={`w-full p-0 sm:max-w-md ${sheetCls}`}
      >
        <SheetHeader className={`border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'} px-4 py-3`}>
          <SheetTitle className={`flex items-center gap-2 ${titleCls}`}>
            <ShieldCheck className="h-4 w-4 text-indigo-400" />
            Schema Validation
          </SheetTitle>
          <SheetDescription className="text-zinc-500">
            Automated checks for primary keys, naming collisions, and orphaned
            references.
          </SheetDescription>
        </SheetHeader>

        {/* Summary */}
        <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-2.5">
          <Badge
            variant="outline"
            className={`gap-1.5 border-rose-500/30 ${errorCount > 0 ? 'bg-rose-500/10 text-rose-400' : 'text-zinc-600'}`}
          >
            <AlertCircle className="h-3 w-3" />
            {errorCount} error{errorCount !== 1 ? 's' : ''}
          </Badge>
          <Badge
            variant="outline"
            className={`gap-1.5 border-amber-500/30 ${warningCount > 0 ? 'bg-amber-500/10 text-amber-400' : 'text-zinc-600'}`}
          >
            <AlertTriangle className="h-3 w-3" />
            {warningCount} warning{warningCount !== 1 ? 's' : ''}
          </Badge>
          <div className="ml-auto flex gap-1">
            {(['all', 'error', 'warning'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  filter === f
                    ? 'bg-zinc-800 text-zinc-200'
                    : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="h-[calc(100%-140px)]">
          <div className="space-y-2 p-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">
                    No issues found
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    The schema passes all validation checks.
                  </p>
                </div>
              </div>
            ) : (
              filtered.map((issue) => (
                <IssueRow key={issue.id} issue={issue} />
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
