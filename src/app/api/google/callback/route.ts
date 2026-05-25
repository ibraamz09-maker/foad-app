import { NextRequest, NextResponse } from 'next/server';
import { getOAuth2Client } from '@/lib/google';
import { saveGoogleTokens } from '@/lib/db';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?google=error`);
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    await saveGoogleTokens({
      access_token: tokens.access_token || '',
      refresh_token: tokens.refresh_token || '',
      token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : '',
    });

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?google=connected`);
  } catch (e: any) {
    console.error('Google callback error:', e?.message, e?.response?.data);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?google=error`);
  }
}
