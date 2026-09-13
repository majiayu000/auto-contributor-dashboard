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
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      response.headers.set('Set-Cookie', clearAdminSessionCookie());
      return response;
    }

    const response = NextResponse.json({ success: true });
    response.headers.set('Set-Cookie', buildAdminSessionCookie());
    return response;
  } catch (error) {
    console.error('Error during admin login:', error);
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.headers.set('Set-Cookie', clearAdminSessionCookie());
  return response;
}

function extractBearerFromRequest(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}
