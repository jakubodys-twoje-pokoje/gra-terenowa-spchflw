'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { UserPlus, LogIn, ArrowRight, MapPin, Trophy, Smartphone, Ticket } from 'lucide-react';

const STORAGE_KEY = 'speechflow_welcomed';

const BENEFITS = [
  { icon: Smartphone, text: 'Zachowaj postęp na każdym urządzeniu' },
  { icon: Trophy,     text: 'Dołącz do rankingu odkrywców' },
  { icon: MapPin,     text: 'Zbieraj odznaki i śledź trasę odkryć' },
];

export default function WelcomeModal() {
  const { user, loading } = useAuth();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  // Never show on admin or mid-scan redirect
  const skip =
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    searchParams.get('scan') === '1';

  useEffect(() => {
    if (skip) return;
    if (loading) return;       // wait for auth check
    if (user) return;          // logged in — no popup

    const seen = sessionStorage.getItem(STORAGE_KEY);
    if (seen) return;          // already shown this session

    // Small delay so the map/page renders first
    const t = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => setAnimateIn(true));
    }, 600);
    return () => clearTimeout(t);
  }, [loading, user, skip]);

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, '1');
    window.dispatchEvent(new CustomEvent('speechflow:welcome-dismissed'));
    setAnimateIn(false);
    setTimeout(() => setVisible(false), 320);
  };

  const go = (path: string) => {
    dismiss();
    router.push(path);
  };

  const goRegister = () => {
    const guestId = typeof window !== 'undefined' ? (localStorage.getItem('speechflow_user_id') ?? '') : '';
    go(`/rejestracja?guest=${guestId}`);
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={dismiss}
        className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: animateIn ? 1 : 0 }}
      />

      {/* Sheet / card */}
      <div
        className={[
          // mobile: bottom sheet
          'fixed bottom-0 inset-x-0 z-[1001] bg-white rounded-t-[2rem] shadow-2xl',
          // desktop: centered card
          'md:inset-x-auto md:left-1/2 md:bottom-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px] md:rounded-[2rem]',
          // animation
          'transition-all duration-300 ease-out',
          animateIn
            ? 'translate-y-0 md:scale-100 opacity-100'
            : 'translate-y-full md:translate-y-0 md:scale-95 opacity-0',
        ].join(' ')}
      >
        {/* Handle (mobile) */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Hero */}
        <div className="bg-gradient-to-br from-ocean-500 to-ocean-700 mx-4 mt-2 rounded-2xl px-5 py-3 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-2xl font-black text-white leading-none">
              SF
            </div>
            <div>
              <h2 className="text-base font-extrabold leading-tight">SpeechFlow – Gra Terenowa</h2>
              <p className="text-ocean-200 text-xs mt-0.5">Odkrywaj miejsca istotne logopedycznie</p>
            </div>
          </div>
        </div>

        {/* Prize banner */}
        <div className="mx-4 mt-3 rounded-2xl bg-gradient-to-r from-sand-500 to-sand-600 px-4 py-3 flex items-center gap-3">
          <Ticket size={22} className="text-white shrink-0" />
          <div>
            <p className="text-white text-xs font-extrabold leading-tight">Nagroda główna: 2 wejściówki na SpeechLab 2026</p>
            <p className="text-white/80 text-[11px] mt-0.5">30 maja 2026 · Golden Floor Tower, Warszawa</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 pt-3 pb-1">
          <ul className="space-y-2">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-sm text-gray-600">
                <span className="w-7 h-7 rounded-xl bg-ocean-50 flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-ocean-500" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+72px)] md:pb-5 space-y-2">
          <button
            onClick={goRegister}
            className="w-full bg-ocean-500 hover:bg-ocean-600 text-white py-3 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2"
          >
            <UserPlus size={16} />
            Zarejestruj się
          </button>

          <button
            onClick={() => go('/login')}
            className="w-full bg-ocean-50 hover:bg-ocean-100 text-ocean-700 py-3 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2"
          >
            <LogIn size={16} />
            Zaloguj się
          </button>

          <button
            onClick={dismiss}
            className="w-full py-2.5 text-gray-400 text-sm font-semibold hover:text-gray-600 transition flex items-center justify-center gap-1.5"
          >
            Kontynuuj jako gość
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </>
  );
}
