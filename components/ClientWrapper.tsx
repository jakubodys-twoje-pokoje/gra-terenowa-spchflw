'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem('speechflow_session_id');
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem('speechflow_session_id', id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMap = pathname === '/';
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;

    const sessionId = getSessionId();
    const userId = (() => { try { return localStorage.getItem('speechflow_user_id'); } catch { return null; } })();

    fetch('/api/analytics/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname, userId, sessionId }),
    }).catch(() => {/* fire and forget */});
  }, [pathname]);

  return (
    <main className={isMap ? 'h-dvh overflow-hidden' : 'pb-24 min-h-screen'}>
      {children}
    </main>
  );
}
