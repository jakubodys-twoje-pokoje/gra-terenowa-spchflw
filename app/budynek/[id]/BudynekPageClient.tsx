'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, MapPin, Navigation, Check, Lock, QrCode, Share2, X } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import type { MapBuilding } from '@/components/MapComponent';
import EasterEggPopup, { type EasterEggData } from '@/components/EasterEggPopup';
import { useAuth } from '@/lib/useAuth';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  checza:    { label: '🛖 Chëcza',    color: 'bg-amber-100 text-amber-800' },
  zagroda:   { label: '🏡 Zagroda',   color: 'bg-yellow-100 text-yellow-800' },
  karczma:   { label: '🍺 Karczma',   color: 'bg-orange-100 text-orange-700' },
  pensjonat: { label: '🛏️ Pensjonat', color: 'bg-purple-100 text-purple-700' },
  sakralny:  { label: '⛪ Sakralny',  color: 'bg-blue-100 text-blue-700' },
  natura:    { label: '🌲 Natura',    color: 'bg-green-100 text-green-700' },
  morze:     { label: '🐟 Morze',     color: 'bg-cyan-100 text-cyan-700' },
  historia:  { label: '🏛️ Historia',  color: 'bg-stone-100 text-stone-700' },
};

interface BuildingImage { id: number; url: string; title: string | null; alt: string | null; order: number; }

interface Building {
  id: number;
  number: number | null;
  name: string;
  description: string;
  address: string | null;
  lat: number;
  lng: number;
  imageUrl: string | null;
  outlineImageUrl: string | null;
  category: string;
  qrUrl: string;
  images: BuildingImage[];
}

interface NearbyBuilding {
  id: number;
  name: string;
  lat: number;
  lng: number;
  category: string;
  imageUrl: string | null;
  outlineImageUrl: string | null;
  distanceKm: number;
}

