import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { signSession, sessionCookieOptions } from '@/lib/auth';
import { containsProfanity } from '@/lib/profanity';

export async function POST(req: NextRequest) {
  const { email: rawEmail, firstName, lastName } = await req.json();
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : rawEmail;

  if (!email) return NextResponse.json({ error: 'Adres email jest wymagany' }, { status: 400 });
  if (!firstName || !lastName) return NextResponse.json({ error: 'Imię i nazwisko są wymagane' }, { status: 400 });

  const nickname = `${String(firstName).trim()} ${String(lastName).trim()}`;

  if (containsProfanity(email)) return NextResponse.json({ error: 'Adres email zawiera niedozwolone słowa.' }, { status: 400 });
  if (containsProfanity(nickname)) return NextResponse.json({ error: 'Imię lub nazwisko zawiera niedozwolone słowa.' }, { status: 400 });

  const existing = await prisma.userProfile.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: 'Ten adres email jest już zajęty' }, { status: 409 });

  // Auto-generate a strong random password — user never sees it
  const randomPassword = crypto.randomUUID() + crypto.randomUUID();
  const passwordHash = await bcrypt.hash(randomPassword, 10);
  const newUserId = crypto.randomUUID();

  await prisma.userProfile.create({
    data: { userId: newUserId, email, passwordHash, nickname, emailVerified: true },
  });

  const token = await signSession({ userId: newUserId, email });
  const res = NextResponse.json({ ok: true, userId: newUserId });
  res.cookies.set(sessionCookieOptions(token));
  return res;
}
