import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { getGmailHistory } from '@/lib/db';

export async function GET() {
  try {
    await requireAuth();
    return NextResponse.json(await getGmailHistory());
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
}
