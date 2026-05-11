'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { UserPlus, LogIn, MapPin, Trophy, Smartphone, Ticket } from 'lucide-react';

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

  const [visible, setVisible]   = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  const skip =
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/login' ||
    pathname === '/rejestracja' ||
    pathname === '/weryfikacja' ||
    searchParams.get('scan') === '1';

  useEffect(() => {
    if (skip) return;
    if (loading) return;
    if (user) return;

    // Show every visit — no session storage skip, registration is required
    const t = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => setAnimateIn(true));
    }, 600);
    return () => clearTimeout(t);
  }, [loading, user, skip]);

  const goRegister = () => {
    setAnimateIn(false);
    setTimeout(() => setVisible(false), 320);
    router.push('/rejestracja');
  };

  const goLogin = () => {
    setAnimateIn(false);
    setTimeout(() => setVisible(false), 320);
    router.push('/login');
  };

  if (!visible) return null;

  return (
    <>
      {/* Non-clickable backdrop — no guest dismiss */}
      <div
        className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: animateIn ? 1 : 0 }}
      />

      {/* Sheet / card */}
      <div
        className={[
          'fixed bottom-0 inset-x-0 z-[1001] bg-white rounded-t-[2rem] shadow-2xl',
          'md:inset-x-auto md:left-1/2 md:bottom-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px] md:rounded-[2rem]',
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
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 overflow-hidden p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/speechflow-logo.png" alt="SpeechFlow" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-base font-extrabold leading-tight">SpeechFlow – Gra Terenowa</h2>
              <p className="text-white/70 text-xs mt-0.5">Odkrywaj miejsca istotne logopedycznie</p>
            </div>
          </div>
        </div>

        {/* Prize banner */}
        <div className="mx-4 mt-3 rounded-2xl bg-gradient-to-r from-ocean-400 to-ocean-500 px-4 py-3 flex items-center gap-3">
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
            onClick={goLogin}
            className="w-full bg-ocean-50 hover:bg-ocean-100 text-ocean-700 py-3 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2"
          >
            <LogIn size={16} />
            Mam już konto — zaloguj się
          </button>
        </div>
      </div>
    </>
  );
}
