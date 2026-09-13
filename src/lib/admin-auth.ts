import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

export const ADMIN_COOKIE_NAME = 'admin_session';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
const SESSION_VERSION = 'v1';

function getConfiguredToken(): string | null {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token || token.trim() === '') {
    return null;
  }
  return token.trim();
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

function signSessionPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** Create a derived, expiring session credential (never the root API token). */
export function createAdminSessionValue(secret: string, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const exp = nowSeconds + COOKIE_MAX_AGE_SECONDS;
  const payload = `${SESSION_VERSION}.${exp}`;
  const sig = signSessionPayload(payload, secret);
  return `${payload}.${sig}`;
}

/** Validate a signed session cookie value against the configured secret. */
export function verifyAdminSessionValue(
  value: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  const parts = value.split('.');
  if (parts.length !== 3) return false;

  const [version, expStr, sig] = parts;
  if (version !== SESSION_VERSION || !expStr || !sig) return false;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < nowSeconds) return false;

  const payload = `${version}.${expStr}`;
  const expectedSig = signSessionPayload(payload, secret);
  return safeEqualSecret(sig, expectedSig);
}

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

function extractCookieValue(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rest] = part.split('=');
    if (rawName?.trim() === ADMIN_COOKIE_NAME) {
      const value = rest.join('=').trim();
      if (!value) return null;
      try {
        return decodeURIComponent(value);
      } catch {
        // Malformed encodings must not throw (would become 500 and block Bearer).
        return null;
      }
    }
  }
  return null;
}

/**
 * Returns whether the request carries a valid admin session cookie
 * (Bearer alone does not count — used for UI session restore).
 */
export function hasValidAdminSession(request: Request): boolean {
  const expected = getConfiguredToken();
  if (!expected) return false;
  const cookieValue = extractCookieValue(request);
  if (!cookieValue) return false;
  return verifyAdminSessionValue(cookieValue, expected);
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

  const bearer = extractBearerToken(request);
  if (bearer && safeEqualSecret(bearer, expected)) {
    return null;
  }

  const cookieValue = extractCookieValue(request);
  if (cookieValue && verifyAdminSessionValue(cookieValue, expected)) {
    return null;
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function verifyAdminToken(token: string): boolean {
  const expected = getConfiguredToken();
  if (!expected) return false;
  return safeEqualSecret(token.trim(), expected);
}

export function buildAdminSessionCookie(secret = getConfiguredToken()): string {
  if (!secret) {
    throw new Error('ADMIN_API_TOKEN is not configured');
  }
  const sessionValue = createAdminSessionValue(secret);
  const parts = [
    `${ADMIN_COOKIE_NAME}=${encodeURIComponent(sessionValue)}`,
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
