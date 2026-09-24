'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Codicon } from '@/components/ui/codicon';
import type { IconName } from '@/lib/ui/icons';
import type { LeftTab } from '@/components/workspace/LeftPanel';

const views: Array<{
  id: Exclude<LeftTab, 'settings'>;
  label: string;
  shortcut: string;
  icon: IconName;
}> = [
  { id: 'files', label: 'Explorer', shortcut: '⌘1', icon: 'explorer' },
  { id: 'tables', label: 'Outline', shortcut: '⌘2', icon: 'outline' },
  { id: 'schema', label: 'References', shortcut: '⌘3', icon: 'references' },
];

interface ActivityBarProps {
  activeTab: LeftTab;
  collapsed: boolean;
  tableCount: number;
  onActivate: (tab: LeftTab) => void;
}

export function ActivityBar({
  activeTab,
  collapsed,
  tableCount,
  onActivate,
}: ActivityBarProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <nav
        className="ide-activity flex h-full w-12 shrink-0 flex-col items-center bg-[var(--color-bg-activity)] py-1"
        aria-label="Activity Bar"
      >
        {views.map(({ id, label, shortcut, icon }) => {
          const active = !collapsed && activeTab === id;
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onActivate(id)}
                  className={`relative flex h-12 w-full items-center justify-center ${
                    active
                      ? 'text-[var(--color-activity-fg-active)] before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-[var(--color-activity-fg-active)]'
                      : 'text-[var(--color-activity-fg)] hover:text-[var(--color-activity-fg-active)]'
                  }`}
                  aria-label={label}
                  aria-pressed={active}
                >
                  <Codicon name={icon} />
                  {id === 'tables' && tableCount > 0 && (
                    <span className="absolute right-1 top-1 min-w-[14px] rounded-full bg-[var(--color-accent-primary)] px-1 text-center text-[9px] leading-[14px] text-white">
                      {tableCount > 99 ? '99+' : tableCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {label} ({shortcut})
              </TooltipContent>
            </Tooltip>
          );
        })}
        <div className="mt-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onActivate('settings')}
                className={`relative flex h-12 w-12 items-center justify-center ${
                  !collapsed && activeTab === 'settings'
                    ? 'text-[var(--color-activity-fg-active)] before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-[var(--color-activity-fg-active)]'
                    : 'text-[var(--color-activity-fg)] hover:text-[var(--color-activity-fg-active)]'
                }`}
                aria-label="Settings"
                aria-pressed={!collapsed && activeTab === 'settings'}
              >
                <Codicon name="settings" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Settings (⌘,)</TooltipContent>
          </Tooltip>
        </div>
      </nav>
    </TooltipProvider>
  );
}
