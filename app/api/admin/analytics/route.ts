import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function startOfDay(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Build a map of date → 0 for the last N days
function emptyDayMap(days: number): Record<string, number> {
  const map: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    map[dateKey(startOfDay(i))] = 0;
  }
  return map;
}

export async function GET(req: NextRequest) {
  const password = req.headers.get('x-admin-password');
  if ((password ?? '').toLowerCase() !== (process.env.ADMIN_PASSWORD ?? '').toLowerCase()) return unauthorized();

  const DAYS = 30;
  const since30 = startOfDay(DAYS);
  const since7  = startOfDay(7);
  const since1  = startOfDay(0); // today

  const [
    totalDiscoveries,
    totalUsers,
    totalViews,
    discoveries30,
    views30,
    registrations30,
    scansToday,
    viewsToday,
    activeUsers7,
    topBuildings,
  ] = await Promise.all([
    // all-time totals
    prisma.userDiscovery.count(),
    prisma.userProfile.count(),
    prisma.pageView.count(),

    // last 30 days — discoveries by day
    prisma.userDiscovery.findMany({
      where: { discoveredAt: { gte: since30 } },
      select: { discoveredAt: true },
    }),

    // last 30 days — page views by day
    prisma.pageView.findMany({
      where: { createdAt: { gte: since30 } },
      select: { createdAt: true, path: true },
    }),

    // last 30 days — registrations by day
    prisma.userProfile.findMany({
      where: { registeredAt: { gte: since30 } },
      select: { registeredAt: true },
    }),

    // today
    prisma.userDiscovery.count({ where: { discoveredAt: { gte: since1 } } }),
    prisma.pageView.count({ where: { createdAt: { gte: since1 } } }),

    // unique active users last 7 days (by userId)
    prisma.userDiscovery.groupBy({
      by: ['userId'],
      where: { discoveredAt: { gte: since7 } },
    }),

    // top 10 most scanned buildings
    prisma.userDiscovery.groupBy({
      by: ['buildingId'],
      _count: { buildingId: true },
      orderBy: { _count: { buildingId: 'desc' } },
      take: 10,
    }),
  ]);

  // Build 30-day time series
  const discoveriesByDay = emptyDayMap(DAYS);
  for (const d of discoveries30) {
    const k = dateKey(new Date(d.discoveredAt));
    if (k in discoveriesByDay) discoveriesByDay[k]++;
  }

  const viewsByDay = emptyDayMap(DAYS);
  for (const v of views30) {
    const k = dateKey(new Date(v.createdAt));
    if (k in viewsByDay) viewsByDay[k]++;
  }

  const registrationsByDay = emptyDayMap(DAYS);
  for (const u of registrations30) {
    const k = dateKey(new Date(u.registeredAt));
    if (k in registrationsByDay) registrationsByDay[k]++;
  }

  // Path breakdown for last 30 days
  const pathCounts: Record<string, number> = {};
  for (const v of views30) {
    const normalized = v.path.replace(/\/budynek\/\d+/, '/budynek/[id]');
    pathCounts[normalized] = (pathCounts[normalized] ?? 0) + 1;
  }
  const topPaths = Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));

  // Resolve building names for top scanned
  const buildingIds = topBuildings.map(b => b.buildingId);
  const buildings = await prisma.building.findMany({
    where: { id: { in: buildingIds } },
    select: { id: true, name: true, number: true },
  });
  const buildingMap = Object.fromEntries(buildings.map(b => [b.id, b]));
  const topBuildingsWithNames = topBuildings.map(b => ({
    buildingId: b.buildingId,
    count: b._count.buildingId,
    name: buildingMap[b.buildingId]?.name ?? `#${b.buildingId}`,
    number: buildingMap[b.buildingId]?.number ?? null,
  }));

  return NextResponse.json({
    totals: {
      discoveries: totalDiscoveries,
      users: totalUsers,
      pageViews: totalViews,
      scansToday,
      viewsToday,
      activeUsers7: activeUsers7.length,
    },
    series: {
      discoveries: discoveriesByDay,
      pageViews: viewsByDay,
      registrations: registrationsByDay,
    },
    topBuildings: topBuildingsWithNames,
    topPaths,
  });
}
