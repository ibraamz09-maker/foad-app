import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getGoogleTokens } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ authenticated: false });
  }
  const tokens = await getGoogleTokens();
  return NextResponse.json({ authenticated: true, googleConnected: !!tokens });
}
