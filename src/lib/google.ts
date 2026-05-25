import { google } from 'googleapis';
import { getGoogleTokens, saveGoogleTokens } from './db';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`
  );
}

export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

export async function getAuthenticatedClient() {
  const tokens = await getGoogleTokens();
  if (!tokens) throw new Error('Google non connecté');

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.token_expiry ? new Date(tokens.token_expiry).getTime() : undefined,
  });

  oauth2Client.on('tokens', async (newTokens) => {
    await saveGoogleTokens({
      access_token: newTokens.access_token || tokens.access_token,
      refresh_token: newTokens.refresh_token || tokens.refresh_token,
      token_expiry: newTokens.expiry_date ? new Date(newTokens.expiry_date).toISOString() : tokens.token_expiry,
    });
  });

  return oauth2Client;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  attachmentBase64?: string;
  attachmentName?: string;
}) {
  const auth = await getAuthenticatedClient();
  const gmail = google.gmail({ version: 'v1', auth });
  const boundary = 'boundary_foad_amenzou';

  let emailContent: string;
  if (params.attachmentBase64 && params.attachmentName) {
    emailContent = [
      `To: ${params.to}`,
      `Subject: =?UTF-8?B?${Buffer.from(params.subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(params.body).toString('base64'),
      '',
      `--${boundary}`,
      `Content-Type: application/pdf; name="${params.attachmentName}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${params.attachmentName}"`,
      '',
      params.attachmentBase64,
      `--${boundary}--`,
    ].join('\r\n');
  } else {
    emailContent = [
      `To: ${params.to}`,
      `Subject: =?UTF-8?B?${Buffer.from(params.subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(params.body).toString('base64'),
    ].join('\r\n');
  }

  const raw = Buffer.from(emailContent).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
}

export async function getCalendarEvents(timeMin: string, timeMax: string) {
  const auth = await getAuthenticatedClient();
  const calendar = google.calendar({ version: 'v3', auth });
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100,
  });
  return response.data.items || [];
}

export async function createCalendarEvent(params: { title: string; description?: string; start: string; end: string }) {
  const auth = await getAuthenticatedClient();
  const calendar = google.calendar({ version: 'v3', auth });
  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: params.title,
      description: params.description,
      start: { dateTime: params.start, timeZone: 'Europe/Paris' },
      end: { dateTime: params.end, timeZone: 'Europe/Paris' },
    },
  });
  return response.data;
}
