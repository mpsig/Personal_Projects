import type { NextRequest } from 'next/server';

export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  // Non-browser clients may omit Origin, as before.
  if (origin === null) return true;
  // NextURL rewrites loopback IPs to localhost. Host retains the authority
  // actually requested by the browser. Do not trust forwarded-host headers.
  const host = request.headers.get('host') ?? request.nextUrl.host;
  if (!host || /[\s,/@\\?#]/.test(host)) return false;
  try {
    const expected = new URL(`${request.nextUrl.protocol}//${host}`).origin;
    return origin === expected;
  } catch {
    return false;
  }
}
