import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';
function isAdmin(req: NextRequest) {
  return (req.headers.get('x-admin-password') ?? '').toLowerCase() === ADMIN_PASSWORD.toLowerCase();
}

const DEFAULT_CATEGORIES = [
  { value: 'beach',      label: '🏖️ Plaża',     icon: '🏖️', order: 0 },
  { value: 'landmark',   label: '🏛️ Zabytek',   icon: '🏛️', order: 1 },
  { value: 'food',       label: '🐟 Jedzenie',  icon: '🐟', order: 2 },
  { value: 'hotel',      label: '🏨 Nocleg',    icon: '🏨', order: 3 },
  { value: 'attraction', label: '⭐ Atrakcja',  icon: '⭐', order: 4 },
  { value: 'nature',     label: '🌿 Natura',    icon: '🌿', order: 5 },
];

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let categories = await prisma.category.findMany({ orderBy: { order: 'asc' } });

  if (categories.length === 0) {
    await prisma.category.createMany({ data: DEFAULT_CATEGORIES });
    categories = await prisma.category.findMany({ orderBy: { order: 'asc' } });
  }

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { value, label, icon, order } = await req.json();
  if (!value || !label) return NextResponse.json({ error: 'value i label są wymagane' }, { status: 400 });

  try {
    const cat = await prisma.category.create({ data: { value, label, icon: icon ?? '', order: order ?? 0 } });
    return NextResponse.json(cat, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Kategoria o tej wartości już istnieje' }, { status: 409 });
  }
}
