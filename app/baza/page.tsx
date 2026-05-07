'use client';

import { useEffect, useState, useCallback } from 'react';
import { BookOpen } from 'lucide-react';
import BuildingCard from '@/components/BuildingCard';
import { useAuth } from '@/lib/useAuth';

interface Building {
  id: number;
  number: number | null;
  name: string;
  description: string;
  imageUrl: string | null;
  outlineImageUrl: string | null;
  category: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  checza:    '🛖 Chëcze',
  zagroda:   '🏡 Zagrody',
  karczma:   '🍺 Karczmy',
  pensjonat: '🛏️ Pensjonaty',
  sakralny:  '⛪ Sakralne',
  natura:    '🌲 Natura',
  morze:     '🐟 Morze',
  historia:  '🏛️ Historia',
};

type DiscoveryFilter = 'all' | 'discovered' | 'undiscovered';

function getUserId(): string {
  let id = localStorage.getItem('speechflow_user_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('speechflow_user_id', id); }
  return id;
}

export default function BazaPage() {
  const { user } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [discoveredIds, setDiscoveredIds] = useState<Set<number>>(new Set());
  const [discoveryFilter, setDiscoveryFilter] = useState<DiscoveryFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const userId = user?.userId ?? getUserId();
    const [bRes, dRes] = await Promise.all([
      fetch('/api/budynki'),
      fetch(`/api/odkrycia?userId=${userId}`),
    ]);
    const all: Building[] = bRes.ok ? await bRes.json() : [];
    const discoveries = dRes.ok ? await dRes.json() : [];
    setBuildings(all);
    setDiscoveredIds(new Set(discoveries.map((d: { building: { id: number } }) => d.building.id)));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Derive available categories from loaded buildings
  const categories = Array.from(new Set(buildings.map((b) => b.category)));

  const filtered = buildings.filter((b) => {
    if (discoveryFilter === 'discovered' && !discoveredIds.has(b.id)) return false;
    if (discoveryFilter === 'undiscovered' && discoveredIds.has(b.id)) return false;
    if (categoryFilter && b.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-2xl bg-cyan-100 flex items-center justify-center">
          <BookOpen size={22} className="text-cyan-600" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-ocean-900">Baza Budynków</h1>
          <p className="text-gray-500 text-xs">
            {loading ? '…' : `${discoveredIds.size} / ${buildings.length} odkrytych`}
          </p>
        </div>
      </div>

      {/* Discovery filter tabs */}
      <div className="flex bg-gray-100 rounded-2xl p-1 mb-3 gap-1 mt-4">
        {([['all', 'Wszystkie'], ['discovered', 'Odkryte'], ['undiscovered', 'Nieodkryte']] as [DiscoveryFilter, string][]).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setDiscoveryFilter(val)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              discoveryFilter === val ? 'bg-white text-ocean-600 shadow-sm' : 'text-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Category filter chips */}
      {!loading && categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              categoryFilter === null
                ? 'bg-ocean-600 text-white'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            Wszystkie
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                categoryFilter === cat
                  ? 'bg-ocean-600 text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-ocean-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">
            {discoveryFilter === 'discovered' ? '🗺️' : discoveryFilter === 'undiscovered' ? '🎉' : '🏗️'}
          </div>
          <p>
            {discoveryFilter === 'discovered' ? 'Nie masz jeszcze odkryć.' : discoveryFilter === 'undiscovered' ? 'Odkryłeś wszystkie miejsca!' : 'Baza jest pusta. Wróć wkrótce!'}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((b) => (
            <BuildingCard
              key={b.id}
              id={b.id}
              number={b.number}
              name={b.name}
              description={b.description}
              imageUrl={b.imageUrl}
              outlineImageUrl={b.outlineImageUrl}
              category={b.category}
              discovered={discoveredIds.has(b.id)}
              showLink
            />
          ))}
        </div>
      )}
    </div>
  );
}
