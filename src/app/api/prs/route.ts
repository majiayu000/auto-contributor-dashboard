import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { getPullRequests, parseLimit } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get('limit'));

    const prs = await getPullRequests(limit);
    return NextResponse.json(prs);
  } catch (error) {
    console.error('Error fetching PRs:', error);
    return NextResponse.json({ error: 'Failed to fetch PRs' }, { status: 500 });
  }
}
