'use client';

import React, { createContext, useContext, useMemo } from 'react';
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from '@clerk/nextjs';

export interface AuthContextValue {
  isConfigured: boolean;
  isSignedIn: boolean;
  userId: string | null;
  userEmail: string | null;
  tier: 'LOCAL' | 'FREE' | 'PRO';
  maxFiles: number;
}

const AuthContext = createContext<AuthContextValue>({
  isConfigured: false,
  isSignedIn: false,
  userId: null,
  userEmail: null,
  tier: 'LOCAL',
  maxFiles: Infinity,
});

export function useAuthContext(): AuthContextValue {
  return useContext(AuthContext);
}

function ClerkInnerWatcher({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();

  const value = useMemo<AuthContextValue>(() => {
    if (!isLoaded || !isSignedIn || !user) {
      return {
        isConfigured: true,
        isSignedIn: false,
        userId: null,
        userEmail: null,
        tier: 'LOCAL',
        maxFiles: Infinity,
      };
    }

    // Check user public metadata for Pro status if available
    const isPro = user.publicMetadata?.tier === 'pro';

    return {
      isConfigured: true,
      isSignedIn: true,
      userId: user.id,
      userEmail: user.primaryEmailAddress?.emailAddress ?? null,
      tier: isPro ? 'PRO' : 'FREE',
      maxFiles: isPro ? Infinity : 15,
    };
  }, [isLoaded, isSignedIn, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    // Local / Self-Hosted Mode without Clerk configured
    const localValue: AuthContextValue = {
      isConfigured: false,
      isSignedIn: false,
      userId: 'local-user',
      userEmail: 'local@jayvis.dev',
      tier: 'LOCAL',
      maxFiles: Infinity, // Unlimited local files for self-hosted users
    };

    return <AuthContext.Provider value={localValue}>{children}</AuthContext.Provider>;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{
        variables: {
          colorPrimary: '#38BDF8',
          colorBackground: '#0F172A',
        },
      }}
    >
      <ClerkInnerWatcher>{children}</ClerkInnerWatcher>
    </ClerkProvider>
  );
}

/**
 * Universal User Action Component
 * Renders Clerk profile when configured, or Local indicator when offline.
 */
export function AuthNavAction() {
  const { isConfigured, isSignedIn, tier } = useAuthContext();

  if (!isConfigured) {
    return (
      <span
        className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-800"
        title="Running in Local-First Mode (100% Offline)"
      >
        Local Mode
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <SignedIn>
        <div className="flex items-center gap-2">
          {tier === 'PRO' ? (
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#c45c26]">
              PRO
            </span>
          ) : (
            <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-[#8a8a8a]">
              CLOUD
            </span>
          )}
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: 'h-6 w-6 ring-1 ring-[#38BDF8]/30',
              },
            }}
          />
        </div>
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            className="flex h-7 items-center rounded-md border border-[#38BDF8]/40 bg-[#38BDF8]/10 px-2.5 font-mono text-xs font-medium text-[#38BDF8] transition hover:bg-[#38BDF8]/20"
          >
            Sign In
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            type="button"
            className="flex h-7 items-center rounded-md bg-[#38BDF8] px-2.5 font-mono text-xs font-semibold text-slate-950 transition hover:bg-[#7DD3FC]"
          >
            Sign Up
          </button>
        </SignUpButton>
      </SignedOut>
    </div>
  );
}
