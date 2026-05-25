'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { LigneDevis } from '@/lib/db';

interface Ligne {
  description: string;
  prix_unitaire: string;
  quantite: string;
}

export default function NouveauDevisPage() {
  const router = useRouter();
  const [clientNom, setClientNom] = useState('');
  const [clientAdresse, setClientAdresse] = useState('');
  const [notes, setNotes] = useState('');
  const [lignes, setLignes] = useState<Ligne[]>([{ description: '', prix_unitaire: '', quantite: '1' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function addLigne() {
    setLignes([...lignes, { description: '', prix_unitaire: '', quantite: '1' }]);
  }

  function removeLigne(i: number) {
    setLignes(lignes.filter((_, idx) => idx !== i));
  }

  function updateLigne(i: number, field: keyof Ligne, value: string) {
    const next = [...lignes];
    next[i] = { ...next[i], [field]: value };
    setLignes(next);
  }

  function computeTotal() {
    return lignes.reduce((s, l) => {
      const p = parseFloat(l.prix_unitaire) || 0;
      const q = parseInt(l.quantite) || 0;
      return s + p * q;
    }, 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const typedLignes: LigneDevis[] = lignes
      .filter(l => l.description && l.prix_unitaire)
      .map(l => ({
        description: l.description,
        prix_unitaire: parseFloat(l.prix_unitaire),
        quantite: parseInt(l.quantite) || 1,
        total: (parseFloat(l.prix_unitaire) || 0) * (parseInt(l.quantite) || 1),
      }));

    if (!clientNom || !clientAdresse || typedLignes.length === 0) {
      setError('Veuillez remplir tous les champs obligatoires.');
      setSaving(false);
      return;
    }

    const res = await fetch('/api/devis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_nom: clientNom, client_adresse: clientAdresse, lignes: typedLignes, notes }),
    });

    if (res.ok) {
      const devis = await res.json();
      router.push(`/devis/${devis.id}`);
    } else {
      const data = await res.json();
      setError(data.error || 'Erreur lors de la création');
      setSaving(false);
    }
  }

  const total = computeTotal();

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-gray-200 transition-all"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-[#1B2A6B]">Nouveau devis</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client info */}
          <div className="card">
            <h2 className="font-semibold text-[#1B2A6B] mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Client
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Nom / Société *</label>
                <input
                  type="text"
                  value={clientNom}
                  onChange={e => setClientNom(e.target.value)}
                  className="input-field"
                  placeholder="Nom du client ou société"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Adresse *</label>
                <textarea
                  value={clientAdresse}
                  onChange={e => setClientAdresse(e.target.value)}
                  className="input-field resize-none"
                  rows={2}
                  placeholder="Adresse complète du client"
                  required
                />
              </div>
            </div>
          </div>

          {/* Lines */}
          <div className="card">
            <h2 className="font-semibold text-[#1B2A6B] mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              Prestations
            </h2>

            <div className="space-y-3">
              {/* Column headers (desktop only) */}
              <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-gray-400 px-1">
                <span className="col-span-6">Description</span>
                <span className="col-span-2 text-center">Prix unit.</span>
                <span className="col-span-2 text-center">Qté</span>
                <span className="col-span-2 text-right">Total</span>
              </div>

              {lignes.map((ligne, i) => {
                const lineTotal = (parseFloat(ligne.prix_unitaire) || 0) * (parseInt(ligne.quantite) || 0);
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={ligne.description}
                      onChange={e => updateLigne(i, 'description', e.target.value)}
                      className="input-field col-span-12 sm:col-span-6"
                      placeholder="Description de la prestation"
                    />
                    <input
                      type="number"
                      value={ligne.prix_unitaire}
                      onChange={e => updateLigne(i, 'prix_unitaire', e.target.value)}
                      className="input-field col-span-5 sm:col-span-2 text-center"
                      placeholder="Prix"
                      min="0"
                      step="0.01"
                    />
                    <input
                      type="number"
                      value={ligne.quantite}
                      onChange={e => updateLigne(i, 'quantite', e.target.value)}
                      className="input-field col-span-4 sm:col-span-2 text-center"
                      placeholder="Qté"
                      min="1"
                    />
                    <div className="col-span-2 sm:col-span-1 text-right">
                      <p className="text-sm font-semibold text-[#1B2A6B]">{lineTotal.toFixed(2)} €</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLigne(i)}
                      disabled={lignes.length === 1}
                      className="col-span-1 p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-[#C0392B] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addLigne}
              className="mt-3 flex items-center gap-2 text-sm text-[#1B2A6B] hover:text-[#2a3d8f] font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Ajouter une ligne
            </button>

            {/* Total */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Sous-total HT</span>
                <span>{total.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>TVA (art. 293B)</span>
                <span>0,00 €</span>
              </div>
              <div className="flex justify-between font-bold text-[#1B2A6B] text-lg mt-2">
                <span>TOTAL TTC</span>
                <span>{total.toFixed(2)} €</span>
              </div>
              <p className="text-xs text-gray-400 mt-1 text-right">TVA non applicable — article 293B du CGI</p>
            </div>
          </div>

          {/* Notes */}
          <div className="card">
            <h2 className="font-semibold text-[#1B2A6B] mb-3">Notes (optionnel)</h2>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="input-field resize-none"
              rows={3}
              placeholder="Conditions de paiement, délais, remarques..."
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-[#C0392B] text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-outline flex-1"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Créer le devis
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
