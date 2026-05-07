import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import Navigation from '@/components/Navigation';
import PortraitGuard from '@/components/PortraitGuard';
import ClientWrapper from '@/components/ClientWrapper';
import WelcomeModal from '@/components/WelcomeModal';
import PageTransition from '@/components/PageTransition';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import InstallPrompt from '@/components/InstallPrompt';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://gra.speechflow.org'),
  title: 'SpeechFlow – Logopedyczna Gra Terenowa',
  description: 'Odkryj miejsca istotne logopedycznie! Skanuj kody QR, zdobywaj odznaki i walcz o 2 wejściówki na SpeechLab 2026.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/icon-192.png',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: 'SpeechFlow – Logopedyczna Gra Terenowa',
    description: 'Odkryj miejsca istotne logopedycznie i walcz o 2 wejściówki na SpeechLab 2026!',
    type: 'website',
    locale: 'pl_PL',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'SpeechFlow Gra Terenowa' }],
  },
  twitter: {
    card: 'summary',
    title: 'SpeechFlow – Logopedyczna Gra Terenowa',
    description: 'Odkryj miejsca istotne logopedycznie i walcz o 2 wejściówki na SpeechLab 2026!',
    images: ['/icons/icon-512.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#015687',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="max-w-lg mx-auto relative">
        <ClientWrapper>{children}</ClientWrapper>
        <Navigation />
        <PageTransition />
        <PortraitGuard />
        <Suspense><WelcomeModal /></Suspense>
        <InstallPrompt />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
