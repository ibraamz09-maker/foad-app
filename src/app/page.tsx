'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated) {
          router.replace('/dashboard');
        } else {
          router.replace('/login');
        }
      });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1B2A6B]">
      <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
