import React, { useEffect, useState, useRef } from 'react';

interface CountUpProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const CountUp: React.FC<CountUpProps> = ({
  value,
  duration = 1.2,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const startValRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const targetValRef = useRef<number>(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startValRef.current = displayValue;
    targetValRef.current = value;
    startTimeRef.current = null;

    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
      if (!startTimeRef.current) startTimeRef.current = now;
      const elapsed = (now - startTimeRef.current) / (duration * 1000);
      const progress = Math.min(elapsed, 1);
      const eased = easeOutCubic(progress);

      const current = startValRef.current + (targetValRef.current - startValRef.current) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplayValue(targetValRef.current);
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const formatted = displayValue.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
