import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { getFactureById, updateFactureStatut } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const f = await getFactureById(parseInt(params.id));
    if (!f) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    return NextResponse.json(f);
  } catch {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const { statut, date_paiement } = await req.json();
    await updateFactureStatut(parseInt(params.id), statut, date_paiement);
    const f = await getFactureById(parseInt(params.id));
    return NextResponse.json(f);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
