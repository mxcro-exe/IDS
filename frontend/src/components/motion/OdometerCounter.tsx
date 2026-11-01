import React, { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface OdometerCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const OdometerCounter: React.FC<OdometerCounterProps> = ({
  value,
  duration = 1.2,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => {
    return `${prefix}${latest.toFixed(decimals)}${suffix}`;
  });

  useEffect(() => {
    const controls = animate(count, value, {
      duration,
      ease: [0.16, 1, 0.3, 1], // spring-like easeOut
    });
    return controls.stop;
  }, [value, duration]);

  return (
    <motion.span className={`tabular-nums inline-block font-mono ${className}`}>
      {rounded}
    </motion.span>
  );
};
