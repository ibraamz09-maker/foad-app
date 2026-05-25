import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { getCalendarEvents } from '@/lib/google';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = req.nextUrl;
    const timeMin = searchParams.get('timeMin') || new Date().toISOString();
    const timeMax = searchParams.get('timeMax') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const events = await getCalendarEvents(timeMin, timeMax);
    return NextResponse.json(events);
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (err.message === 'Google non connecté') return NextResponse.json({ error: 'Google non connecté', code: 'NOT_CONNECTED' }, { status: 403 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
