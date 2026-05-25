'use client';
import { useState } from 'react';
import { Devis } from '@/lib/db';
import { getDevisPDFBase64 } from './PDFGenerator';

interface Props {
  devis: Devis;
  onClose: () => void;
  onSent: () => void;
}

export default function GmailModal({ devis, onClose, onSent }: Props) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState(`Devis ${devis.numero} — Foad Amenzou`);
  const [body, setBody] = useState(
    `Bonjour,\n\nVeuillez trouver ci-joint le devis n° ${devis.numero} d'un montant de ${devis.montant_total.toFixed(2)} € TTC.\n\nCe devis est établi conformément à vos demandes. N'hésitez pas à me contacter pour toute question ou modification.\n\nCordialement,\nFoad Amenzou\nAuto-entrepreneur\n06 67 01 32 48\nfoadamenzou@gmail.com`
  );
  const [attachPdf, setAttachPdf] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSend() {
    if (!to) { setError('Veuillez saisir un destinataire'); return; }
    setSending(true);
    setError('');

    let attachmentBase64: string | undefined;
    let attachmentName: string | undefined;

    if (attachPdf) {
      try {
        attachmentBase64 = await getDevisPDFBase64(devis);
        attachmentName = `${devis.numero}.pdf`;
      } catch {
        setError('Erreur lors de la génération du PDF');
        setSending(false);
        return;
      }
    }

    const res = await fetch('/api/gmail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body, attachmentBase64, attachmentName, devisId: devis.id }),
    });

    if (res.ok) {
      onSent();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error || 'Erreur lors de l\'envoi');
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#1B2A6B]/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-[#1B2A6B]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-800">Envoyer par mail</p>
              <p className="text-xs text-gray-400">{devis.numero}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-all">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Confirmation banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-xs text-amber-700">Vérifiez les informations avant envoi. L'email sera envoyé depuis foadamenzou@gmail.com.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Destinataire *</label>
            <input
              type="email"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="input-field"
              placeholder="client@exemple.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Objet</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Corps du message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              className="input-field resize-none"
              rows={8}
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={attachPdf}
              onChange={e => setAttachPdf(e.target.checked)}
              className="w-4 h-4 rounded accent-[#1B2A6B]"
            />
            <span className="text-sm text-gray-700">Joindre le PDF du devis ({devis.numero}.pdf)</span>
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 text-[#C0392B] text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-outline flex-1">
              Annuler
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !to}
              className="btn-danger flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sending ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Envoyer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
