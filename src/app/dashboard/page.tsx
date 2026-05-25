'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import type { Devis } from '@/lib/types';

interface CalEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
}

function formatHeure(dt?: string) {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

const STATUT_COLORS: Record<string, string> = {
  brouillon: 'badge-brouillon',
  'envoyé': 'badge-envoyé',
  'accepté': 'badge-accepté',
  'refusé': 'badge-refusé',
};

function DashboardContent() {
  const [devis, setDevis] = useState<Devis[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [toast, setToast] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const g = searchParams.get('google');
    if (g === 'connected') setToast('Google Calendar connecté !');
    if (g === 'error') setToast('Erreur connexion Google');
    if (g) {
      const t = setTimeout(() => setToast(''), 3000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/auth/check').then(r => r.json()).then(d => setGoogleConnected(d.googleConnected));
    fetch('/api/devis').then(r => r.json()).then(setDevis).catch(() => {});

    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const end = new Date(today.setHours(23, 59, 59, 999)).toISOString();
    fetch(`/api/calendar/events?timeMin=${start}&timeMax=${end}`)
      .then(r => r.json())
      .then(data => Array.isArray(data) ? setEvents(data) : setEvents([]))
      .catch(() => {});
  }, []);

  const pending = devis.filter(d => d.statut === 'envoyé');
  const lastDevis = devis[0];
  const totalAccepted = devis.filter(d => d.statut === 'accepté').reduce((s, d) => s + d.montant_total, 0);

  return (
    <AppShell>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${toast.includes('rreur') ? 'bg-[#C0392B]' : 'bg-[#1B2A6B]'}`}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A6B]">Bonjour, Foad 👋</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {!googleConnected && (
          <a
            href="/api/google/auth"
            className="hidden sm:flex items-center gap-2 text-xs bg-white border border-gray-200 hover:border-[#1B2A6B] text-gray-600 hover:text-[#1B2A6B] px-3 py-2 rounded-xl transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Connecter Google
          </a>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="card text-center">
          <p className="text-3xl font-bold text-[#1B2A6B]">{devis.length}</p>
          <p className="text-xs text-gray-500 mt-1">Devis total</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-amber-500">{pending.length}</p>
          <p className="text-xs text-gray-500 mt-1">En attente</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">{devis.filter(d => d.statut === 'accepté').length}</p>
          <p className="text-xs text-gray-500 mt-1">Acceptés</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-[#1B2A6B]">{totalAccepted.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} €</p>
          <p className="text-xs text-gray-500 mt-1">CA accepté</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Today's events */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#1B2A6B] flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Aujourd'hui
            </h2>
            <Link href="/agenda" className="text-xs text-[#1B2A6B] hover:underline font-medium">Voir agenda →</Link>
          </div>
          {events.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">Aucun rendez-vous aujourd'hui</p>
              <Link href="/agenda" className="mt-3 inline-block btn-outline text-xs px-4 py-2">
                + Créer un RDV
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map(ev => (
                <div key={ev.id} className="flex items-start gap-3 p-3 bg-[#1B2A6B]/5 rounded-xl">
                  <div className="w-1 h-12 bg-[#1B2A6B] rounded-full flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{ev.summary}</p>
                    <p className="text-xs text-gray-500">
                      {ev.start.dateTime ? `${formatHeure(ev.start.dateTime)} – ${formatHeure(ev.end.dateTime)}` : 'Toute la journée'}
                    </p>
                    {ev.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{ev.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending quotes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#1B2A6B] flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Devis en attente
            </h2>
            <Link href="/suivi" className="text-xs text-[#1B2A6B] hover:underline font-medium">Voir suivi →</Link>
          </div>
          {pending.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Aucun devis en attente</p>
          ) : (
            <div className="space-y-2">
              {pending.slice(0, 4).map(d => (
                <Link
                  key={d.id}
                  href={`/devis/${d.id}`}
                  className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-xl hover:border-amber-300 transition-all"
                >
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{d.client_nom}</p>
                    <p className="text-xs text-gray-500">{d.numero}</p>
                  </div>
                  <p className="font-bold text-[#1B2A6B] text-sm">{d.montant_total.toFixed(2)} €</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Last quote */}
        {lastDevis && (
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-[#1B2A6B]">Dernier devis créé</h2>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUT_COLORS[lastDevis.statut]}`}>
                {lastDevis.statut}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">{lastDevis.client_nom}</p>
                <p className="text-sm text-gray-500">{lastDevis.numero} · {formatDate(lastDevis.date_creation)}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-bold text-xl text-[#1B2A6B]">{lastDevis.montant_total.toFixed(2)} €</p>
                <Link href={`/devis/${lastDevis.id}`} className="btn-outline text-xs px-3 py-2">Voir</Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Link href="/devis/nouveau" className="btn-primary flex items-center justify-center gap-2 py-4 text-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouveau devis
        </Link>
        <Link href="/agenda" className="btn-outline flex items-center justify-center gap-2 py-4 text-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Nouveau RDV
        </Link>
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#1B2A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
