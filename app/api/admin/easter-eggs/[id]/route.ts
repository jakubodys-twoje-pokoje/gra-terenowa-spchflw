import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function isAdmin(req: NextRequest) {
  return (req.headers.get('x-admin-password') ?? '').toLowerCase() === (process.env.ADMIN_PASSWORD ?? '').toLowerCase();
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, title, description, mediaType, mediaUrl, triggerType, triggerValue, triggerBuildingId, active } = body;

  const egg = await prisma.easterEgg.update({
    where: { id: Number(id) },
    data: {
      name: name?.trim(),
      title: title?.trim(),
      description: description?.trim() || null,
      mediaType: mediaType || 'none',
      mediaUrl: mediaUrl?.trim() || null,
      triggerType,
      triggerValue: triggerValue ? Number(triggerValue) : null,
      triggerBuildingId: triggerBuildingId ? Number(triggerBuildingId) : null,
      active: active !== false,
    },
  });
  return NextResponse.json(egg);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await prisma.easterEgg.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
