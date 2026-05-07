'use client';

import { useEffect, useState } from 'react';
import { Share, Plus, Download, Smartphone, X } from 'lucide-react';

type Platform = 'android' | 'ios' | null;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'speechflow_install_dismissed';
// Don't re-show for 14 days after dismissal
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
  const isAndroid = /Android/.test(ua);
  if (isIos) return 'ios';
  if (isAndroid) return 'android';
  return null;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [platform, setPlatform] = useState<Platform>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const p = detectPlatform();
    if (!p) return;
    if (isStandalone()) return;
    if (wasDismissedRecently()) return;

    setPlatform(p);

    if (p === 'android') {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        scheduleShow();
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }

    if (p === 'ios') {
      // iOS: show manual instructions after a delay
      scheduleShow();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scheduleShow() {
    // Show after 90 seconds — user has had time to explore the app
    const t = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => setAnimateIn(true));
    }, 120_000);
    return () => clearTimeout(t);
  }

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* ignore */ }
    setAnimateIn(false);
    setTimeout(() => setVisible(false), 320);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setInstalling(false);
    if (outcome === 'accepted') {
      dismiss();
    }
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

      {/* Sheet */}
      <div
        className={[
          'fixed bottom-0 inset-x-0 z-[1001] bg-white rounded-t-[2rem] shadow-2xl',
          'md:inset-x-auto md:left-1/2 md:bottom-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[400px] md:rounded-[2rem]',
          'transition-all duration-300 ease-out',
          animateIn
            ? 'translate-y-0 md:scale-100 opacity-100'
            : 'translate-y-full md:translate-y-0 md:scale-95 opacity-0',
        ].join(' ')}
      >
        {/* Handle + close */}
        <div className="flex items-center justify-between pt-3 px-3 pb-1">
          <div className="md:hidden w-10 h-1 rounded-full bg-gray-200 mx-auto" />
          <button onClick={dismiss} className="ml-auto p-1.5 rounded-full text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Hero */}
        <div className="bg-gradient-to-br from-ocean-500 to-ocean-700 mx-4 mt-2 rounded-2xl px-5 py-4 text-white flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-xl font-black text-white leading-none">
            SF
          </div>
          <div>
            <h2 className="text-base font-extrabold leading-tight">Dodaj skrót na ekran</h2>
            <p className="text-ocean-200 text-xs mt-0.5">Szybki dostęp do gry w jednym kliknięciu</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 pt-4 pb-2">
          {platform === 'android' && (
            <ul className="space-y-3">
              {[
                { icon: Smartphone, text: 'Działa jak aplikacja — bez paska przeglądarki' },
                { icon: Download, text: 'Ładuje się szybciej po pierwszym dodaniu' },
                { icon: Plus, text: 'Ikona pojawi się na ekranie głównym telefonu' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="w-7 h-7 rounded-xl bg-ocean-50 flex items-center justify-center shrink-0">
                    <Icon size={14} className="text-ocean-500" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          )}

          {platform === 'ios' && (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Dodaj aplikację do ekranu głównego, żeby uruchamiać ją jak natywną apkę:
              </p>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-ocean-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span className="text-sm text-gray-600">
                    Naciśnij ikonę{' '}
                    <span className="inline-flex items-center gap-1 bg-gray-100 rounded-lg px-1.5 py-0.5 text-gray-700 font-medium">
                      <Share size={12} />
                      Udostępnij
                    </span>{' '}
                    na dole Safari
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-ocean-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span className="text-sm text-gray-600">
                    Wybierz{' '}
                    <span className="inline-flex items-center gap-1 bg-gray-100 rounded-lg px-1.5 py-0.5 text-gray-700 font-medium">
                      <Plus size={12} />
                      Dodaj do ekranu głównego
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-ocean-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span className="text-sm text-gray-600">Naciśnij <strong>Dodaj</strong> w prawym górnym rogu</span>
                </li>
              </ol>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+72px)] md:pb-6 space-y-2">
          {platform === 'android' && (
            <button
              onClick={handleInstall}
              disabled={installing}
              className="w-full bg-ocean-500 hover:bg-ocean-600 disabled:opacity-60 text-white py-3 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2"
            >
              <Download size={16} />
              {installing ? 'Instalowanie…' : 'Dodaj do ekranu głównego'}
            </button>
          )}

          <button
            onClick={dismiss}
            className="w-full py-2.5 text-gray-400 text-sm font-semibold hover:text-gray-600 transition"
          >
            {platform === 'ios' ? 'Rozumiem, dziękuję' : 'Nie teraz'}
          </button>
        </div>
      </div>
    </>
  );
}
