'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { useDiagramStore } from '@/store/diagram-store';
import { layoutDiagram } from '@/lib/layout/elk-layout';
import { serializeDBML } from '@/lib/parser/dbml';
import { toast } from 'sonner';

interface ToolbarProps {
  onAutoLayout: () => Promise<void>;
  onGenerateMigration: () => void;
  onMigrationOpenChange: (open: boolean) => void;
  onLoadSample: (name: SampleName) => void;
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
  const setNodes = useDiagramStore((s) => s.setNodes);
  const nodes = useDiagramStore((s) => s.nodes);

  const [exporting, setExporting] = useState(false);

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

  const handleRecenter = async () => {
    if (nodes.length === 0) return;
    setExporting(true);
    try {
      const { nodes: laid } = await layoutDiagram(nodes, []);
      setNodes(laid);
      toast.success('Auto layout applied');
    } catch {
      toast.error('Auto layout failed');
    } finally {
      setExporting(false);
    }
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
                onClick={handleRecenter}
                disabled={exporting || nodes.length === 0}
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
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="mx-1 h-6 w-px bg-zinc-800" />

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
            Auto Layout
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
            Generate Migration
          </Button>
        </div>
      </header>
    </TooltipProvider>
  );
}
