import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { getBlacklist, addToBlacklist, removeFromBlacklist } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const blacklist = await getBlacklist();
    return NextResponse.json(blacklist);
  } catch (error) {
    console.error('Error fetching blacklist:', error);
    return NextResponse.json({ error: 'Failed to fetch blacklist' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const { repo, reason } = await request.json();
    if (!repo) {
      return NextResponse.json({ error: 'repo is required' }, { status: 400 });
    }
    await addToBlacklist(repo, reason || 'No reason provided');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding to blacklist:', error);
    return NextResponse.json({ error: 'Failed to add to blacklist' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const repo = searchParams.get('repo');
    if (!repo) {
      return NextResponse.json({ error: 'repo is required' }, { status: 400 });
    }
    await removeFromBlacklist(repo);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing from blacklist:', error);
    return NextResponse.json({ error: 'Failed to remove from blacklist' }, { status: 500 });
  }
}
