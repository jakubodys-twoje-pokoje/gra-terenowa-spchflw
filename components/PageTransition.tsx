'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const GROW_MS   = 280;
const HOLD_MS   = 60;
const SHRINK_MS = 240;

export default function PageTransition() {
  const pathname  = usePathname();
  const prevRef   = useRef(pathname);
  const divRef    = useRef<HTMLDivElement>(null);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (pathname === prevRef.current) return;
    prevRef.current = pathname;

    const el = divRef.current;
    if (!el) return;

    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];

    el.style.display    = 'block';
    el.style.transition = 'none';
    el.style.clipPath   = 'circle(0% at 50% 50%)';

    void el.offsetHeight;

    el.style.transition = `clip-path ${GROW_MS}ms cubic-bezier(0.4, 0, 0.5, 1)`;
    el.style.clipPath   = 'circle(150% at 50% 50%)';

    const t1 = setTimeout(() => {
      el.style.transition = 'none';
    }, GROW_MS);

    const t2 = setTimeout(() => {
      el.style.transition = `clip-path ${SHRINK_MS}ms cubic-bezier(0.5, 0, 0.6, 1)`;
      el.style.clipPath   = 'circle(0% at 50% 50%)';
    }, GROW_MS + HOLD_MS);

    const t3 = setTimeout(() => {
      el.style.transition = 'none';
      el.style.display    = 'none';
    }, GROW_MS + HOLD_MS + SHRINK_MS + 50);

    timerRefs.current = [t1, t2, t3];
    return () => timerRefs.current.forEach(clearTimeout);
  }, [pathname]);

  return (
    <div
      ref={divRef}
      className="fixed inset-0 z-[49] pointer-events-none hidden"
      style={{
        clipPath: 'circle(0% at 50% 50%)',
        background: '#0D3A52',
      }}
    />
  );
}
