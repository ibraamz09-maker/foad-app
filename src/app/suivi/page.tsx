'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import type { Devis } from '@/lib/types';
import { differenceInDays } from 'date-fns';

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

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SuiviPage() {
  const [devis, setDevis] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch('/api/devis')
      .then(r => r.json())
      .then(data => { setDevis(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleStatut(id: number, statut: Devis['statut']) {
    const res = await fetch(`/api/devis/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDevis(prev => prev.map(d => d.id === id ? updated : d));
      showToast('Statut mis à jour');
    }
  }

  async function handleRelance(id: number) {
    const res = await fetch(`/api/devis/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relance: true }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDevis(prev => prev.map(d => d.id === id ? updated : d));
      showToast('Date de relance enregistrée');
    }
  }

  // Stats
  const total = devis.length;
  const sent = devis.filter(d => d.statut === 'envoyé' || d.statut === 'accepté' || d.statut === 'refusé').length;
  const accepted = devis.filter(d => d.statut === 'accepté').length;
  const conversionRate = sent > 0 ? Math.round((accepted / sent) * 100) : 0;
  const totalAccepted = devis.filter(d => d.statut === 'accepté').reduce((s, d) => s + d.montant_total, 0);

  // Devis needing follow-up: sent > 7 days ago, no response
  const needsFollowup = devis.filter(d => {
    if (d.statut !== 'envoyé') return false;
    if (!d.date_envoi) return false;
    const days = differenceInDays(new Date(), new Date(d.date_envoi));
    return days >= 7;
  });

  return (
    <AppShell>
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white bg-[#1B2A6B]">
          {toast}
        </div>
      )}

      <h1 className="text-2xl font-bold text-[#1B2A6B] mb-6">Suivi des devis</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="card text-center">
          <p className="text-3xl font-bold text-[#1B2A6B]">{total}</p>
          <p className="text-xs text-gray-500 mt-1">Total créés</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-600">{sent}</p>
          <p className="text-xs text-gray-500 mt-1">Envoyés</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">{accepted}</p>
          <p className="text-xs text-gray-500 mt-1">Acceptés</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-[#C0392B]">{conversionRate}%</p>
          <p className="text-xs text-gray-500 mt-1">Taux conv.</p>
        </div>
      </div>

      {/* CA */}
      <div className="card mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Chiffre d'affaires accepté</p>
          <p className="text-2xl font-bold text-[#1B2A6B]">{totalAccepted.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</p>
        </div>
        <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
      </div>

      {/* Relance alert */}
      {needsFollowup.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-amber-800 text-sm">
                {needsFollowup.length} devis sans réponse depuis +7 jours
              </p>
              <div className="mt-2 space-y-1.5">
                {needsFollowup.map(d => {
                  const days = differenceInDays(new Date(), new Date(d.date_envoi!));
                  return (
                    <div key={d.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{d.client_nom}</p>
                        <p className="text-xs text-gray-400">{d.numero} · envoyé il y a {days} jours</p>
                      </div>
                      <button
                        onClick={() => handleRelance(d.id)}
                        className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 font-medium px-3 py-1.5 rounded-lg transition-all"
                      >
                        Relancer
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full list */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-[#1B2A6B]">Tous les devis</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-3 border-[#1B2A6B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : devis.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">Aucun devis</p>
            <Link href="/devis/nouveau" className="btn-primary mt-3 inline-flex items-center gap-2 text-sm">
              Créer un devis
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {devis.map(d => {
              const daysSinceEnvoi = d.date_envoi ? differenceInDays(new Date(), new Date(d.date_envoi)) : null;
              const needsRelance = d.statut === 'envoyé' && daysSinceEnvoi !== null && daysSinceEnvoi >= 7;

              return (
                <div key={d.id} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/devis/${d.id}`} className="font-semibold text-gray-800 hover:text-[#1B2A6B] transition-colors text-sm">
                          {d.client_nom}
                        </Link>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STATUT_COLORS[d.statut]}`}>
                          {STATUT_LABELS[d.statut]}
                        </span>
                        {needsRelance && !d.date_relance && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                            À relancer
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {d.numero} · Créé {formatDate(d.date_creation)}
                        {d.date_envoi && ` · Envoyé ${formatDate(d.date_envoi)}`}
                      </p>
                    </div>
                    <p className="font-bold text-[#1B2A6B] text-sm flex-shrink-0">{d.montant_total.toFixed(2)} €</p>
                  </div>

                  {/* Quick status change */}
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {(['brouillon', 'envoyé', 'accepté', 'refusé'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatut(d.id, s)}
                        className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${
                          d.statut === s
                            ? `${STATUT_COLORS[s]} font-semibold`
                            : 'border-gray-150 text-gray-400 hover:border-gray-300 bg-white'
                        }`}
                      >
                        {STATUT_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
