import { useEffect, useRef } from 'react';

export function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (barRef.current) {
          const el = document.documentElement;
          const scrollHeight = el.scrollHeight - el.clientHeight;
          const pct = scrollHeight > 0 ? (el.scrollTop / scrollHeight) * 100 : 0;
          barRef.current.style.transform = `scaleX(${pct / 100})`;
        }
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed top-14 left-0 right-0 z-[60] h-0.5 overflow-hidden">
      <div
        ref={barRef}
        className="h-full w-full bg-df-accent origin-left"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}
