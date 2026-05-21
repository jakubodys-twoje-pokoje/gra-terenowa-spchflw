import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const isAdmin = (req.headers.get('x-admin-password') ?? '').toLowerCase() === (process.env.ADMIN_PASSWORD ?? '').toLowerCase();
  const where = isAdmin ? {} : { published: true };

  try {
    const buildings = await prisma.building.findMany({
      where,
      orderBy: [{ number: 'asc' }, { name: 'asc' }],
      select: {
        id: true, number: true, name: true, description: true, address: true,
        lat: true, lng: true, imageUrl: true, outlineImageUrl: true,
        category: true, qrUrl: true, hidden: true, published: true,
        images: { orderBy: { order: 'asc' }, select: { id: true, url: true, title: true, alt: true, order: true } },
      },
    });
    // SQLite sorts NULLs first in ASC — move buildings without number to the end
    buildings.sort((a, b) => {
      if (a.number == null && b.number == null) return a.name.localeCompare(b.name);
      if (a.number == null) return 1;
      if (b.number == null) return -1;
      return a.number - b.number;
    });
    return NextResponse.json(buildings);
  } catch {
    // Fallback: BuildingImage table may not exist yet on server (run prisma db push)
    const buildings = await prisma.building.findMany({
      where,
      orderBy: [{ number: 'asc' }, { name: 'asc' }],
      select: {
        id: true, name: true, description: true, address: true,
        lat: true, lng: true, imageUrl: true, outlineImageUrl: true,
        category: true, qrUrl: true, hidden: true, published: true,
      },
    });
    return NextResponse.json(buildings.map((b) => ({ ...b, images: [] })));
  }
}

export async function POST(req: NextRequest) {
  const password = req.headers.get('x-admin-password');
  if ((password ?? '').toLowerCase() !== (process.env.ADMIN_PASSWORD ?? '').toLowerCase()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, address, lat, lng, imageUrl, outlineImageUrl, qrUrl, category, gallery, hidden, published } = body;

  if (!name || !description || lat == null || lng == null || !qrUrl) {
    return NextResponse.json({ error: 'Brakujące pola' }, { status: 400 });
  }

  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (isNaN(latNum) || latNum < -90 || latNum > 90 || isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
    return NextResponse.json({ error: 'Nieprawidłowe koordynaty (lat: −90…90, lng: −180…180)' }, { status: 400 });
  }

  const numberMatch = /(\d+)\/?$/.exec(qrUrl);
  const number = numberMatch ? parseInt(numberMatch[1], 10) : null;

  type GalleryItem = { url: string; title?: string; alt?: string };
  const galleryItems: GalleryItem[] = (gallery ?? []).filter((g: GalleryItem) => g.url?.trim());

  try {
    const building = await prisma.building.create({
      data: {
        number: number ?? null,
        name, description, address, lat: latNum, lng: lngNum,
        imageUrl, outlineImageUrl, qrUrl, category: category || 'landmark',
        hidden: hidden ?? false,
        published: published ?? true,
        images: {
          create: galleryItems.map((g, i) => ({
            url: g.url.trim(),
            title: g.title?.trim() || null,
            alt: g.alt?.trim() || null,
            order: i,
          })),
        },
      },
      include: { images: { orderBy: { order: 'asc' } } },
    });
    return NextResponse.json(building, { status: 201 });
  } catch (e: unknown) {
    const isPrismaUniqueError =
      typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'P2002';
    if (isPrismaUniqueError) {
      return NextResponse.json({ error: 'QR URL już istnieje w bazie' }, { status: 409 });
    }
    console.error('Błąd tworzenia budynku:', e);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
