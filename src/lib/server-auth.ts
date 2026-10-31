import { auth, currentUser } from '@clerk/nextjs/server';

export interface ServerAuthResult {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  tier: 'LOCAL' | 'FREE' | 'PRO';
  isLocalMode: boolean;
}

/**
 * Robust server-side authentication resolver.
 * Supports Clerk authentication when configured, and falls back to
 * safe Local Mode for self-hosted instances.
 */
export async function getServerAuth(): Promise<ServerAuthResult> {
  const isClerkConfigured = Boolean(
    process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );

  if (!isClerkConfigured) {
    return {
      isAuthenticated: false,
      userId: 'local-user',
      email: 'local@jayvis.dev',
      tier: 'LOCAL',
      isLocalMode: true,
    };
  }

  try {
    const authObj = await auth();
    if (!authObj || !authObj.userId) {
      return {
        isAuthenticated: false,
        userId: null,
        email: null,
        tier: 'LOCAL',
        isLocalMode: false,
      };
    }

    const user = await currentUser();
    const isPro = user?.publicMetadata?.tier === 'pro';

    return {
      isAuthenticated: true,
      userId: authObj.userId,
      email: user?.primaryEmailAddress?.emailAddress ?? null,
      tier: isPro ? 'PRO' : 'FREE',
      isLocalMode: false,
    };
  } catch (error) {
    console.warn('[JayVis Auth] Clerk server check failed:', error);
    return {
      isAuthenticated: false,
      userId: null,
      email: null,
      tier: 'LOCAL',
      isLocalMode: false,
    };
  }
}
