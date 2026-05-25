'use client';
import { useEffect, useState, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday,
  startOfDay, addHours, parseISO,
} from 'date-fns';
import { fr } from 'date-fns/locale';

interface CalEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
}

interface NewRdv {
  titre: string;
  description: string;
  date_debut: string;
  date_fin: string;
  client_nom: string;
}

type ViewMode = 'month' | 'week';

function parseEventDate(ev: CalEvent): Date {
  const raw = ev.start.dateTime || ev.start.date || '';
  return parseISO(raw);
}

function formatTime(dt?: string) {
  if (!dt) return '';
  return format(parseISO(dt), 'HH:mm');
}

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>('month');
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [newRdv, setNewRdv] = useState<NewRdv>({
    titre: '', description: '', date_debut: '', date_fin: '', client_nom: '',
  });

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const start = view === 'month'
      ? startOfMonth(currentDate)
      : startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = view === 'month'
      ? endOfMonth(currentDate)
      : endOfWeek(currentDate, { weekStartsOn: 1 });
    try {
      const res = await fetch(`/api/calendar/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}`);
      const data = await res.json();
      if (Array.isArray(data)) setEvents(data);
      setGoogleConnected(true);
    } catch {
      setGoogleConnected(false);
    }
    setLoading(false);
  }, [currentDate, view]);

  useEffect(() => {
    fetch('/api/auth/check').then(r => r.json()).then(d => setGoogleConnected(d.googleConnected));
    loadEvents();
  }, [loadEvents]);

  function openNewRdv(day?: Date) {
    const base = day || new Date();
    const start = new Date(base);
    start.setHours(9, 0, 0, 0);
    const end = addHours(start, 1);
    setNewRdv({
      titre: '',
      description: '',
      date_debut: format(start, "yyyy-MM-dd'T'HH:mm"),
      date_fin: format(end, "yyyy-MM-dd'T'HH:mm"),
      client_nom: '',
    });
    setSelectedDay(day || null);
    setShowModal(true);
  }

  async function handleCreateRdv() {
    if (!newRdv.titre || !newRdv.date_debut || !newRdv.date_fin) return;
    setSaving(true);
    const res = await fetch('/api/calendar/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titre: newRdv.titre,
        description: newRdv.description || undefined,
        date_debut: new Date(newRdv.date_debut).toISOString(),
        date_fin: new Date(newRdv.date_fin).toISOString(),
        client_nom: newRdv.client_nom || undefined,
      }),
    });
    if (res.ok) {
      setShowModal(false);
      loadEvents();
      showToast(googleConnected ? 'RDV créé dans Google Calendar' : 'RDV créé localement');
    }
    setSaving(false);
  }

  // ── Month view ──────────────────────────────────────────────
  function renderMonthView() {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let d = calStart;
    while (d <= calEnd) { days.push(d); d = addDays(d, 1); }

    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    return (
      <div className="card overflow-hidden p-0">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {dayNames.map(name => (
            <div key={name} className="text-center text-xs font-semibold text-gray-400 py-2">{name}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayEvents = events.filter(ev => {
              const evDate = parseEventDate(ev);
              return isSameDay(evDate, day);
            });
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isT = isToday(day);

            return (
              <div
                key={i}
                onClick={() => openNewRdv(day)}
                className={`min-h-[60px] p-1 border-r border-b border-gray-50 cursor-pointer hover:bg-blue-50/50 transition-colors ${
                  !isCurrentMonth ? 'bg-gray-50/30' : ''
                }`}
              >
                <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                  isT ? 'bg-[#1B2A6B] text-white' : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  {format(day, 'd')}
                </div>
                {dayEvents.slice(0, 2).map(ev => (
                  <div key={ev.id} className="text-[9px] bg-[#1B2A6B] text-white rounded px-1 py-0.5 mb-0.5 truncate">
                    {ev.start.dateTime ? `${formatTime(ev.start.dateTime)} ` : ''}{ev.summary}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[9px] text-gray-400">+{dayEvents.length - 2}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Week view ──────────────────────────────────────────────
  function renderWeekView() {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="card overflow-x-auto p-0">
        <div className="grid grid-cols-7 border-b border-gray-100 min-w-[500px]">
          {days.map(day => (
            <div
              key={day.toISOString()}
              onClick={() => openNewRdv(day)}
              className={`text-center py-3 cursor-pointer hover:bg-blue-50 transition-colors border-r border-gray-50 last:border-0 ${
                isToday(day) ? 'bg-[#1B2A6B]/5' : ''
              }`}
            >
              <p className="text-xs text-gray-400">{format(day, 'EEE', { locale: fr })}</p>
              <div className={`text-sm font-bold mx-auto mt-1 w-8 h-8 flex items-center justify-center rounded-full ${
                isToday(day) ? 'bg-[#1B2A6B] text-white' : 'text-gray-700'
              }`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 min-w-[500px] min-h-[300px]">
          {days.map(day => {
            const dayEvents = events.filter(ev => isSameDay(parseEventDate(ev), day));
            return (
              <div key={day.toISOString()} className="border-r border-gray-50 last:border-0 p-1.5 space-y-1">
                {dayEvents.map(ev => (
                  <div key={ev.id} className="text-xs bg-[#1B2A6B] text-white rounded-lg p-2">
                    <p className="font-semibold truncate">{ev.summary}</p>
                    {ev.start.dateTime && (
                      <p className="text-blue-200 text-[10px]">{formatTime(ev.start.dateTime)}–{formatTime(ev.end.dateTime)}</p>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white bg-[#1B2A6B]">
          {toast}
        </div>
      )}

      {/* New RDV Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1B2A6B]">Nouveau rendez-vous</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-gray-100">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={newRdv.titre}
                onChange={e => setNewRdv({ ...newRdv, titre: e.target.value })}
                className="input-field"
                placeholder="Titre du rendez-vous *"
              />
              <input
                type="text"
                value={newRdv.client_nom}
                onChange={e => setNewRdv({ ...newRdv, client_nom: e.target.value })}
                className="input-field"
                placeholder="Nom du client (optionnel)"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Début</label>
                  <input
                    type="datetime-local"
                    value={newRdv.date_debut}
                    onChange={e => setNewRdv({ ...newRdv, date_debut: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fin</label>
                  <input
                    type="datetime-local"
                    value={newRdv.date_fin}
                    onChange={e => setNewRdv({ ...newRdv, date_fin: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
              </div>
              <textarea
                value={newRdv.description}
                onChange={e => setNewRdv({ ...newRdv, description: e.target.value })}
                className="input-field resize-none"
                rows={2}
                placeholder="Description (optionnel)"
              />
              {!googleConnected && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
                  Google Calendar non connecté — le RDV sera enregistré localement.
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowModal(false)} className="btn-outline flex-1 text-sm">Annuler</button>
                <button
                  onClick={handleCreateRdv}
                  disabled={saving || !newRdv.titre}
                  className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-[#1B2A6B]">Agenda</h1>
        <div className="flex items-center gap-2">
          {!googleConnected && (
            <a href="/api/google/auth" className="hidden sm:flex text-xs bg-white border border-gray-200 hover:border-[#1B2A6B] text-gray-500 hover:text-[#1B2A6B] px-3 py-2 rounded-xl transition-all items-center gap-1.5">
              Connecter Google
            </a>
          )}
          <button onClick={() => openNewRdv()} className="btn-primary text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="hidden sm:inline">Nouveau RDV</span>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => view === 'month' ? setCurrentDate(subMonths(currentDate, 1)) : setCurrentDate(addDays(currentDate, -7))}
            className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-gray-200 transition-all"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 className="font-bold text-[#1B2A6B] text-base">
            {view === 'month'
              ? format(currentDate, 'MMMM yyyy', { locale: fr })
              : `Semaine du ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: fr })}`
            }
          </h2>
          <button
            onClick={() => view === 'month' ? setCurrentDate(addMonths(currentDate, 1)) : setCurrentDate(addDays(currentDate, 7))}
            className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-gray-200 transition-all"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="text-xs text-[#1B2A6B] hover:underline ml-1">Aujourd'hui</button>
        </div>

        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1">
          {(['month', 'week'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                view === v ? 'bg-[#1B2A6B] text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {v === 'month' ? 'Mois' : 'Semaine'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#1B2A6B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === 'month' ? renderMonthView() : renderWeekView()}
    </AppShell>
  );
}
