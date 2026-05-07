import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { signSession, sessionCookieOptions } from '@/lib/auth';

const BASE_URL = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'https://gra.speechflow.org';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(`${BASE_URL}/weryfikacja?error=brak_tokenu`);

  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });

  if (!record || record.expiresAt < new Date()) {
    await prisma.emailVerificationToken.deleteMany({ where: { token } });
    return NextResponse.redirect(`${BASE_URL}/weryfikacja?error=wygasly`);
  }

  const profile = await prisma.userProfile.update({
    where: { userId: record.userId },
    data: { emailVerified: true },
  });

  // Migrate guest discoveries — use token's guestUserId or fall back to profile's
  const guestId = record.guestUserId ?? profile.guestUserId;
  if (guestId) {
    // Move guest discoveries one-by-one to avoid failing the whole batch on duplicate
    const guestDiscoveries = await prisma.userDiscovery.findMany({
      where: { userId: guestId },
      select: { buildingId: true },
    });
    for (const { buildingId } of guestDiscoveries) {
      await prisma.userDiscovery.upsert({
        where: { userId_buildingId: { userId: record.userId, buildingId } },
        update: {},
        create: { userId: record.userId, buildingId },
      });
    }
    // Remove now-duplicate guest records
    await prisma.userDiscovery.deleteMany({ where: { userId: guestId } });
  }

  await prisma.emailVerificationToken.delete({ where: { token } });

  // Issue JWT only NOW — after verification
  const jwt = await signSession({ userId: profile.userId, email: profile.email! });
  const res = NextResponse.redirect(`${BASE_URL}/weryfikacja?success=1`);
  res.cookies.set(sessionCookieOptions(jwt));
  return res;
}
