'use client';

import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { dismissConfirm, subscribeConfirm } from '@/lib/confirm-action';

export function ConfirmActionDialog() {
  const [request, setRequest] = useState<{
    title: string;
    description: string;
    confirmLabel?: string;
    action: () => void;
  } | null>(null);

  useEffect(() => subscribeConfirm(setRequest), []);

  return (
    <AlertDialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) {
          setRequest(null);
          dismissConfirm();
        }
      }}
    >
      <AlertDialogContent className="gap-0 rounded-none border-[var(--color-border-subtle)] bg-[var(--color-bg-panel)] p-0 text-[var(--color-text-primary)] shadow-none sm:max-w-sm">
        <AlertDialogHeader className="gap-1 border-b border-[var(--color-border-subtle)] px-4 py-3 text-left">
          <AlertDialogTitle className="text-[13px] font-medium">
            {request?.title ?? 'Confirm'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[12px] leading-5 text-[var(--color-text-muted)]">
            {request?.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] px-3 py-2 sm:justify-end">
          <AlertDialogCancel className="mt-0 h-7 rounded-none border-[var(--color-border-subtle)] bg-transparent px-3 text-[12px] text-[var(--color-text-secondary)] shadow-none hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="h-7 rounded-none bg-[var(--color-accent-primary)] px-3 text-[12px] text-white shadow-none hover:bg-[var(--color-accent-hover)]"
            onClick={() => {
              request?.action();
              setRequest(null);
              dismissConfirm();
            }}
          >
            {request?.confirmLabel ?? 'Continue'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
