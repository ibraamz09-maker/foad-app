import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { createCalendarEvent } from '@/lib/google';
import { createRdv } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { titre, description, date_debut, date_fin, client_nom, devis_id } = await req.json();

    if (!titre || !date_debut || !date_fin) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    let google_event_id: string | null = null;
    try {
      const event = await createCalendarEvent({ title: titre, description, start: date_debut, end: date_fin });
      google_event_id = event.id || null;
    } catch {
      // Google not connected — save locally only
    }

    const rdv = await createRdv({
      google_event_id,
      titre,
      description: description || null,
      date_debut,
      date_fin,
      client_nom: client_nom || null,
      devis_id: devis_id || null,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(rdv, { status: 201 });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
