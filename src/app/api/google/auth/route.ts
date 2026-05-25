import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { getAuthUrl } from '@/lib/google';

export async function GET() {
  try {
    await requireAuth();
    const url = getAuthUrl();
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
}
