'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { QrCode, MapPin, ChevronDown, ExternalLink, Navigation, Crosshair, HelpCircle, X } from 'lucide-react';
import type { MapBuilding, MapHandle, MapPlayer } from '@/components/MapComponent';
import { useAuth } from '@/lib/useAuth';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

interface Building {
  id: number;
  name: string;
  description: string;
  address: string | null;
  lat: number;
  lng: number;
  imageUrl: string | null;
  outlineImageUrl: string | null;
  category: string;
  hidden: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  poradnia:    '🏥 Poradnia',
  szkola:      '🏫 Szkoła',
  przedszkole: '🎒 Przedszkole',
  uczelnia:    '🎓 Uczelnia',
  centrum:     '🏢 Centrum',
  historia:    '🏛️ Historia',
  kultura:     '🎭 Kultura',
  instytut:    '🔬 Instytut',
};

function getUserId(): string {
  let id = localStorage.getItem('speechflow_user_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('speechflow_user_id', id); }
  return id;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Behavioural tip generator ─────────────────────────────────────────────────
function generateTip(
  buildings: Building[],
  discoveredIds: Set<number>,
  userPos: [number, number] | null,
  leaderNickname: string | null,
  isGuest: boolean,
): { text: string; icon: string } | null {
  const total = buildings.length;
  if (total === 0) return null;

  const discovered = discoveredIds.size;
  const remaining  = total - discovered;
  type C = { text: string; icon: string; w: number };
  const pool: C[] = [];

  // ── GPS proximity
  if (userPos && remaining > 0) {
    const undiscovered = buildings.filter((b) => !discoveredIds.has(b.id));
    let nearest = undiscovered[0];
    let minDist = haversineKm(userPos[0], userPos[1], nearest.lat, nearest.lng);
    for (const b of undiscovered) {
      const d = haversineKm(userPos[0], userPos[1], b.lat, b.lng);
      if (d < minDist) { minDist = d; nearest = b; }
    }
    if (minDist < 0.15) {
      pool.push({ text: `Jesteś ${Math.round(minDist * 1000)} m od nieodkrytego miejsca — już prawie!`, icon: '🎯', w: 6 });
    } else if (minDist < 0.5) {
      pool.push({ text: `Tylko ${Math.round(minDist * 1000)} m do najbliższego nieodkrytego miejsca`, icon: '📍', w: 4 });
    } else if (minDist < 1.5) {
      pool.push({ text: `Najbliższe nieodkryte miejsce jest ${Math.round(minDist * 1000)} m stąd`, icon: '🧭', w: 2 });
    }
  }

  // ── Almost done
  if (remaining === 0) {
    pool.push({ text: 'Odkryłeś wszystkie miejsca! Jesteś mistrzem logopedycznej mapy! 🎟️', icon: '🎉', w: 10 });
  } else if (remaining === 1) {
    pool.push({ text: 'Zostało Ci tylko 1 nieodkryte miejsce — idź po nie!', icon: '🏆', w: 6 });
  } else if (remaining === 2) {
    pool.push({ text: 'Tylko 2 miejsca dzielą Cię od kompletnej kolekcji!', icon: '🌟', w: 4 });
  } else if (remaining <= 5) {
    pool.push({ text: `Zostało Ci tylko ${remaining} miejsc — koniec blisko!`, icon: '⚡', w: 3 });
  }

  // ── Category completion hints
  for (const [cat, label] of Object.entries(CATEGORY_LABELS)) {
    const catBuildings  = buildings.filter((b) => b.category === cat);
    if (catBuildings.length < 2) continue;
    const catDiscovered = catBuildings.filter((b) => discoveredIds.has(b.id)).length;
    const catRemaining  = catBuildings.length - catDiscovered;
    if (catDiscovered > 0 && catRemaining === 1) {
      pool.push({ text: `Jedno miejsce do kompletu w kategorii ${label}!`, icon: '📌', w: 3 });
    } else if (catDiscovered > 0 && catRemaining > 0 && catRemaining <= 3) {
      pool.push({ text: `${label}: brakuje Ci ${catRemaining} miejsc do kompletu`, icon: '📊', w: 1 });
    }
  }

  // ── Progress
  if (discovered > 0 && remaining > 0) {
    const pct = Math.round((discovered / total) * 100);
    pool.push({ text: `Odkryłeś ${discovered} z ${total} miejsc — ${pct}% mapy zbadane!`, icon: '🗺️', w: 1 });
  }

  // ── Leaderboard
  if (leaderNickname) {
    pool.push({ text: `${leaderNickname} prowadzi w rankingu — spróbuj go dogonić!`, icon: '🥇', w: 1 });
  }

  // ── Generic
  if (remaining > 0) {
    pool.push({ text: `Na mapie kryje się jeszcze ${remaining} nieodkrytych miejsc...`, icon: '🔍', w: 1 });
    pool.push({ text: `Odkryj wszystkie miejsca i walcz o 2 wejściówki na SpeechLab 2026! 🎟️`, icon: '🏆', w: 2 });
  }

  // ── Guest nudge
  if (isGuest && discovered >= 3) {
    pool.push({ text: 'Zarejestruj się, żeby zachować swoje odkrycia na zawsze!', icon: '💾', w: 1 });
  }

  if (pool.length === 0) return null;

  const totalW = pool.reduce((s, c) => s + c.w, 0);
  let r = Math.random() * totalW;
  for (const c of pool) { r -= c.w; if (r <= 0) return { text: c.text, icon: c.icon }; }
  return pool[pool.length - 1];
}

// ─────────────────────────────────────────────────────────────────────────────
export default function MapPage() {
  const [buildings, setBuildings]         = useState<Building[]>([]);
  const [discoveredIds, setDiscoveredIds] = useState<Set<number>>(new Set());
  const [selected, setSelected]           = useState<Building | null>(null);
  const [sheetOpen, setSheetOpen]         = useState(false);
  const [nearestToast, setNearestToast]   = useState('');
  const [nearestLoading, setNearestLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [activeTip, setActiveTip]         = useState<{ text: string; icon: string } | null>(null);
  const [leaderNickname, setLeaderNickname] = useState<string | null>(null);
  const [players, setPlayers] = useState<MapPlayer[]>([]);
  const sheetRef       = useRef<HTMLDivElement>(null);
  const mapHandle      = useRef<MapHandle | null>(null);
  const userPosRef     = useRef<[number, number] | null>(null);
  const geoWatchIdRef  = useRef<number | null>(null);
  const tipTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router         = useRouter();
  const { user }       = useAuth();

  // Always-fresh snapshot for timer callbacks (avoids stale closure)
  const snapRef = useRef({ buildings, discoveredIds, sheetOpen, showInstructions, leaderNickname, user });
  snapRef.current = { buildings, discoveredIds, sheetOpen, showInstructions, leaderNickname, user };

  // Clean up GPS watch + tip timer when component unmounts
  useEffect(() => {
    return () => {
      if (geoWatchIdRef.current !== null) navigator.geolocation?.clearWatch(geoWatchIdRef.current);
      if (tipTimerRef.current !== null) clearTimeout(tipTimerRef.current);
    };
  }, []);

  // Poll other players every 30s
  useEffect(() => {
    const poll = () => fetch('/api/gracze').then(r => r.ok ? r.json() : []).then(setPlayers).catch(() => {});
    poll();
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, []);

  // Send own position every 30s when showOnMap is enabled
  useEffect(() => {
    if (!user?.showOnMap) return;
    const send = () => {
      if (!userPosRef.current) return;
      const [lat, lng] = userPosRef.current;
      fetch('/api/lokalizacja', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat, lng }) }).catch(() => {});
    };
    send();
    const id = setInterval(send, 30_000);
    return () => {
      clearInterval(id);
      // Clear location when leaving map or disabling
      fetch('/api/lokalizacja', { method: 'DELETE' }).catch(() => {});
    };
  }, [user?.showOnMap]);

  const load = useCallback(async () => {
    const userId = user?.userId ?? getUserId();
    const [bRes, dRes] = await Promise.all([
      fetch('/api/budynki'),
      fetch(`/api/odkrycia?userId=${userId}`),
    ]);
    const allBuildings: Building[] = bRes.ok ? await bRes.json() : [];
    const discoveries = dRes.ok ? await dRes.json() : [];
    setBuildings(allBuildings);
    setDiscoveredIds(new Set(discoveries.map((d: { building: { id: number } }) => d.building.id)));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Fetch top leaderboard name for tips
  useEffect(() => {
    fetch('/api/ranking')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.ranking?.[0]?.nickname) setLeaderNickname(data.ranking[0].nickname); })
      .catch(() => {});
  }, []);

  // Show instructions after welcome modal is dismissed (guest flow)
  useEffect(() => {
    const onDismissed = () => {
      if (!localStorage.getItem('speechflow_instructions_shown')) {
        setTimeout(() => setShowInstructions(true), 380);
      }
    };
    window.addEventListener('speechflow:welcome-dismissed', onDismissed);
    return () => window.removeEventListener('speechflow:welcome-dismissed', onDismissed);
  }, []);

  // Show instructions for logged-in users on first visit (no welcome modal shown to them)
  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem('speechflow_instructions_shown')) return;
    setShowInstructions(true);
  }, [user]);

  const closeInstructions = () => {
    localStorage.setItem('speechflow_instructions_shown', '1');
    setShowInstructions(false);
  };

  // ── Behavioural tip rotation ─────────────────────────────────────────────────
  useEffect(() => {
    const TIP_SHOW_MS  = 6500;
    const MIN_DELAY_MS = 35_000;
    const MAX_DELAY_MS = 80_000;
    const FIRST_MS     = 22_000;

    const schedule = (delayMs: number) => {
      tipTimerRef.current = setTimeout(() => {
        const { buildings, discoveredIds, sheetOpen, showInstructions, leaderNickname, user } = snapRef.current;
        if (!sheetOpen && !showInstructions) {
          const tip = generateTip(buildings, discoveredIds, userPosRef.current, leaderNickname, !user);
          if (tip) {
            setActiveTip(tip);
            setTimeout(() => setActiveTip(null), TIP_SHOW_MS);
          }
        }
        schedule(MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));
      }, delayMs);
    };

    schedule(FIRST_MS + Math.random() * 8_000);
    return () => { if (tipTimerRef.current) clearTimeout(tipTimerRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBuildingClick = useCallback((id: number) => {
    const b = buildings.find((x) => x.id === id);
    if (!b) return;
    setSelected(b);
    setSheetOpen(true);
  }, [buildings]);

  const closeSheet = () => setSheetOpen(false);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
      closeSheet();
    }
  };

  // ── Center on user ────────────────────────────────────────────────────────
  // watchPosition is called DIRECTLY inside the onClick handler so iOS Safari
  // treats it as a user gesture and shows the location-permission dialog.
  // Any indirection through refs or async chains breaks this on iOS 13+.
  const handleCenterOnUser = () => {
    if (!navigator.geolocation) return;

    // Start watching if not already (direct call = iOS user-gesture context)
    if (geoWatchIdRef.current === null) {
      const avatarUrl = user?.avatarUrl ?? null;
      geoWatchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          userPosRef.current = [latitude, longitude];
          mapHandle.current?.updateUserMarker(latitude, longitude, avatarUrl);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
      );
    }

    // Pan to last known position instantly; first-fix centering handled in MapComponent
    if (userPosRef.current) {
      mapHandle.current?.panTo(userPosRef.current[0], userPosRef.current[1], 17);
    }
  };

  // ── Nearest building — uses cached position, no GPS cold-start ───────────
  const handleNearest = () => {
    if (buildings.length === 0) return;

    const doFind = (latitude: number, longitude: number) => {
      const pool = buildings.filter((b) => !discoveredIds.has(b.id));
      const candidates = pool.length > 0 ? pool : buildings;

      let nearest = candidates[0];
      let minDist = haversineKm(latitude, longitude, nearest.lat, nearest.lng);
      candidates.forEach((b) => {
        const d = haversineKm(latitude, longitude, b.lat, b.lng);
        if (d < minDist) { minDist = d; nearest = b; }
      });

      mapHandle.current?.panTo(nearest.lat, nearest.lng, 19);
      setSelected(nearest);
      setSheetOpen(true);
      setNearestLoading(false);

      const distLabel = minDist < 1
        ? `${Math.round(minDist * 1000)} m`
        : `${minDist.toFixed(1)} km`;
      setNearestToast(
        pool.length === 0
          ? `📍 ${nearest.name} – ${distLabel} stąd (wszystkie odkryte!)`
          : `🔍 Najbliższy nieodkryty – ${distLabel} stąd`,
      );
      setTimeout(() => setNearestToast(''), 4000);
    };

    // If we already have a cached position — instant
    if (userPosRef.current) {
      doFind(userPosRef.current[0], userPosRef.current[1]);
      return;
    }

    if (!navigator.geolocation) {
      setNearestToast('Twoja przeglądarka nie obsługuje GPS');
      setTimeout(() => setNearestToast(''), 3000);
      return;
    }

    setNearestLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        userPosRef.current = [latitude, longitude];
        doFind(latitude, longitude);
      },
      () => {
        setNearestLoading(false);
        setNearestToast('Nie udało się pobrać lokalizacji — sprawdź uprawnienia GPS');
        setTimeout(() => setNearestToast(''), 4000);
      },
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: true },
    );
  };

  const mapBuildings: MapBuilding[] = buildings
    .filter((b) => !b.hidden || discoveredIds.has(b.id))
    .map((b) => ({
      id: b.id, name: b.name, lat: b.lat, lng: b.lng,
      discovered: discoveredIds.has(b.id),
      imageUrl: b.imageUrl, outlineImageUrl: b.outlineImageUrl,
    }));

  const isDiscovered = selected ? discoveredIds.has(selected.id) : false;

  return (
    <div className="relative h-full overflow-hidden isolate">
      {/* Full-screen map */}
      <MapComponent
        buildings={mapBuildings}
        players={players.filter(p => p.userId !== user?.userId)}
        height="100%"
        zoom={19}
        showUserLocation
        userAvatarUrl={user?.avatarUrl}
        onBuildingClick={handleBuildingClick}
        onMapReady={(h) => { mapHandle.current = h; }}
      />

      {/* Behavioural tip bubble — full width strip at top */}
      {activeTip && (
        <div className="absolute top-4 inset-x-4 z-[499] pointer-events-none animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-md px-3.5 py-2.5 flex items-center gap-2.5">
            <span className="text-base shrink-0">{activeTip.icon}</span>
            <p className="text-xs font-semibold text-ocean-900 leading-snug">{activeTip.text}</p>
          </div>
        </div>
      )}

      {/* ── Map controls — full-width row with counter on the left ── */}
      <div className="absolute bottom-20 inset-x-4 z-[500] flex items-center justify-between">
        {/* Discovery counter — left, styled like buttons */}
        {buildings.length > 0 && (
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg px-3.5 py-3 flex items-center gap-2">
            <MapPin size={18} className="text-ocean-500" />
            <span className="text-xs font-bold text-ocean-800 leading-none">
              {discoveredIds.size} / {buildings.length}
            </span>
          </div>
        )}

        {/* Right-side buttons */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Nearest undiscovered building */}
          <button
            onClick={handleNearest}
            disabled={nearestLoading || buildings.length === 0}
            className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg px-3.5 py-3 flex items-center gap-2 hover:bg-white active:scale-95 transition-all disabled:opacity-50"
            title="Najbliższy nieodkryty obiekt"
          >
            <Navigation size={18} className={`text-ocean-500 ${nearestLoading ? 'animate-pulse' : ''}`} />
            <span className="text-xs font-bold text-ocean-800 leading-none">Najbliżej</span>
          </button>

          {/* Center on user */}
          <button
            onClick={handleCenterOnUser}
            className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 flex items-center justify-center hover:bg-white active:scale-95 transition-all"
            title="Moja lokalizacja"
          >
            <Crosshair size={18} className="text-ocean-500" />
          </button>

          {/* Help / instructions */}
          <button
            onClick={() => setShowInstructions(true)}
            className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 flex items-center justify-center hover:bg-white active:scale-95 transition-all"
            title="Jak grać?"
          >
            <HelpCircle size={18} className="text-ocean-500" />
          </button>
        </div>
      </div>

      {/* Nearest toast */}
      {nearestToast && (
        <div className="absolute top-16 inset-x-4 z-[550] bg-ocean-700 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl animate-in slide-in-from-top-4">
          {nearestToast}
        </div>
      )}

      {/* Bottom sheet backdrop */}
      {sheetOpen && (
        <div className="absolute inset-0 z-[600]" onClick={handleBackdrop}>
          <div
            ref={sheetRef}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl"
            style={{ animation: 'slideUp 0.25s ease-out' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {selected && (
              <div className="px-5 pb-6">
                {/* Photo + info row */}
                <div className="flex gap-4 items-start mb-4">
                  {(isDiscovered ? selected.imageUrl : selected.outlineImageUrl ?? selected.imageUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(isDiscovered ? selected.imageUrl : selected.outlineImageUrl ?? selected.imageUrl) ?? ''}
                      alt={selected.name}
                      className={`w-20 h-20 rounded-2xl object-cover shrink-0 ${!isDiscovered ? 'grayscale opacity-60' : ''}`}
                    />
                  ) : (
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl shrink-0 ${isDiscovered ? 'bg-ocean-100' : 'bg-gray-100'}`}>
                      {isDiscovered ? '📍' : '❓'}
                    </div>
                  )}

                  <div className="flex-1 min-w-0 pt-1">
                    <span className="text-xs font-semibold text-ocean-500 bg-ocean-50 px-2 py-0.5 rounded-full">
                      {CATEGORY_LABELS[selected.category] ?? selected.category}
                    </span>
                    <h2 className="text-base font-extrabold text-ocean-900 mt-1 leading-tight">
                      {selected.name}
                    </h2>
                    {selected.address && isDiscovered && (
                      <p className="text-gray-400 text-xs mt-0.5 truncate">{selected.address}</p>
                    )}
                  </div>
                </div>

                <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-3">
                  {isDiscovered
                    ? selected.description
                    : '🔍 Znajdź to miejsce i zeskanuj kod QR, by je odkryć!'}
                </p>

                <div className="flex gap-3">
                  {isDiscovered ? (
                    <button
                      onClick={() => { closeSheet(); router.push(`/budynek/${selected.id}`); }}
                      className="flex-1 flex items-center justify-center gap-2 bg-ocean-500 text-white py-3 rounded-2xl font-bold text-sm"
                    >
                      <ExternalLink size={16} />
                      Zobacz szczegóły
                    </button>
                  ) : (
                    <button
                      onClick={() => { closeSheet(); router.push('/skanuj'); }}
                      className="flex-1 flex items-center justify-center gap-2 bg-ocean-500 text-white py-3 rounded-2xl font-bold text-sm"
                    >
                      <QrCode size={16} />
                      Skanuj kod QR
                    </button>
                  )}
                  <button
                    onClick={closeSheet}
                    className="w-12 flex items-center justify-center bg-gray-100 rounded-2xl text-gray-400"
                  >
                    <ChevronDown size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-[1000] bg-black/60 flex items-end" onClick={closeInstructions}>
          <div
            className="w-full bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-[calc(env(safe-area-inset-bottom,0px)+80px)]"
            style={{ animation: 'slideUp 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-ocean-900">Jak grać?</h2>
              <button onClick={closeInstructions} className="p-1.5 rounded-full text-gray-400 hover:text-gray-600">
                <X size={22} />
              </button>
            </div>
            <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
              <div className="flex gap-3 items-start">
                <span className="text-2xl shrink-0">🗺️</span>
                <div>
                  <p className="font-bold text-ocean-900 mb-0.5">Eksploruj mapę</p>
                  <p>Odwiedź oznaczone miejsca istotne logopedycznie — poradnie, szkoły, uczelnie i inne obiekty.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-2xl shrink-0">📱</span>
                <div>
                  <p className="font-bold text-ocean-900 mb-0.5">Zeskanuj kod QR</p>
                  <p>Przy każdym miejscu znajdziesz tabliczkę z kodem QR. Zeskanuj go, by odblokować informacje i zdobyć punkt.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-2xl shrink-0">🏆</span>
                <div>
                  <p className="font-bold text-ocean-900 mb-0.5">Zbieraj odznaki</p>
                  <p>Za odkrywanie kolejnych miejsc i spełnianie specjalnych warunków zdobywasz odznaki odkrywcy.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-2xl shrink-0">🎟️</span>
                <div>
                  <p className="font-bold text-ocean-900 mb-0.5">Nagroda: 2 wejściówki na SpeechLab 2026</p>
                  <p>Odkryj wszystkie miejsca i walcz o 2 wejściówki na konferencję <strong>SpeechLab 2026</strong> (30 maja, Warszawa)!</p>
                </div>
              </div>
            </div>
            <button
              onClick={closeInstructions}
              className="mt-6 w-full bg-ocean-500 text-white py-3.5 rounded-2xl font-bold text-sm"
            >
              Rozumiem, zaczynam grę! 🚀
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
