'use client';

import { useEffect, useMemo, useState } from 'react';

export default function AnimatedNumber({
  value,
  formatter,
}: {
  value: number;
  formatter?: (value: number) => string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 1200;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);

      if (progress < 1) {
        raf = window.requestAnimationFrame(tick);
      }
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [value]);

  const rendered = useMemo(() => {
    const rounded = Number.isInteger(value) ? Math.round(display) : Number(display.toFixed(2));
    return formatter ? formatter(rounded) : `${rounded}`;
  }, [display, formatter, value]);

  return <>{rendered}</>;
}
