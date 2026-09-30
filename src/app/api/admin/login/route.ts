import { NextResponse } from 'next/server';
import {
  buildAdminSessionCookie,
  clearAdminSessionCookie,
  hasValidAdminSession,
  verifyAdminToken,
} from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** Restore UI auth state from the httpOnly session cookie. */
export async function GET(request: Request) {
  return NextResponse.json({ authenticated: hasValidAdminSession(request) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token =
      typeof body?.token === 'string'
        ? body.token.trim()
        : extractBearerFromRequest(request);

    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const response = NextResponse.json({ success: true });
    response.headers.set('Set-Cookie', buildAdminSessionCookie());
    return response;
  } catch (error) {
    console.error('Error during admin login:', error);
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const response = NextResponse.json({ success: true });
  response.headers.set('Set-Cookie', clearAdminSessionCookie());
  return response;
}

/** Cookie writes require an explicit same-origin source; Origin takes precedence. */
function hasSameOrigin(request: Request): boolean {
  const url = new URL(request.url);
  // Next.js may expose its listening hostname in request.url instead of the browser's host.
  const host = request.headers.get('host') ?? url.host;
  // The reverse proxy must overwrite this header with the public transport scheme.
  const forwardedProtocol = request.headers.get('x-forwarded-proto');
  const protocol = forwardedProtocol === 'http' || forwardedProtocol === 'https'
    ? `${forwardedProtocol}:`
    : url.protocol;
  const expectedOrigin = new URL(`${protocol}//${host}`).origin;
  const origin = request.headers.get('origin');
  if (origin !== null) return origin === expectedOrigin;

  const referer = request.headers.get('referer');
  if (!referer) return false;
  try {
    return new URL(referer).origin === expectedOrigin;
  } catch {
    return false;
  }
}

function extractBearerFromRequest(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}
