import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

export const ADMIN_COOKIE_NAME = 'admin_session';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getConfiguredToken(): string | null {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token || token.trim() === '') {
    return null;
  }
  return token;
}

/** Timing-safe equality for UTF-8 secrets of possibly different lengths. */
export function safeEqualSecret(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) {
    // Compare against itself so work is not zero-cost on length mismatch,
    // then still reject.
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

function extractCookieToken(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rest] = part.split('=');
    if (rawName?.trim() === ADMIN_COOKIE_NAME) {
      const value = rest.join('=').trim();
      return value ? decodeURIComponent(value) : null;
    }
  }
  return null;
}

/**
 * Returns null when the request is authorized via Bearer token or admin cookie.
 * Otherwise returns a 401 NextResponse (including when ADMIN_API_TOKEN is unset).
 */
export function requireAdminAuth(request: Request): NextResponse | null {
  const expected = getConfiguredToken();
  if (!expected) {
    return NextResponse.json(
      { error: 'Admin authentication is not configured' },
      { status: 401 }
    );
  }

  const candidates = [extractBearerToken(request), extractCookieToken(request)].filter(
    (v): v is string => Boolean(v)
  );

  for (const candidate of candidates) {
    if (safeEqualSecret(candidate, expected)) {
      return null;
    }
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function verifyAdminToken(token: string): boolean {
  const expected = getConfiguredToken();
  if (!expected) return false;
  return safeEqualSecret(token, expected);
}

export function buildAdminSessionCookie(token: string): string {
  const parts = [
    `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
  ];
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function clearAdminSessionCookie(): string {
  const parts = [
    `${ADMIN_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
  ];
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  return parts.join('; ');
}
