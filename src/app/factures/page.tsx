'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import type { Facture } from '@/lib/types';

const STATUT_COLORS: Record<string, string> = {
  'envoyée': 'bg-blue-50 text-blue-700 border-blue-200',
  'payée': 'bg-green-50 text-green-700 border-green-200',
  'en retard': 'bg-red-50 text-red-700 border-red-200',
};

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function FacturesPage() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/factures')
      .then(r => r.json())
      .then(data => { setFactures(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalPaye = factures.filter(f => f.statut === 'payée').reduce((s, f) => s + f.montant_total, 0);
  const totalEnAttente = factures.filter(f => f.statut !== 'payée').reduce((s, f) => s + f.montant_total, 0);

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1B2A6B]">Factures</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-600">{totalPaye.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</p>
          <p className="text-xs text-gray-500 mt-1">Encaissé</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-amber-500">{totalEnAttente.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</p>
          <p className="text-xs text-gray-500 mt-1">En attente</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#1B2A6B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : factures.length === 0 ? (
        <div className="text-center py-20">
          <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p className="text-gray-400 text-sm">Aucune facture</p>
          <p className="text-gray-400 text-xs mt-1">Accepte un devis pour créer une facture</p>
        </div>
      ) : (
        <div className="space-y-2">
          {factures.map(f => (
            <Link
              key={f.id}
              href={`/factures/${f.id}`}
              className="card flex items-center justify-between gap-3 hover:shadow-md hover:border-[#1B2A6B]/20 transition-all cursor-pointer no-underline"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-800 truncate">{f.client_nom}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STATUT_COLORS[f.statut]}`}>
                    {f.statut.charAt(0).toUpperCase() + f.statut.slice(1)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {f.numero} · {formatDate(f.date_creation)}
                  {f.date_echeance && ` · Échéance ${formatDate(f.date_echeance)}`}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-[#1B2A6B]">{f.montant_total.toFixed(2)} €</p>
                <svg className="w-4 h-4 text-gray-300 ml-auto mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
