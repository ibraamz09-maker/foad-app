import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { sendEmail } from '@/lib/email';
import { addGmailHistory, updateDevisEnvoi } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { to, subject, body, attachmentBase64, attachmentName, devisId } = await req.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    await sendEmail({ to, subject, body, attachmentBase64, attachmentName });

    await addGmailHistory({
      devis_id: devisId || null,
      destinataire: to,
      objet: subject,
      corps: body,
      date_envoi: new Date().toISOString(),
    });

    if (devisId) {
      await updateDevisEnvoi(parseInt(devisId));
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
