import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

const PASSWORD = 'Foad1974@amz';

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (password !== PASSWORD) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
  }

  const session = await getSession();
  session.isLoggedIn = true;
  await session.save();

  return NextResponse.json({ success: true });
}
