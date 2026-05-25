import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { getAllDevis, createDevis, generateNumero, LigneDevis } from '@/lib/db';

export async function GET() {
  try {
    await requireAuth();
    const devis = await getAllDevis();
    return NextResponse.json(devis);
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const { client_nom, client_adresse, lignes, notes } = body;

    if (!client_nom || !client_adresse || !lignes?.length) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    const typedLignes = lignes as LigneDevis[];
    const montant_total = typedLignes.reduce((sum: number, l: LigneDevis) => sum + l.total, 0);

    const devis = await createDevis({
      numero: await generateNumero(),
      client_nom,
      client_adresse,
      lignes: typedLignes,
      montant_total,
      statut: 'brouillon',
      date_creation: new Date().toISOString(),
      date_envoi: null,
      date_relance: null,
      notes: notes || null,
    });

    return NextResponse.json(devis, { status: 201 });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
