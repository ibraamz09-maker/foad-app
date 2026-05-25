'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import type { Facture } from '@/lib/types';

const STATUTS = ['envoyée', 'payée', 'en retard'] as const;
const STATUT_COLORS: Record<string, string> = {
  'envoyée': 'bg-blue-50 text-blue-700 border-blue-200',
  'payée': 'bg-green-50 text-green-700 border-green-200',
  'en retard': 'bg-red-50 text-red-700 border-red-200',
};

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function FactureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [facture, setFacture] = useState<Facture | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/factures/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setFacture(data); setLoading(false); });
  }, [id]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleStatut(statut: Facture['statut']) {
    const date_paiement = statut === 'payée' ? new Date().toISOString() : undefined;
    const res = await fetch(`/api/factures/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut, date_paiement }),
    });
    if (res.ok) {
      setFacture(await res.json());
      showToast('Statut mis à jour');
    }
  }

  async function handlePDF() {
    if (!facture) return;
    setPdfLoading(true);
    try {
      const { downloadFacturePDF } = await import('@/components/FacturePDFGenerator');
      await downloadFacturePDF(facture);
    } catch {
      showToast('Erreur PDF');
    } finally {
      setPdfLoading(false);
    }
  }

  if (loading) return (
    <AppShell>
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-3 border-[#1B2A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    </AppShell>
  );

  if (!facture) return (
    <AppShell>
      <div className="text-center py-20">
        <p className="text-gray-500">Facture introuvable</p>
        <button onClick={() => router.back()} className="btn-primary mt-4">Retour</button>
      </div>
    </AppShell>
  );

  return (
    <AppShell>
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white bg-[#1B2A6B]">
          {toast}
        </div>
      )}

      <div className="flex items-start gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-gray-200 transition-all mt-0.5">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-[#1B2A6B]">{facture.numero}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${STATUT_COLORS[facture.statut]}`}>
              {facture.statut.charAt(0).toUpperCase() + facture.statut.slice(1)}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Créée le {formatDate(facture.date_creation)}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card">
          <h2 className="font-semibold text-[#1B2A6B] mb-3 text-sm uppercase tracking-wide">Client</h2>
          <p className="font-semibold text-gray-800">{facture.client_nom}</p>
          <p className="text-sm text-gray-500 whitespace-pre-line">{facture.client_adresse}</p>
        </div>

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
              {facture.lignes.map((l, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                  <td className="py-2.5 pr-2">{l.description}</td>
                  <td className="py-2.5 text-center text-gray-600 hidden sm:table-cell">{l.prix_unitaire.toFixed(2)} €</td>
                  <td className="py-2.5 text-center text-gray-600 hidden sm:table-cell">{l.quantite}</td>
                  <td className="py-2.5 text-right font-semibold">{l.total.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Sous-total HT</span><span>{facture.montant_total.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>TVA (art. 293B)</span><span>0,00 €</span>
            </div>
            <div className="flex justify-between font-bold text-lg text-white bg-[#C0392B] rounded-xl px-4 py-2.5 mt-2">
              <span>TOTAL TTC</span><span>{facture.montant_total.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-[#1B2A6B] mb-3 text-sm uppercase tracking-wide">Dates</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-gray-400 text-xs">Créée le</p>
              <p className="font-medium">{formatDate(facture.date_creation)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Échéance</p>
              <p className="font-medium">{formatDate(facture.date_echeance)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Payée le</p>
              <p className="font-medium">{formatDate(facture.date_paiement)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-[#1B2A6B] mb-3 text-sm uppercase tracking-wide">Statut</h2>
          <div className="grid grid-cols-3 gap-2">
            {STATUTS.map(s => (
              <button
                key={s}
                onClick={() => handleStatut(s)}
                className={`text-xs px-3 py-2 rounded-xl border font-medium transition-all ${
                  facture.statut === s ? `${STATUT_COLORS[s]} shadow-sm` : 'border-gray-200 text-gray-500 bg-white'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handlePDF}
          disabled={pdfLoading}
          className="btn-outline w-full flex items-center justify-center gap-2 disabled:opacity-50"
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
      </div>
    </AppShell>
  );
}
