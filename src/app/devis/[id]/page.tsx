'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import GmailModal from '@/components/GmailModal';
import { downloadDevisPDF } from '@/components/PDFGenerator';
import type { Devis } from '@/lib/types';
import Link from 'next/link';

const STATUTS = ['brouillon', 'envoyé', 'accepté', 'refusé'] as const;
const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  'envoyé': 'Envoyé',
  'accepté': 'Accepté',
  'refusé': 'Refusé',
};
const STATUT_COLORS: Record<string, string> = {
  brouillon: 'bg-gray-100 text-gray-700 border-gray-300',
  'envoyé': 'bg-blue-100 text-blue-700 border-blue-300',
  'accepté': 'bg-green-100 text-green-700 border-green-300',
  'refusé': 'bg-red-100 text-red-700 border-red-300',
};

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function DevisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [devis, setDevis] = useState<Devis | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGmail, setShowGmail] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch(`/api/devis/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setDevis(data); setLoading(false); });
  }, [id]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handlePDF() {
    if (!devis) return;
    setPdfLoading(true);
    try {
      await downloadDevisPDF(devis);
    } catch {
      showToast('Erreur lors de la génération du PDF');
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleStatutChange(statut: Devis['statut']) {
    const res = await fetch(`/api/devis/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDevis(updated);
      showToast('Statut mis à jour');
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-3 border-[#1B2A6B] border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!devis) {
    return (
      <AppShell>
        <div className="text-center py-20">
          <p className="text-gray-500">Devis introuvable</p>
          <button onClick={() => router.back()} className="btn-primary mt-4">Retour</button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white bg-[#1B2A6B]">
          {toast}
        </div>
      )}

      {showGmail && (
        <GmailModal
          devis={devis}
          onClose={() => setShowGmail(false)}
          onSent={() => { showToast('Mail envoyé !'); setDevis({ ...devis, statut: 'envoyé' }); }}
        />
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-gray-200 transition-all mt-0.5"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-[#1B2A6B]">{devis.numero}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${STATUT_COLORS[devis.statut]}`}>
              {STATUT_LABELS[devis.statut]}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Créé le {formatDate(devis.date_creation)}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Client */}
        <div className="card">
          <h2 className="font-semibold text-[#1B2A6B] mb-3 text-sm uppercase tracking-wide">Client</h2>
          <p className="font-semibold text-gray-800">{devis.client_nom}</p>
          <p className="text-sm text-gray-500 whitespace-pre-line">{devis.client_adresse}</p>
        </div>

        {/* Lines table */}
        <div className="card overflow-x-auto">
          <h2 className="font-semibold text-[#1B2A6B] mb-3 text-sm uppercase tracking-wide">Prestations</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#C0392B]/30">
                <th className="text-left pb-2 font-semibold text-[#1B2A6B]">Description</th>
                <th className="text-center pb-2 font-semibold text-[#1B2A6B] hidden sm:table-cell">Prix unit.</th>
                <th className="text-center pb-2 font-semibold text-[#1B2A6B] hidden sm:table-cell">Qté</th>
                <th className="text-right pb-2 font-semibold text-[#1B2A6B]">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {devis.lignes.map((l, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                  <td className="py-2.5 pr-2">{l.description}</td>
                  <td className="py-2.5 text-center text-gray-600 hidden sm:table-cell">{l.prix_unitaire.toFixed(2)} €</td>
                  <td className="py-2.5 text-center text-gray-600 hidden sm:table-cell">{l.quantite}</td>
                  <td className="py-2.5 text-right font-semibold">{l.total.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Sous-total HT</span>
              <span>{devis.montant_total.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>TVA (art. 293B)</span>
              <span>0,00 €</span>
            </div>
            <div className="flex justify-between font-bold text-lg text-white bg-[#C0392B] rounded-xl px-4 py-2.5 mt-2">
              <span>TOTAL TTC</span>
              <span>{devis.montant_total.toFixed(2)} €</span>
            </div>
            <p className="text-xs text-gray-400 text-center pt-1">TVA non applicable — article 293B du CGI</p>
          </div>
        </div>

        {/* Dates */}
        <div className="card">
          <h2 className="font-semibold text-[#1B2A6B] mb-3 text-sm uppercase tracking-wide">Historique</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-gray-400 text-xs">Créé le</p>
              <p className="font-medium">{formatDate(devis.date_creation)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Envoyé le</p>
              <p className="font-medium">{formatDate(devis.date_envoi)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Relancé le</p>
              <p className="font-medium">{formatDate(devis.date_relance)}</p>
            </div>
          </div>
        </div>

        {/* Change status */}
        <div className="card">
          <h2 className="font-semibold text-[#1B2A6B] mb-3 text-sm uppercase tracking-wide">Changer le statut</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STATUTS.map(s => (
              <button
                key={s}
                onClick={() => handleStatutChange(s)}
                className={`text-xs px-3 py-2 rounded-xl border font-medium transition-all ${
                  devis.statut === s
                    ? `${STATUT_COLORS[s]} shadow-sm`
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                }`}
              >
                {STATUT_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {devis.notes && (
          <div className="card">
            <h2 className="font-semibold text-[#1B2A6B] mb-2 text-sm uppercase tracking-wide">Notes</h2>
            <p className="text-sm text-gray-600 whitespace-pre-line">{devis.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handlePDF}
            disabled={pdfLoading}
            className="btn-outline flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {pdfLoading ? (
              <span className="w-4 h-4 border-2 border-[#1B2A6B] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Télécharger PDF
              </>
            )}
          </button>
          <button
            onClick={() => setShowGmail(true)}
            className="btn-danger flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            Envoyer par mail
          </button>
        </div>

        {/* Créer facture si accepté */}
        {devis.statut === 'accepté' && (
          <button
            onClick={async () => {
              const res = await fetch('/api/factures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  devis_id: devis.id,
                  client_nom: devis.client_nom,
                  client_adresse: devis.client_adresse,
                  lignes: devis.lignes,
                  notes: devis.notes,
                }),
              });
              if (res.ok) {
                const facture = await res.json();
                router.push(`/factures/${facture.id}`);
              } else {
                showToast('Erreur lors de la création de la facture');
              }
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            Créer la facture
          </button>
        )}

        {/* Delete */}
        <button
          onClick={async () => {
            if (!confirm('Supprimer ce devis définitivement ?')) return;
            await fetch(`/api/devis/${id}`, { method: 'DELETE' });
            router.push('/devis');
          }}
          className="w-full text-xs text-gray-400 hover:text-[#C0392B] transition-colors py-2"
        >
          Supprimer ce devis
        </button>
      </div>
    </AppShell>
  );
}