function getUserId(): string {
  let id = localStorage.getItem('speechflow_user_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('speechflow_user_id', id); }
  return id;
}

export default function BudynekPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [building, setBuilding] = useState<Building | null>(null);
  const [nearby, setNearby] = useState<NearbyBuilding[]>([]);
  const [discovered, setDiscovered] = useState(false);
  const [discoveredIds, setDiscoveredIds] = useState<Set<number>>(new Set());
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showAchievementToast, setShowAchievementToast] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; title: string | null; alt: string | null } | null>(null);
  const [easterEgg, setEasterEgg] = useState<EasterEggData | null>(null);

  const load = useCallback(async () => {
    // Logged-in users use their authenticated userId; guests use localStorage UUID
    const userId = user?.userId ?? getUserId();
    const isScan = searchParams.get('scan') === '1';

    // If arriving from QR scan, mark as discovered first
    if (isScan) {
      await fetch('/api/odkrycia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, buildingId: Number(id) }),
      });
    }

    // Fetch building, nearby, and verify discovery status server-side in parallel
    const [bRes, nRes, discRes] = await Promise.all([
      fetch(`/api/budynki/${id}`),
      fetch(`/api/budynki/${id}/najblizsze`),
      fetch(`/api/odkrycia?userId=${userId}`),
    ]);

    if (!bRes.ok) { setNotFound(true); setLoading(false); return; }

    const b: Building = await bRes.json();
    const n: NearbyBuilding[] = nRes.ok ? await nRes.json() : [];
    const discoveries: { building: { id: number; category: string } }[] = discRes.ok ? await discRes.json() : [];

    // Ground-truth discovery check from server — cannot be spoofed via localStorage
    const isDiscovered = discoveries.some((d) => d.building.id === Number(id));

    setBuilding(b);
    setNearby(n);
    setDiscovered(isDiscovered);
    setDiscoveredIds(new Set(discoveries.map((d) => d.building.id)));
    setLoading(false);

    // If not discovered, stop here — locked view will be shown
    if (!isDiscovered) return;

    // Toasts and achievements only on a fresh scan
    if (!isScan) return;

    const celebratedKey = `speechflow_celebrated_${id}`;
    if (localStorage.getItem(celebratedKey)) return;
    localStorage.setItem(celebratedKey, '1');

    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);

    // Check for newly unlocked achievements using DB-based endpoint
    const achRes = await fetch(`/api/osiagniecia?userId=${userId}`);
    if (!achRes.ok) return;

    const allAchievements: Array<{ id: number; name: string; unlocked: boolean }> = await achRes.json();

    // Compare with previously-seen unlocked set stored in localStorage
    const prevKey = `speechflow_prev_ach_${userId}`;
    const prevUnlocked: number[] = JSON.parse(localStorage.getItem(prevKey) ?? '[]');
    const prevSet = new Set(prevUnlocked);

    const justUnlocked = allAchievements.filter((a) => a.unlocked && !prevSet.has(a.id));

    // Persist current unlocked state for future comparisons
    localStorage.setItem(
      prevKey,
      JSON.stringify(allAchievements.filter((a) => a.unlocked).map((a) => a.id)),
    );

    // Check for easter egg triggers
    const eggRes = await fetch('/api/easter-eggs/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        discoveryCount: discoveries.length,
        buildingId: Number(id),
      }),
    });
    if (eggRes.ok) {
      const egg = await eggRes.json();
      if (egg) setTimeout(() => setEasterEgg(egg), 1200);
    }

    if (justUnlocked.length === 0) return;
    setNewAchievements(justUnlocked.map((a) => a.name));

    setTimeout(async () => {
      setShowAchievementToast(true);
      const confetti = (await import('canvas-confetti')).default;
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ['#F5A623', '#0F5F92', '#ffffff', '#FFD700'] });
      setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { y: 0.5 }, angle: 60,  colors: ['#F5A623', '#0F5F92', '#ffffff'] }), 300);
      setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { y: 0.5 }, angle: 120, colors: ['#F5A623', '#0F5F92', '#ffffff'] }), 450);
    }, 800);
  }, [id, searchParams, user]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-ocean-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-4">
        <div className="text-6xl">🔍</div>
        <h2 className="text-xl font-extrabold text-ocean-900">Nie znaleziono miejsca</h2>
        <p className="text-gray-400 text-sm">Ten kod QR nie jest jeszcze zarejestrowany w grze lub budynek został usunięty.</p>
        <button onClick={() => router.push('/')} className="bg-ocean-500 text-white px-6 py-3 rounded-2xl font-bold mt-2">
          Wróć do mapy
        </button>
      </div>
    );
  }

  if (!building) return null;

  // ── LOCKED VIEW ─────────────────────────────────────────────────────────────
  if (!discovered) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Back button */}
        <div className="fixed top-4 left-4 z-30">
          <button onClick={() => router.back()} className="bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow-md">
            <ArrowLeft size={20} className="text-ocean-700" />
          </button>
        </div>

        {/* Blurred / grayscale hero */}
        <div className="relative h-64 overflow-hidden bg-gray-200">
          {(building.outlineImageUrl ?? building.imageUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(building.outlineImageUrl ?? building.imageUrl) ?? ''}
              alt=""
              className="w-full h-full object-cover grayscale blur-sm scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <Lock size={48} className="text-gray-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Lock size={52} className="text-white/90 drop-shadow-lg" />
          </div>
          <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-white to-transparent" />
        </div>

        {/* Content */}
        <div className="px-4 -mt-6 relative z-10 flex-1 flex flex-col">
          <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full', CATEGORY_LABELS[building.category]?.color ?? 'bg-gray-100 text-gray-600')}>
            {CATEGORY_LABELS[building.category]?.label ?? building.category}
          </span>
          <h1 className="text-2xl font-extrabold text-ocean-900 mt-2 leading-tight">{building.name}</h1>
          <p className="text-gray-400 text-sm mt-1">Lokalizacja nieznana — odkryj, by zobaczyć szczegóły</p>

          <div className="bg-ocean-50 border border-ocean-100 rounded-3xl p-5 mt-4 text-center flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-ocean-100 flex items-center justify-center">
              <QrCode size={28} className="text-ocean-500" />
            </div>
            <p className="font-bold text-ocean-900">To miejsce jest jeszcze nieodkryte</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              Znajdź to miejsce w Karwi i zeskanuj kod QR, żeby odblokować pełne informacje.
            </p>
            <button
              onClick={() => router.push('/skanuj')}
              className="mt-1 bg-ocean-500 text-white px-6 py-3 rounded-2xl font-bold text-sm w-full"
            >
              Skanuj kod QR
            </button>
            <button
              onClick={() => router.push('/')}
              className="text-ocean-400 text-sm font-semibold"
            >
              Wróć do mapy
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── DISCOVERED VIEW ──────────────────────────────────────────────────────────
  const cat = CATEGORY_LABELS[building.category] ?? { label: building.category, color: 'bg-gray-100 text-gray-600' };
  const mapBuildings: MapBuilding[] = [
    { id: building.id, name: building.name, lat: building.lat, lng: building.lng, discovered: true, isActive: true },
    ...nearby.map((n) => ({ id: n.id, name: n.name, lat: n.lat, lng: n.lng, discovered: false })),
  ];

  return (
    <div className="min-h-screen">
      {/* Back button */}
      <div className="fixed top-4 left-4 z-30">
        <button onClick={() => router.back()} className="bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow-md">
          <ArrowLeft size={20} className="text-ocean-700" />
        </button>
      </div>

      {/* Hero image */}
      <div className="relative h-64 bg-gradient-to-br from-ocean-300 to-ocean-600 overflow-hidden">
        {building.imageUrl ? (
          <button type="button" className="w-full h-full" onClick={() => setLightbox({ src: building.imageUrl!, title: null, alt: building.name })}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={building.imageUrl} alt={building.name} className="w-full h-full object-cover" />
          </button>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-7xl">🏛️</div>
        )}
        <div className="absolute top-4 right-4 bg-ocean-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg">
          <Check size={12} strokeWidth={3} />
          Odkryto!
        </div>
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </div>

      {/* Content */}
      <div className="px-4 -mt-6 relative z-10">
        <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full', cat.color)}>{cat.label}</span>
        <h1 className="text-2xl font-extrabold text-ocean-900 mt-2 leading-tight">{building.name}</h1>
        {building.address && (
          <p className="flex items-center gap-1.5 text-gray-400 text-sm mt-1">
            <MapPin size={14} />
            {building.address}
          </p>
        )}

        {/* Description */}
        <div className="bg-white rounded-3xl p-5 mt-4 shadow-card">
          <div
            className="prose prose-sm max-w-none text-gray-600 leading-relaxed"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: building.description }}
          />
        </div>

        {/* Gallery */}
        {building.images.length > 0 && (
          <div className="mt-4">
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
              {building.images.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setLightbox({ src: img.url, title: img.title, alt: img.alt })}
                  className="shrink-0 w-64 rounded-2xl overflow-hidden shadow-card snap-start active:scale-95 transition-transform"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt ?? img.title ?? building.name} className="w-full h-44 object-cover" />
                  {img.title && (
                    <p className="px-3 py-2 text-xs font-semibold text-ocean-900 text-left bg-white leading-snug">{img.title}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Share on Facebook */}
        <button
          onClick={() => {
            const url = `${window.location.origin}/budynek/${building.id}`;
            const text = `Właśnie odkryłem ${building.name} w Karwi! Dołącz do gry terenowej ⚓`;
            if (navigator.share) {
              navigator.share({ title: text, url });
            } else {
              window.open(
                `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
                '_blank', 'width=600,height=400',
              );
            }
          }}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-[#1877F2] hover:bg-[#166FE5] text-white py-3 rounded-2xl font-bold text-sm transition"
        >
          <Share2 size={15} />
          Udostępnij na Facebooku
        </button>

        {/* Nearest buildings — ABOVE the map */}
        {nearby.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-ocean-500 mb-3 flex items-center gap-2">
              <Navigation size={14} />
              Najbliższe miejsca
            </h2>
            <div className="space-y-3">
              {nearby.map((n) => {
                const nearbyDiscovered = discoveredIds.has(n.id);
                const nearbyImgSrc = nearbyDiscovered
                  ? n.imageUrl
                  : (n.outlineImageUrl ?? n.imageUrl);
                return (
                  <Link key={n.id} href={`/budynek/${n.id}`}>
                    <div className="bg-white rounded-2xl p-4 shadow-card flex items-center gap-3 hover:shadow-card-hover transition-all">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-ocean-100 shrink-0">
                        {nearbyImgSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={nearbyImgSrc} alt={n.name} className={`w-full h-full object-cover ${nearbyDiscovered ? '' : 'grayscale'}`} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Lock size={18} className="text-gray-300" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ocean-900 text-sm truncate">{n.name}</p>
                        <p className="text-gray-400 text-xs mt-0.5">
                          {n.distanceKm < 1 ? `${Math.round(n.distanceKm * 1000)} m` : `${n.distanceKm.toFixed(1)} km`} stąd
                        </p>
                      </div>
                      <span className="text-ocean-300">›</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Static map — bottom, bigger, zoom out to show the sea */}
        <div className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-ocean-500 mb-3 flex items-center gap-2">
            <MapPin size={14} />
            Lokalizacja
          </h2>
          <div className="rounded-3xl overflow-hidden shadow-card">
            <MapComponent
              buildings={mapBuildings}
              center={[building.lat, building.lng]}
              zoom={14}
              height="240px"
              interactive={false}
            />
          </div>
        </div>

        <div className="pb-8" />
      </div>

      {/* Toast – discovered */}
      {showToast && (
        <div className="fixed top-16 inset-x-4 z-50 bg-ocean-600 text-white px-5 py-4 rounded-3xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="font-bold text-sm">Miejsce odkryte!</p>
            <p className="text-ocean-200 text-xs">{building.name} zostało dodane do Twoich odkryć</p>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[950] bg-black/95 flex flex-col items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute top-5 right-5 text-white/60 hover:text-white transition p-2"
            onClick={() => setLightbox(null)}
            aria-label="Zamknij"
          >
            <X size={30} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.src}
            alt={lightbox.alt ?? lightbox.title ?? ''}
            className="max-w-full max-h-[80vh] object-contain select-none"
            onClick={(e) => e.stopPropagation()}
          />
          {(lightbox.title || lightbox.alt) && (
            <div className="mt-3 px-6 text-center" onClick={(e) => e.stopPropagation()}>
              {lightbox.title && <p className="text-white font-semibold text-sm">{lightbox.title}</p>}
              {lightbox.alt && <p className="text-white/60 text-xs mt-0.5">{lightbox.alt}</p>}
            </div>
          )}
        </div>
      )}

      {/* Achievement popup */}
      {showAchievementToast && (
        <div className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-50 animate-in zoom-in-90 slide-in-from-bottom-8 duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-amber-400 to-yellow-300 px-6 pt-7 pb-5 text-center">
              <div className="text-7xl leading-none mb-2">🏆</div>
              <p className="text-amber-900 font-extrabold text-xs uppercase tracking-widest">Nowa odznaka odblokowana!</p>
            </div>
            <div className="px-6 py-5 text-center">
              <p className="text-ocean-900 font-extrabold text-xl leading-tight">{newAchievements.join(' & ')}</p>
              <p className="text-gray-400 text-sm mt-2">Świetna robota! Kontynuuj eksplorację Karwi.</p>
              <button
                onClick={() => {
                  const text = `Właśnie zdobyłem odznakę „${newAchievements.join(' & ')}" w grze terenowej w Karwi! Dołącz do zabawy 🏆`;
                  const url = `${window.location.origin}/budynek/${building.id}`;
                  if (navigator.share) {
                    navigator.share({ title: text, text, url }).catch(() => {});
                  } else {
                    window.open(
                      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
                      '_blank', 'noopener,noreferrer,width=600,height=500',
                    );
                  }
                }}
                className="mt-5 w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2"
              >
                <Share2 size={15} />
                Udostępnij osiągnięcie
              </button>
              <button
                onClick={() => setShowAchievementToast(false)}
                className="mt-2.5 w-full bg-ocean-500 text-white py-3 rounded-2xl font-bold text-sm hover:bg-ocean-600 transition"
              >
                Hurra! 🎉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Easter Egg popup */}
      {easterEgg && (
        <EasterEggPopup egg={easterEgg} onClose={() => setEasterEgg(null)} />
      )}
    </div>
  );
}
