import type { Metadata } from 'next';
import { prisma } from '@/lib/db';

interface Props {
  params: { id: string };
  children: React.ReactNode;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const building = await prisma.building.findUnique({
    where: { id: Number(params.id) },
    select: { name: true, description: true, imageUrl: true },
  });

  if (!building) {
    return { title: 'SpeechFlow – Logopedyczna Gra Terenowa' };
  }

  const title = `Odkryłem ${building.name} w grze SpeechFlow! 🗺️`;
  const description = `${building.description.slice(0, 150)}… Zagraj w logopedyczną grę terenową SpeechFlow!`;
  const images = building.imageUrl
    ? [{ url: building.imageUrl, width: 1200, height: 630, alt: building.name }]
    : [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'SpeechFlow Gra Terenowa' }];

  return {
    title: `${building.name} · SpeechFlow Gra Terenowa`,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'pl_PL',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images.map((i) => i.url),
    },
  };
}

export default function BudynekLayout({ children }: Props) {
  return <>{children}</>;
}
