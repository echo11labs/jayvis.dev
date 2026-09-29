import { describe, expect, it } from 'vitest';
import { isLocalRequest } from './local-request';

function headers(values: Record<string, string>) {
  return new Headers(values);
}

describe('local request gate', () => {
  it('allows loopback hosts and matching origins', () => {
    expect(isLocalRequest(headers({ host: 'localhost:3000' }))).toBe(true);
    expect(
      isLocalRequest(
        headers({
          host: '127.0.0.1:3000',
          origin: 'http://127.0.0.1:3000',
        }),
      ),
    ).toBe(true);
  });

  it('rejects public hosts and spoofed forwarded hosts', () => {
    expect(isLocalRequest(headers({ host: 'jayvis.dev' }))).toBe(false);
    expect(
      isLocalRequest(
        headers({
          host: 'localhost:3000',
          'x-forwarded-host': 'jayvis.dev',
        }),
      ),
    ).toBe(false);
    expect(
      isLocalRequest(
        headers({
          host: 'localhost:3000',
          origin: 'https://evil.example',
        }),
      ),
    ).toBe(false);
  });
});
