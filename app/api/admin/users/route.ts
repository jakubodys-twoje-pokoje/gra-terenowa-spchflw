import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function auth(req: NextRequest) {
  return (req.headers.get('x-admin-password') ?? '').toLowerCase() === (process.env.ADMIN_PASSWORD ?? '').toLowerCase();
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profiles = await prisma.userProfile.findMany({
    orderBy: { registeredAt: 'desc' },
    select: {
      userId: true, nickname: true, email: true, city: true,
      avatarUrl: true, emailVerified: true, registeredAt: true,
    },
  });

  const counts = await prisma.userDiscovery.groupBy({
    by: ['userId'],
    _count: { id: true },
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.userId, c._count.id]));

  // Also count guest users (have discoveries but no profile)
  const allUserIds = await prisma.userDiscovery.findMany({
    distinct: ['userId'],
    select: { userId: true },
  });
  const guestCount = allUserIds.filter(
    (u) => !profiles.find((p) => p.userId === u.userId)
  ).length;

  const users = profiles.map((p) => ({
    ...p,
    discoveryCount: countMap[p.userId] ?? 0,
  }));

  return NextResponse.json({ users, guestCount });
}

export async function DELETE(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  await prisma.userDiscovery.deleteMany({ where: { userId } });
  await prisma.userProfile.delete({ where: { userId } });
  return NextResponse.json({ ok: true });
}
