import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

export interface TrafficPoint {
  time: string;
  allowed: number;
  warned: number;
  blocked: number;
}

interface LiveTrafficChartProps {
  data: TrafficPoint[];
  currentLang?: string;
}

export const LiveTrafficChart: React.FC<LiveTrafficChartProps> = ({
  data = [],
  currentLang = 'en',
}) => {
  const [filter, setFilter] = useState<'live' | '5m' | '15m'>('live');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Realistic baseline demo traffic with continuous flow (no flat zeroes)
  const defaultLivePoints: TrafficPoint[] = [
    { time: '-60s', allowed: 42, warned: 11, blocked: 5 },
    { time: '-55s', allowed: 48, warned: 13, blocked: 6 },
    { time: '-50s', allowed: 45, warned: 12, blocked: 7 },
    { time: '-45s', allowed: 52, warned: 15, blocked: 8 },
    { time: '-40s', allowed: 58, warned: 16, blocked: 7 },
    { time: '-35s', allowed: 54, warned: 14, blocked: 6 },
    { time: '-30s', allowed: 62, warned: 18, blocked: 9 },
    { time: '-25s', allowed: 68, warned: 19, blocked: 11 },
    { time: '-20s', allowed: 65, warned: 17, blocked: 8 },
    { time: '-15s', allowed: 72, warned: 21, blocked: 10 },
    { time: '-10s', allowed: 70, warned: 19, blocked: 9 },
    { time: '-5s',  allowed: 76, warned: 22, blocked: 12 },
    { time: 'Now',  allowed: 74, warned: 20, blocked: 10 },
  ];

  const default5mPoints: TrafficPoint[] = [
    { time: '-5m', allowed: 320, warned: 85, blocked: 42 },
    { time: '-4m', allowed: 345, warned: 92, blocked: 46 },
    { time: '-3m', allowed: 390, warned: 105, blocked: 58 },
    { time: '-2m', allowed: 410, warned: 112, blocked: 52 },
    { time: '-1m', allowed: 435, warned: 118, blocked: 60 },
    { time: 'Now', allowed: 450, warned: 122, blocked: 64 },
  ];

  const default15mPoints: TrafficPoint[] = [
    { time: '-15m', allowed: 890, warned: 240, blocked: 120 },
    { time: '-12m', allowed: 940, warned: 260, blocked: 135 },
    { time: '-9m',  allowed: 1020, warned: 285, blocked: 150 },
    { time: '-6m',  allowed: 1150, warned: 310, blocked: 165 },
    { time: '-3m',  allowed: 1210, warned: 330, blocked: 172 },
    { time: 'Now',  allowed: 1280, warned: 345, blocked: 180 },
  ];

  const points =
    filter === '5m'
      ? default5mPoints
      : filter === '15m'
      ? default15mPoints
      : data && data.length >= 5
      ? data
      : defaultLivePoints;

  const maxVal = Math.max(...points.map((p) => p.allowed + p.warned + p.blocked), 20);

  // Chart dimensions with room for axes
  const width = 640;
  const height = 180;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 30;

  const getX = (index: number) => {
    return paddingLeft + (index / (points.length - 1)) * (width - paddingLeft - paddingRight);
  };

  const getY = (val: number) => {
    return height - paddingBottom - (val / maxVal) * (height - paddingTop - paddingBottom);
  };

  // Build SVG path
  const linePath = points.reduce((acc, curr, idx) => {
    const total = curr.allowed + curr.warned + curr.blocked;
    const x = getX(idx);
    const y = getY(total);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const areaPath = `${linePath} L ${getX(points.length - 1)} ${height - paddingBottom} L ${getX(0)} ${height - paddingBottom} Z`;

  return (
    <GlassCard className="p-5 space-y-3.5">
      {/* Header and Filter Pills */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-sans font-semibold text-[var(--text)] flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--accent)]" />
            <span>{currentLang === 'ta' ? 'நிகழ்நேர போக்குவரத்து ஓட்டம்' : 'Real-Time Request Traffic'}</span>
          </h4>
          <span className="text-xs font-sans text-[var(--muted)]">
            Continuous proxy packet throughput (Requests / Sec)
          </span>
        </div>

        {/* Filter Segmented Control (Solid accent on active, no glow) */}
        <div className="inline-flex items-center p-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface-solid)] text-xs font-mono">
          {(['live', '5m', '15m'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-3 py-1 rounded-md transition-all font-medium ${
                filter === mode
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas Area Chart */}
      <div className="relative w-full h-48 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-solid)]/30 p-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            {/* Soft 10% area gradient fill */}
            <linearGradient id="slateproAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.10" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Neutral Gridlines at 6% opacity */}
          <line
            x1={paddingLeft}
            y1={getY(maxVal)}
            x2={width - paddingRight}
            y2={getY(maxVal)}
            stroke="currentColor"
            strokeDasharray="3 3"
            className="text-[var(--text)] opacity-[0.06]"
          />
          <line
            x1={paddingLeft}
            y1={getY(maxVal / 2)}
            x2={width - paddingRight}
            y2={getY(maxVal / 2)}
            stroke="currentColor"
            strokeDasharray="3 3"
            className="text-[var(--text)] opacity-[0.06]"
          />
          <line
            x1={paddingLeft}
            y1={height - paddingBottom}
            x2={width - paddingRight}
            y2={height - paddingBottom}
            stroke="currentColor"
            className="text-[var(--border)]"
          />

          {/* Muted Y-Axis Labels */}
          <text
            x={paddingLeft - 8}
            y={getY(maxVal) + 4}
            textAnchor="end"
            className="text-[10px] font-mono fill-[var(--muted)] opacity-80"
          >
            {Math.round(maxVal)}
          </text>
          <text
            x={paddingLeft - 8}
            y={getY(maxVal / 2) + 4}
            textAnchor="end"
            className="text-[10px] font-mono fill-[var(--muted)] opacity-80"
          >
            {Math.round(maxVal / 2)}
          </text>
          <text
            x={paddingLeft - 8}
            y={height - paddingBottom + 3}
            textAnchor="end"
            className="text-[10px] font-mono fill-[var(--muted)] opacity-80"
          >
            0
          </text>

          {/* Area Fill */}
          <motion.path
            d={areaPath}
            fill="url(#slateproAreaGrad)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />

          {/* Single Accent Line (1.5px, no glow) */}
          <motion.path
            d={linePath}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* X-Axis Time Labels & Interactive Data Nodes */}
          {points.map((pt, idx) => {
            const total = pt.allowed + pt.warned + pt.blocked;
            const cx = getX(idx);
            const cy = getY(total);
            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                {/* Subtle vertical hover guideline */}
                {isHovered && (
                  <line
                    x1={cx}
                    y1={paddingTop}
                    x2={cx}
                    y2={height - paddingBottom}
                    stroke="var(--accent)"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.4"
                  />
                )}

                {/* Point dot on hover */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 4 : 2}
                  fill="var(--surface-solid)"
                  stroke="var(--accent)"
                  strokeWidth="1.5"
                  className="transition-all"
                />

                {/* Muted X-Axis Time Label (spaced) */}
                {(idx === 0 || idx === Math.floor(points.length / 2) || idx === points.length - 1) && (
                  <text
                    x={cx}
                    y={height - 8}
                    textAnchor="middle"
                    className="text-[10px] font-mono fill-[var(--muted)] opacity-80"
                  >
                    {pt.time}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Clean Hover Tooltip (Neutral card, no glow) */}
        {hoveredIndex !== null && (
          <div className="absolute top-2.5 right-3 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-solid)] text-xs font-mono text-[var(--text)] shadow-sm flex items-center gap-3">
            <span className="text-[var(--muted)]">{points[hoveredIndex].time}</span>
            <span className="text-[var(--status-allow)]">Allow: {points[hoveredIndex].allowed}</span>
            <span className="text-[var(--status-warn)]">Warn: {points[hoveredIndex].warned}</span>
            <span className="text-[var(--status-block)]">Block: {points[hoveredIndex].blocked}</span>
          </div>
        )}
      </div>
    </GlassCard>
  );
};
