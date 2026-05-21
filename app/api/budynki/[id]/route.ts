import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const building = await prisma.building.findUnique({
      where: { id: Number(params.id) },
      include: { images: { orderBy: { order: 'asc' } } },
    });
    if (!building) return NextResponse.json({ error: 'Nie znaleziono' }, { status: 404 });
    return NextResponse.json(building);
  } catch {
    // Fallback without images
    const building = await prisma.building.findUnique({
      where: { id: Number(params.id) },
    });
    if (!building) return NextResponse.json({ error: 'Nie znaleziono' }, { status: 404 });
    return NextResponse.json({ ...building, images: [] });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const password = req.headers.get('x-admin-password');
  if ((password ?? '').toLowerCase() !== (process.env.ADMIN_PASSWORD ?? '').toLowerCase()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, address, lat, lng, imageUrl, outlineImageUrl, qrUrl, category, gallery, hidden, published } = body;
  const numberMatch = qrUrl ? /(\d+)\/?$/.exec(qrUrl) : null;
  const number = numberMatch ? parseInt(numberMatch[1], 10) : undefined;

  if (lat != null) {
    const latNum = Number(lat);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      return NextResponse.json({ error: 'Nieprawidłowa szerokość geograficzna (lat: −90…90)' }, { status: 400 });
    }
  }
  if (lng != null) {
    const lngNum = Number(lng);
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      return NextResponse.json({ error: 'Nieprawidłowa długość geograficzna (lng: −180…180)' }, { status: 400 });
    }
  }

  type GalleryItem = { url: string; title?: string; alt?: string };

  try {
    const building = await prisma.building.update({
      where: { id: Number(params.id) },
      data: {
        ...(number !== undefined && { number }),
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(address !== undefined && { address }),
        ...(lat != null && { lat: Number(lat) }),
        ...(lng != null && { lng: Number(lng) }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(outlineImageUrl !== undefined && { outlineImageUrl }),
        ...(qrUrl && { qrUrl }),
        ...(category && { category }),
        ...(hidden !== undefined && { hidden }),
        ...(published !== undefined && { published }),
        ...(gallery !== undefined && {
          images: {
            deleteMany: {},
            create: (gallery as GalleryItem[])
              .filter((g) => g.url?.trim())
              .map((g, i) => ({
                url: g.url.trim(),
                title: g.title?.trim() || null,
                alt: g.alt?.trim() || null,
                order: i,
              })),
          },
        }),
      },
      include: { images: { orderBy: { order: 'asc' } } },
    });
    return NextResponse.json(building);
  } catch {
    return NextResponse.json({ error: 'Błąd aktualizacji' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const password = req.headers.get('x-admin-password');
  if ((password ?? '').toLowerCase() !== (process.env.ADMIN_PASSWORD ?? '').toLowerCase()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.building.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ ok: true });
}
