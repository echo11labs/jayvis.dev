'use client';

import { Codicon } from '@/components/ui/codicon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { applyTheme, useThemeName } from '@/hooks/use-theme-state';
import { THEME_OPTIONS } from '@/hooks/use-theme-state';

export function ThemeToggle() {
  const theme = useThemeName();
  const current = THEME_OPTIONS.find((option) => option.value === theme) ?? THEME_OPTIONS[0];

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-panel)] hover:text-[var(--color-text-primary)]"
              aria-label={`Theme: ${current.label}`}
              title={`Theme: ${current.label} (⌘⇧T)`}
            >
              <span
                className="h-3 w-3 rounded-sm border border-[var(--color-border-subtle)]"
                style={{ background: current.swatch }}
              />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Switch theme (⌘⇧T)</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="end"
        className="min-w-[13rem] border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] text-[var(--color-text-primary)]"
      >
        <DropdownMenuLabel className="text-[var(--color-text-muted)]">Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[var(--color-border-subtle)]" />
        {THEME_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => applyTheme(option.value)}
            className="flex cursor-pointer items-center gap-2.5 px-2 py-1.5 text-xs focus:bg-[var(--color-bg-panel)] focus:text-[var(--color-text-secondary)]"
          >
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-sm border border-black/20"
              style={{ background: option.swatch }}
            />
            <span className="flex-1">{option.label}</span>
            {theme === option.value && <Codicon name="check" className="text-[var(--color-accent-primary)]" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-[var(--color-border-subtle)]" />
        <DropdownMenuItem
          onClick={() => applyTheme(theme === 'light-plus' ? 'dark-plus' : 'light-plus')}
          className="flex cursor-pointer items-center gap-2.5 px-2 py-1.5 text-xs focus:bg-[var(--color-bg-panel)] focus:text-[var(--color-text-secondary)]"
        >
          <Codicon name="theme" />
          Toggle light / dark
          <Codicon name="desktop" className="ml-auto text-[var(--color-text-muted)]" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
