const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function hostnameOf(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(',')[0]?.trim();
  if (!first) return null;
  try {
    const url = first.includes('://') ? new URL(first) : new URL(`http://${first}`);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function remoteForbiddenBody() {
  return {
    success: false,
    error: 'This API is local only',
    code: 'REMOTE_FORBIDDEN',
  };
}

export function isLocalRequest(headers: Headers): boolean {
  if (process.env.JAYVIS_ALLOW_REMOTE === '1') return true;
  const host = hostnameOf(headers.get('host'));
  if (!host || !LOOPBACK.has(host)) return false;
  const forwarded = hostnameOf(headers.get('x-forwarded-host'));
  if (forwarded && !LOOPBACK.has(forwarded)) return false;
  const origin = hostnameOf(headers.get('origin'));
  if (origin && !LOOPBACK.has(origin)) return false;
  return true;
}
