'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutGrid,
  GitCompare,
  Database,
  FileCode2,
  Sparkles,
  Download,
  Upload,
  ChevronDown,
  Loader2,
  Circle,
  CircleDot,
  Plus,
  Keyboard,
  Trash2,
  Code2,
  Command,
  Image as ImageIcon,
} from 'lucide-react';
import { useDiagramStore } from '@/store/diagram-store';
import { serializeDBML } from '@/lib/parser/dbml';
import { exportDDL } from '@/lib/export/ddl';
import { downloadErdSvg } from '@/lib/export/erd-svg';
import { toast } from 'sonner';

interface ToolbarProps {
  onAutoLayout: () => Promise<void>;
  onGenerateMigration: () => void;
  onMigrationOpenChange: (open: boolean) => void;
  onLoadSample: (name: SampleName) => void;
  onAddTableOpenChange: (open: boolean) => void;
  onShortcutsOpenChange: (open: boolean) => void;
  onCommandPaletteOpenChange: (open: boolean) => void;
  isLayouting: boolean;
}

export type SampleName = 'ecommerce' | 'blog' | 'saas';

function originIndicator(origin: string) {
  switch (origin) {
    case 'editor':
      return { icon: FileCode2, label: 'Editor', color: 'text-sky-400' };
    case 'canvas':
      return { icon: LayoutGrid, label: 'Canvas', color: 'text-indigo-400' };
    case 'mcp':
      return { icon: Sparkles, label: 'MCP Agent', color: 'text-emerald-400' };
    case 'remote':
      return { icon: Database, label: 'Remote', color: 'text-amber-400' };
    default:
      return { icon: Circle, label: 'Idle', color: 'text-zinc-500' };
  }
}

export function Toolbar({
  onAutoLayout,
  onGenerateMigration,
  onMigrationOpenChange,
  onLoadSample,
  onAddTableOpenChange,
  onShortcutsOpenChange,
  onCommandPaletteOpenChange,
  isLayouting,
}: ToolbarProps) {
  const sourceOrigin = useDiagramStore((s) => s.sourceOrigin);
  const tableCount = useDiagramStore(
    (s) => Object.keys(s.ast.tables).length,
  );
  const fieldCount = useDiagramStore(
    (s) =>
      Object.values(s.ast.tables).reduce((acc, t) => acc + t.fields.length, 0),
  );
  const refCount = useDiagramStore(
    (s) => Object.keys(s.ast.references).length,
  );
  const ast = useDiagramStore((s) => s.ast);

  const indicator = originIndicator(sourceOrigin);

  const handleExport = () => {
    const dbml = serializeDBML(ast);
    const blob = new Blob([dbml], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.dbml';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported schema.dbml');
  };

  const handleExportJson = () => {
    const json = JSON.stringify(ast, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported schema.json');
  };

  const handleExportDDL = () => {
    const ddl = exportDDL(ast);
    const blob = new Blob([ddl], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.sql';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported schema.sql (DDL)');
  };

  const handleExportErd = () => {
    const positions: Record<string, { x: number; y: number }> = {};
    for (const n of useDiagramStore.getState().nodes) {
      positions[n.id] = { x: n.position.x, y: n.position.y };
    }
    downloadErdSvg(ast, positions);
    toast.success('Exported stitchdb-erd.svg');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '');
      useDiagramStore.getState().setRawText(text);
      toast.success(`Imported ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearSchema = () => {
    useDiagramStore.getState().loadAST({ version: '1.0', tables: {}, references: {} });
    toast.success('Schema cleared');
  };

  return (
    <TooltipProvider delayDuration={200}>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 backdrop-blur-sm">
        {/* Left: brand + stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
              <Database className="h-4 w-4 text-white" />
            </div>
            <div className="leading-none">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-zinc-100">
                  StitchDB
                </span>
                <Badge
                  variant="outline"
                  className="border-zinc-700 px-1 py-0 text-[9px] font-normal text-zinc-500"
                >
                  v1.0
                </Badge>
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-3 border-l border-zinc-800 pl-4 md:flex">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-zinc-500">tables</span>
              <span className="font-mono font-medium text-zinc-300">
                {tableCount}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-zinc-500">cols</span>
              <span className="font-mono font-medium text-zinc-300">
                {fieldCount}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-zinc-500">refs</span>
              <span className="font-mono font-medium text-zinc-300">
                {refCount}
              </span>
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/50 px-2.5 py-1 sm:flex">
            <CircleDot className={`h-2.5 w-2.5 ${indicator.color}`} />
            <span className="text-[11px] font-medium text-zinc-400">
              {indicator.label}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <Sparkles className="h-4 w-4" />
                Samples
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="border-zinc-800 bg-zinc-950"
            >
              <DropdownMenuLabel className="text-zinc-500">
                Load sample schema
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                className="cursor-pointer text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
                onClick={() => onLoadSample('ecommerce')}
              >
                E-commerce
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
                onClick={() => onLoadSample('blog')}
              >
                Blog / CMS
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
                onClick={() => onLoadSample('saas')}
              >
                SaaS Multi-tenant
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <input
            id="import-dbml"
            type="file"
            accept=".dbml,.txt"
            className="hidden"
            onChange={handleImport}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                onClick={() =>
                  document.getElementById('import-dbml')?.click()
                }
              >
                <Upload className="h-4 w-4" />
                <span className="hidden lg:inline">Import</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Import .dbml file</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <Download className="h-4 w-4" />
                <span className="hidden lg:inline">Export</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="border-zinc-800 bg-zinc-950"
            >
              <DropdownMenuItem
                className="cursor-pointer text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
                onClick={handleExport}
              >
                <FileCode2 className="mr-2 h-4 w-4" />
                Export as DBML
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
                onClick={handleExportJson}
              >
                <Database className="mr-2 h-4 w-4" />
                Export as JSON AST
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
                onClick={handleExportDDL}
              >
                <Code2 className="mr-2 h-4 w-4" />
                Export as SQL DDL
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
                onClick={handleExportErd}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Export ERD as SVG
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                className="cursor-pointer text-rose-400 focus:bg-rose-500/10 focus:text-rose-300"
                onClick={handleClearSchema}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear schema
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="mx-1 h-6 w-px bg-zinc-800" />

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-indigo-600/40 bg-indigo-600/10 text-indigo-300 hover:bg-indigo-600/20 hover:text-indigo-200"
            onClick={() => onAddTableOpenChange(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Table</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100"
            onClick={onAutoLayout}
            disabled={isLayouting || tableCount === 0}
          >
            {isLayouting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LayoutGrid className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Auto Layout</span>
          </Button>

          <Button
            size="sm"
            className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-500"
            onClick={() => {
              onGenerateMigration();
              onMigrationOpenChange(true);
            }}
            disabled={tableCount === 0}
          >
            <GitCompare className="h-4 w-4" />
            <span className="hidden sm:inline">Generate Migration</span>
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                onClick={() => onCommandPaletteOpenChange(true)}
              >
                <Command className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Command palette (⌘K)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                onClick={() => onShortcutsOpenChange(true)}
              >
                <Keyboard className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Keyboard shortcuts (⇧?)</TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
}
