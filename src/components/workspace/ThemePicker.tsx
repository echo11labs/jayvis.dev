'use client';

import { Codicon } from '@/components/ui/codicon';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { applyTheme, useTheme, useThemeName } from '@/hooks/use-theme-state';
import { THEME_OPTIONS } from '@/hooks/use-theme-state';

interface ThemePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ThemePicker({ open, onOpenChange }: ThemePickerProps) {
  const theme = useThemeName();
  const resolved = useTheme();
  const isDark = resolved === 'dark';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] text-[var(--color-text-primary)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Codicon name="palette" />
            Theme picker
          </DialogTitle>
          <DialogDescription className="text-[var(--color-text-muted)]">
            Preview the workspace palette and switch instantly. The active theme
            is stored locally and follows your system preference when selected.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {THEME_OPTIONS.map((option) => {
            const active = theme === option.value;
            return (
              <button
                key={option.value}
                onClick={() => applyTheme(option.value)}
                className={`relative flex min-h-[92px] flex-col overflow-hidden rounded-lg border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${active
                    ? 'border-[var(--color-accent-primary)] ring-1 ring-[var(--color-accent-primary)]'
                    : 'border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)]'
                  }`}
                style={{ background: option.swatch }}
                aria-pressed={active}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-semibold drop-shadow-sm ${option.value === 'light-plus' ? 'text-neutral-900' : 'text-white'}`}>
                    {option.label}
                  </span>
                  {active && (
                    <Codicon name="check" className={option.value === 'light-plus' ? 'text-neutral-900' : 'text-white'} />
                  )}
                </span>
                <span className={`mt-auto text-[9px] drop-shadow-sm ${option.value === 'light-plus' || option.value === 'system' ? 'text-neutral-800' : 'text-white/80'}`}>
                  {option.value === 'system' ? 'Follow OS appearance' : option.value.replace('-', ' ')}
                </span>
                {option.value === 'system' && (
                  <Codicon name="desktop" className="absolute bottom-3 right-3 text-neutral-900" />
                )}
              </button>
            );
          })}
        </div>

        <div className={`flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] px-3 py-2 text-[11px] text-[var(--color-text-muted)]`}>
          <span className="flex items-center gap-1.5">
            <Codicon name="theme" />
            Live preview: {isDark ? 'dark workspace' : 'light workspace'}
          </span>
          <span className="font-mono">⌘⇧T</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
