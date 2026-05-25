import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { getAllFactures, createFacture, generateNumeroFacture } from '@/lib/db';

export async function GET() {
  try {
    await requireAuth();
    return NextResponse.json(await getAllFactures());
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const { devis_id, client_nom, client_adresse, lignes, notes, date_echeance } = body;
    if (!client_nom || !client_adresse || !lignes?.length) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }
    const montant_total = lignes.reduce((s: number, l: any) => s + l.total, 0);
    const facture = await createFacture({
      numero: await generateNumeroFacture(),
      devis_id: devis_id || null,
      client_nom,
      client_adresse,
      lignes,
      montant_total,
      statut: 'envoyée',
      date_creation: new Date().toISOString(),
      date_echeance: date_echeance || null,
      date_paiement: null,
      notes: notes || null,
    });
    return NextResponse.json(facture, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
