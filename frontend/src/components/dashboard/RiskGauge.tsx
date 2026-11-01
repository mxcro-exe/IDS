import React from 'react';
import { motion } from 'framer-motion';
import { OdometerCounter } from '../motion/OdometerCounter';

interface RiskGaugeProps {
  score: number; // 0 to 100
  title?: string;
  threatVerdict?: 'ALLOW' | 'WARN' | 'BLOCK';
  className?: string;
}

// Linear RGB interpolation for smooth color transition without rainbow gradients
function interpolateColor(score: number): string {
  // 0% -> ALLOW (#3FB68B: 63, 182, 139)
  // 50% -> WARN (#D9A441: 217, 164, 65)
  // 100% -> BLOCK (#E5656F: 229, 101, 111)
  if (score <= 50) {
    const t = score / 50;
    const r = Math.round(63 + (217 - 63) * t);
    const g = Math.round(182 + (164 - 182) * t);
    const b = Math.round(139 + (65 - 139) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const t = (score - 50) / 50;
    const r = Math.round(217 + (229 - 217) * t);
    const g = Math.round(164 + (101 - 164) * t);
    const b = Math.round(65 + (111 - 65) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  score = 22,
  title = 'Threat Risk Index',
  threatVerdict = 'ALLOW',
  className = '',
}) => {
  const clampedScore = Math.min(Math.max(score, 0), 100);
  
  // Exact 180° semi-circle arc mapping: 0% -> -90deg (pointing left), 100% -> +90deg (pointing right)
  const rotation = -90 + (clampedScore / 100) * 180;
  const arcLength = 220; // π * radius 70 ≈ 219.9
  const arcOffset = arcLength - (arcLength * clampedScore) / 100;

  // Single interpolated active color based on threat level
  const activeColor = interpolateColor(clampedScore);

  const verdictBadge =
    clampedScore >= 70
      ? { text: 'HIGH RISK (BLOCK)', className: 'badge-block' }
      : clampedScore >= 40
      ? { text: 'ELEVATED (WARN)', className: 'badge-warn' }
      : { text: 'NORMAL (ALLOW)', className: 'badge-allow' };

  return (
    <div className={`flex flex-col items-center justify-center p-5 text-center select-none ${className}`}>
      {/* Title */}
      <span className="text-xs font-mono uppercase tracking-wider text-[var(--muted)] mb-3 font-medium">
        {title}
      </span>

      {/* SVG Arc Gauge */}
      <div className="relative w-52 h-32 flex items-center justify-center">
        <svg viewBox="0 0 200 125" className="w-full h-full overflow-visible">
          {/* Neutral Track */}
          <path
            d="M 30 110 A 70 70 0 0 1 170 110"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className="text-[var(--border)] opacity-60"
          />

          {/* Active Single-Color Arc (No rainbow gradient, no glow) */}
          <path
            d="M 30 110 A 70 70 0 0 1 170 110"
            fill="none"
            stroke={activeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={arcOffset}
            className="transition-all duration-500 ease-out"
          />

          {/* Neutral Center Pivot */}
          <circle cx="100" cy="110" r="4.5" className="fill-[var(--muted)]" />

          {/* Precision Thin Needle with Spring */}
          <motion.g
            animate={{ rotate: rotation }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            style={{ originX: '100px', originY: '110px' }}
          >
            <line
              x1="100"
              y1="110"
              x2="100"
              y2="46"
              stroke={activeColor}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="100" cy="46" r="2" fill={activeColor} />
          </motion.g>
        </svg>

        {/* Clean Digit Readout (No glow artifacts) */}
        <div className="absolute bottom-0 flex flex-col items-center">
          <div className="text-2xl font-mono font-bold tracking-tight text-[var(--text)]">
            <OdometerCounter value={clampedScore} />
            <span className="text-sm font-normal text-[var(--muted)] ml-0.5">%</span>
          </div>
        </div>
      </div>

      {/* Clean Status Badge (Muted pill, 10-12% tint) */}
      <div className={`mt-3 px-3 py-0.5 rounded-full text-xs font-mono font-medium ${verdictBadge.className}`}>
        {verdictBadge.text}
      </div>
    </div>
  );
};
