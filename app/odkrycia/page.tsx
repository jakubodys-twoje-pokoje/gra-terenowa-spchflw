'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Compass } from 'lucide-react';
import Link from 'next/link';
import AchievementBadge from '@/components/AchievementBadge';
import { useAuth } from '@/lib/useAuth';

interface Discovery {
  discoveredAt: string;
  building: { id: number; lat: number; lng: number };
}

function getUserId(): string {
  let id = localStorage.getItem('speechflow_user_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('speechflow_user_id', id); }
  return id;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcStreak(discoveries: Discovery[]) {
  if (discoveries.length === 0) return { current: 0, best: 0 };
  const MS_DAY = 1000 * 60 * 60 * 24;
  const uniqueDays = Array.from(new Set(discoveries.map((d) =>
    Math.floor(new Date(d.discoveredAt).getTime() / MS_DAY)
  ))).sort((a, b) => a - b);

  let best = 1, run = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    run = uniqueDays[i] - uniqueDays[i - 1] === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  const today = Math.floor(Date.now() / MS_DAY);
  const lastDay = uniqueDays[uniqueDays.length - 1];
  const current = today - lastDay <= 1 ? run : 0;
  return { current, best };
}

function calcKm(discoveries: Discovery[]) {
  const sorted = [...discoveries].sort((a, b) =>
    new Date(a.discoveredAt).getTime() - new Date(b.discoveredAt).getTime()
  );
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    total += haversineKm(
      sorted[i - 1].building.lat, sorted[i - 1].building.lng,
      sorted[i].building.lat, sorted[i].building.lng,
    );
  }
  return total;
}

function calcPlaytime(discoveries: Discovery[]) {
  if (discoveries.length < 2) return null;
  const times = discoveries.map((d) => new Date(d.discoveredAt).getTime());
  const first = Math.min(...times);
  const last = Math.max(...times);
  const ms = last - first;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days === 0) return `${hours}h`;
  if (days === 1) return `1 dzień ${hours}h`;
  return `${days} dni`;
}

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = Date.now();
    const duration = 900;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(ease * value);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);
  return <>{display.toFixed(decimals)}</>;
}

