import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function isAdmin(req: NextRequest) {
  return (req.headers.get('x-admin-password') ?? '').toLowerCase() === (process.env.ADMIN_PASSWORD ?? '').toLowerCase();
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const eggs = await prisma.easterEgg.findMany({ orderBy: { createdAt: 'asc' } });
  return NextResponse.json(eggs);
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, title, description, mediaType, mediaUrl, triggerType, triggerValue, triggerBuildingId, active } = body;

  if (!name?.trim() || !title?.trim() || !triggerType) {
    return NextResponse.json({ error: 'name, title i triggerType są wymagane' }, { status: 400 });
  }

  const egg = await prisma.easterEgg.create({
    data: {
      name: name.trim(),
      title: title.trim(),
      description: description?.trim() || null,
      mediaType: mediaType || 'none',
      mediaUrl: mediaUrl?.trim() || null,
      triggerType,
      triggerValue: triggerValue ? Number(triggerValue) : null,
      triggerBuildingId: triggerBuildingId ? Number(triggerBuildingId) : null,
      active: active !== false,
    },
  });
  return NextResponse.json(egg, { status: 201 });
}
