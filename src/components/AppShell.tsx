'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from './Navigation';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/check').then(r => r.json()).then(d => {
      if (!d.authenticated) {
        router.replace('/login');
      } else {
        setReady(true);
      }
    });
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa]">
        <div className="w-8 h-8 border-3 border-[#1B2A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navigation />
      {/* Main content — offset for sidebar on desktop, bottom nav on mobile */}
      <main className="lg:ml-64 pb-24 lg:pb-6 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-6 fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