function DonutRing({ pct, count, total }: { pct: number; count: number; total: number }) {
  const R = 54;
  const C = 2 * Math.PI * R;
  const [dash, setDash] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setDash((pct / 100) * C), 80);
    return () => clearTimeout(t);
  }, [pct, C]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-44 h-44">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <defs>
            <linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2A8EC9" />
              <stop offset="100%" stopColor="#0F5F92" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r={R} fill="none" stroke="#E5F1FA" strokeWidth="12" />
          <circle
            cx="60" cy="60" r={R} fill="none"
            stroke="url(#donutGrad)" strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${C}`}
            style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold text-ocean-700 leading-none">
            <AnimatedNumber value={pct} />%
          </span>
          <span className="text-xs text-gray-400 mt-1 font-semibold">
            {count} / {total}
          </span>
        </div>
      </div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Ukończono</p>
    </div>
  );
}

const DAYS = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];

function DayChart({ discoveries }: { discoveries: Discovery[] }) {
  const counts = new Array(7).fill(0);
  discoveries.forEach((d) => { counts[new Date(d.discoveredAt).getDay()]++; });
  const max = Math.max(1, ...counts);
  const best = counts.indexOf(Math.max(...counts));

  return (
    <div className="flex items-end justify-between gap-1 h-16">
      {counts.map((c, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex flex-col justify-end" style={{ height: '44px' }}>
            <div
              className="w-full rounded-sm transition-all duration-700"
              style={{
                height: `${(c / max) * 44}px`,
                minHeight: c > 0 ? '3px' : '0',
                background: i === best && c > 0 ? '#0F5F92' : '#CBD5E1',
                transitionDelay: `${i * 60}ms`,
              }}
            />
          </div>
          <span className={`text-[9px] font-bold ${i === best && c > 0 ? 'text-ocean-600' : 'text-gray-400'}`}>
            {DAYS[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

function HourChart({ discoveries }: { discoveries: Discovery[] }) {
  const blocks = [0, 4, 8, 12, 16, 20];
  const labels = ['0–4', '4–8', '8–12', '12–16', '16–20', '20–24'];
  const counts = blocks.map((start) =>
    discoveries.filter((d) => {
      const h = new Date(d.discoveredAt).getHours();
      return h >= start && h < start + 4;
    }).length
  );
  const max = Math.max(1, ...counts);
  const bestBlock = counts.indexOf(Math.max(...counts));

  return (
    <div className="flex items-end justify-between gap-1.5 h-16">
      {counts.map((c, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex flex-col justify-end" style={{ height: '44px' }}>
            <div
              className="w-full rounded-sm transition-all duration-700"
              style={{
                height: `${(c / max) * 44}px`,
                minHeight: c > 0 ? '3px' : '0',
                background: i === bestBlock && c > 0 ? '#F0A500' : '#FEF3C7',
                transitionDelay: `${i * 80}ms`,
              }}
            />
          </div>
          <span className={`text-[8px] font-bold ${i === bestBlock && c > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

interface AchievementWithStatus {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
}

export default function OdkryciaPage() {
  const { user } = useAuth();
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [totalBuildings, setTotalBuildings] = useState(0);
  const [achievements, setAchievements] = useState<AchievementWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'odznaki'>('stats');

  const load = useCallback(async () => {
    const userId = user?.userId ?? getUserId();
    const [discRes, allRes, achRes] = await Promise.all([
      fetch(`/api/odkrycia?userId=${userId}`),
      fetch('/api/budynki'),
      fetch(`/api/osiagniecia?userId=${userId}`),
    ]);
    const disc: Discovery[] = discRes.ok ? await discRes.json() : [];
    const all = allRes.ok ? await allRes.json() : [];
    const achs: AchievementWithStatus[] = achRes.ok ? await achRes.json() : [];
    setDiscoveries(disc);
    setTotalBuildings(all.length);
    setAchievements(Array.isArray(achs) ? achs : []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const count = discoveries.length;
  const pct = totalBuildings > 0 ? Math.round((count / totalBuildings) * 100) : 0;
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const streak = calcStreak(discoveries);
  const kmTotal = calcKm(discoveries);
  const playtime = calcPlaytime(discoveries);

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-ocean-100 flex items-center justify-center">
          <Compass size={22} className="text-ocean-500" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-ocean-900">Moje Odkrycia</h1>
          <p className="text-gray-500 text-xs">
            {loading ? '…' : `${count} z ${totalBuildings} miejsc`}
          </p>
        </div>
      </div>

      <div className="flex bg-gray-100 rounded-2xl p-1 mb-5 gap-1">
        {(['stats', 'odznaki'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab ? 'bg-white text-ocean-600 shadow-sm' : 'text-gray-400'
            }`}
          >
            {tab === 'stats' ? 'Statystyki' : 'Odznaki'}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-ocean-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && activeTab === 'stats' && (
        <div className="space-y-4 pb-6">
          {count === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="text-5xl mb-3">🗺️</div>
              <p className="text-ocean-900 font-bold mb-2">Zacznij eksplorować!</p>
              <p className="text-gray-400 text-sm mb-4">Znajdź kod QR przy miejscu i zeskanuj go.</p>
              <Link href="/skanuj">
                <button className="bg-ocean-500 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-ocean-500/30">
                  Skanuj pierwszy kod QR
                </button>
              </Link>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-3xl p-6 shadow-card flex flex-col items-center">
                <DonutRing pct={pct} count={count} total={totalBuildings} />
                <div className="w-full mt-4 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-sand-400 to-sand-600 rounded-full transition-all duration-700"
                    style={{ width: `${achievements.length > 0 ? (unlockedCount / achievements.length) * 100 : 0}%` }} />
                </div>
                <p className="text-[11px] text-gray-400 mt-1 self-end">
                  {unlockedCount} / {achievements.length} odznak
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-3xl p-5 shadow-card flex flex-col items-center text-center">
                  <span className="text-4xl leading-none mb-1">🔥</span>
                  <p className="text-4xl font-extrabold text-orange-500 leading-none mt-1">
                    <AnimatedNumber value={streak.current} />
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1.5 font-semibold">dni z rzędu</p>
                  {streak.best > 0 && (
                    <p className="text-[10px] text-gray-300 mt-1">rekord: {streak.best} dni</p>
                  )}
                </div>

                <div className="bg-white rounded-3xl p-5 shadow-card flex flex-col items-center text-center">
                  <span className="text-4xl leading-none mb-1">🚶</span>
                  <p className="text-4xl font-extrabold text-green-600 leading-none mt-1">
                    <AnimatedNumber value={kmTotal} decimals={kmTotal < 1 ? 2 : 1} />
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1.5 font-semibold">km między odkryciami</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 shadow-card flex flex-col items-center text-center">
                <span className="text-4xl leading-none mb-1">⏱️</span>
                <p className="text-3xl font-extrabold text-purple-600 leading-none mt-1">
                  {playtime ?? '—'}
                </p>
                <p className="text-[11px] text-gray-400 mt-1.5 font-semibold">łączny czas przygody</p>
              </div>

              <div className="bg-white rounded-3xl p-5 shadow-card">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Twój dzień odkryć</p>
                <DayChart discoveries={discoveries} />
              </div>

              <div className="bg-white rounded-3xl p-5 shadow-card">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">O której odkrywasz?</p>
                <HourChart discoveries={discoveries} />
              </div>
            </>
          )}
        </div>
      )}

      {!loading && activeTab === 'odznaki' && (
        <div className="grid grid-cols-2 gap-3 pb-4">
          {achievements.map((a) => (
            <AchievementBadge
              key={a.id}
              icon={a.icon}
              name={a.name}
              description={a.description}
              color={a.color}
              unlocked={a.unlocked}
            />
          ))}
        </div>
      )}
    </div>
  );
}
