import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { getDevisById, updateDevisStatut, updateDevisRelance, Devis } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const devis = await getDevisById(parseInt(params.id));
    if (!devis) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
    return NextResponse.json(devis);
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const { statut, relance } = await req.json();
    const id = parseInt(params.id);

    if (statut) await updateDevisStatut(id, statut as Devis['statut']);
    if (relance) await updateDevisRelance(id);

    const devis = await getDevisById(id);
    return NextResponse.json(devis);
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
