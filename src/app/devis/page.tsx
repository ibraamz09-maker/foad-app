'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { Devis } from '@/lib/db';

const STATUT_COLORS: Record<string, string> = {
  brouillon: 'badge-brouillon',
  'envoyé': 'badge-envoyé',
  'accepté': 'badge-accepté',
  'refusé': 'badge-refusé',
};

const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  'envoyé': 'Envoyé',
  'accepté': 'Accepté',
  'refusé': 'Refusé',
};

type Filter = 'tous' | Devis['statut'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function DevisListPage() {
  const [devis, setDevis] = useState<Devis[]>([]);
  const [filter, setFilter] = useState<Filter>('tous');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/devis')
      .then(r => r.json())
      .then(data => { setDevis(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = devis.filter(d => {
    if (filter !== 'tous' && d.statut !== filter) return false;
    if (search && !d.client_nom.toLowerCase().includes(search.toLowerCase()) && !d.numero.includes(search)) return false;
    return true;
  });

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1B2A6B]">Devis</h1>
        <Link href="/devis/nouveau" className="btn-primary flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span className="hidden sm:inline">Nouveau</span>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-9"
          placeholder="Rechercher par client ou numéro..."
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-5">
        {(['tous', 'brouillon', 'envoyé', 'accepté', 'refusé'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${
              filter === f
                ? 'bg-[#1B2A6B] text-white border-[#1B2A6B]'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            {f === 'tous' ? 'Tous' : STATUT_LABELS[f]}
            {f !== 'tous' && (
              <span className="ml-1.5 opacity-70">
                ({devis.filter(d => d.statut === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#1B2A6B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p className="text-gray-400 text-sm">
            {devis.length === 0 ? 'Aucun devis créé' : 'Aucun résultat'}
          </p>
          {devis.length === 0 && (
            <Link href="/devis/nouveau" className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">
              Créer mon premier devis
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(d => (
            <Link
              key={d.id}
              href={`/devis/${d.id}`}
              className="card flex items-center justify-between gap-3 hover:shadow-md hover:border-[#1B2A6B]/20 transition-all cursor-pointer no-underline"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-800 truncate">{d.client_nom}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STATUT_COLORS[d.statut]}`}>
                    {STATUT_LABELS[d.statut]}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{d.numero} · {formatDate(d.date_creation)}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-[#1B2A6B]">{d.montant_total.toFixed(2)} €</p>
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
