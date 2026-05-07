'use client';

import { useEffect, useState, useCallback } from 'react';
import { Trophy } from 'lucide-react';
import AchievementBadge from '@/components/AchievementBadge';

interface AchievementWithStatus {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
}

function getUserId(): string {
  let id = localStorage.getItem('speechflow_user_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('speechflow_user_id', id);
  }
  return id;
}

export default function OsiagnieciaPage() {
  const [achievements, setAchievements] = useState<AchievementWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [discoveredCount, setDiscoveredCount] = useState(0);
  const [totalBuildings, setTotalBuildings] = useState(0);

  const load = useCallback(async () => {
    const userId = getUserId();
    const [achRes, discRes, allRes] = await Promise.all([
      fetch(`/api/osiagniecia?userId=${userId}`),
      fetch(`/api/odkrycia?userId=${userId}`),
      fetch('/api/budynki'),
    ]);

    if (!achRes.ok) {
      const errText = await achRes.text();
      console.error('[osiagniecia] API error:', achRes.status, errText);
      setError(`Błąd ładowania osiągnięć (${achRes.status}): ${errText}`);
      setLoading(false);
      return;
    }
    const fetchedAchievements: AchievementWithStatus[] = await achRes.json();
    const discoveries = discRes.ok ? await discRes.json() : [];
    const allBuildings = allRes.ok ? await allRes.json() : [];

    setAchievements(fetchedAchievements);
    setDiscoveredCount(discoveries.length);
    setTotalBuildings(allBuildings.length);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const progress = achievements.length > 0 ? (unlockedCount / achievements.length) * 100 : 0;

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-sand-100 flex items-center justify-center">
          <Trophy size={22} className="text-sand-500" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-ocean-900">Moje Osiągnięcia</h1>
          <p className="text-gray-500 text-xs">
            {loading ? '…' : `${unlockedCount} z ${achievements.length} odblokowanych`}
          </p>
        </div>
      </div>

      {/* Stats bar */}
      {!loading && (
        <div className="bg-white rounded-3xl p-4 mb-5 shadow-card">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500 font-medium">Odkryte miejsca</span>
            <span className="font-bold text-ocean-600">
              {discoveredCount} / {totalBuildings}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-ocean-400 to-ocean-600 transition-all duration-700"
              style={{ width: `${totalBuildings > 0 ? (discoveredCount / totalBuildings) * 100 : 0}%` }}
            />
          </div>

          <div className="flex justify-between text-sm mt-3">
            <span className="text-gray-500 font-medium">Odznaki</span>
            <span className="font-bold text-sand-600">
              {unlockedCount} / {achievements.length}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden mt-2">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-sand-400 to-sand-600 transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-ocean-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Achievements grid */}
      {!loading && (
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
          {achievements.length === 0 && (
            <p className="col-span-2 text-center text-gray-400 text-sm py-10">Brak osiągnięć</p>
          )}
        </div>
      )}
    </div>
  );
}
