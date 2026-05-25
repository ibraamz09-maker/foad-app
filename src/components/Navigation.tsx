'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  {
    href: '/dashboard',
    label: 'Tableau de bord',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'stroke-white' : 'stroke-current'}`} fill="none" strokeWidth={2} viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/devis',
    label: 'Devis',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'stroke-white' : 'stroke-current'}`} fill="none" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
  },
  {
    href: '/agenda',
    label: 'Agenda',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'stroke-white' : 'stroke-current'}`} fill="none" strokeWidth={2} viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    href: '/suivi',
    label: 'Suivi',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'stroke-white' : 'stroke-current'}`} fill="none" strokeWidth={2} viewBox="0 0 24 24">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-[#1B2A6B] text-white z-50">
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <span className="text-[#1B2A6B] font-black text-sm">FA</span>
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">Foad Amenzou</p>
            <p className="text-blue-300 text-xs">Auto-entrepreneur</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-blue-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.icon(active)}
                <span className="text-sm">{item.label}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 bg-[#C0392B] rounded-full" />}
              </Link>
            );
          })}
        </nav>

        {/* Quick action */}
        <div className="px-4 pb-4">
          <Link
            href="/devis/nouveau"
            className="flex items-center justify-center gap-2 bg-[#C0392B] hover:bg-[#e74c3c] text-white font-semibold px-4 py-3 rounded-xl transition-all duration-200 text-sm w-full mb-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nouveau devis
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-blue-300 hover:text-white text-xs px-4 py-2 rounded-xl hover:bg-white/10 transition-all w-full"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 safe-area-pb">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map(item => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                  active ? 'text-white' : 'text-gray-400'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-[#1B2A6B]' : ''}`}>
                  {item.icon(active)}
                </div>
                <span className={`text-[10px] font-medium ${active ? 'text-[#1B2A6B]' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
