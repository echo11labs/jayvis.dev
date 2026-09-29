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

function allowedHost(host: string | null, published: Set<string>): boolean {
  if (!host) return false;
  return LOOPBACK.has(host) || published.has(host);
}

function publishedHosts(): Set<string> {
  return new Set(
    (process.env.JAYVIS_PUBLIC_HOSTS ?? '')
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isLocalRequest(headers: Headers): boolean {
  if (process.env.JAYVIS_ALLOW_REMOTE === '1') return true;
  const published = publishedHosts();
  const host = hostnameOf(headers.get('host'));
  if (!allowedHost(host, published)) return false;
  const forwarded = hostnameOf(headers.get('x-forwarded-host'));
  if (forwarded && !allowedHost(forwarded, published)) return false;
  const origin = hostnameOf(headers.get('origin'));
  if (origin && !allowedHost(origin, published)) return false;
  return true;
}
