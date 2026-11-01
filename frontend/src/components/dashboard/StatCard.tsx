import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { OdometerCounter } from '../motion/OdometerCounter';

interface StatCardProps {
  label: string;
  value: number;
  subtext?: string;
  trend?: string;
  trendUp?: boolean;
  color?: 'allow' | 'warn' | 'block' | 'default';
  isDecimal?: boolean;
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  trend,
  trendUp = true,
  color = 'default',
  isDecimal = false,
  prefix = '',
  suffix = '',
  icon,
}) => {
  // Status indicator dot color
  const dotColorClass = {
    allow: 'bg-[var(--status-allow)]',
    warn: 'bg-[var(--status-warn)]',
    block: 'bg-[var(--status-block)]',
    default: 'bg-[var(--accent)]',
  }[color];

  // Number color
  const valueColorClass = {
    allow: 'text-[var(--status-allow)]',
    warn: 'text-[var(--status-warn)]',
    block: 'text-[var(--status-block)]',
    default: 'text-[var(--text)]',
  }[color];

  return (
    <GlassCard glow={color} className="p-5 flex flex-col justify-between">
      {/* Top Row: Status Dot + Label, and Trend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Status Dot: small, clean (no glow spread) */}
          <span className={`w-2 h-2 rounded-full ${dotColorClass}`} />
          <span className="text-[13px] font-sans font-medium text-[var(--muted)]">
            {label}
          </span>
        </div>

        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-mono px-2 py-0.5 rounded-full border ${
              trendUp
                ? 'text-[var(--status-allow)] border-[var(--status-allow)]/20 bg-[var(--status-allow)]/10'
                : 'text-[var(--status-block)] border-[var(--status-block)]/20 bg-[var(--status-block)]/10'
            }`}
          >
            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{trend}</span>
          </span>
        )}
      </div>

      {/* Main Value in Monospace Numbers */}
      <div className="my-2.5">
        <span className={`text-3xl font-mono font-semibold tracking-tight ${valueColorClass}`}>
          <OdometerCounter
            value={value}
            decimals={isDecimal ? 1 : 0}
            prefix={prefix}
            suffix={suffix}
          />
        </span>
      </div>

      {/* Subtext */}
      {subtext && (
        <div className="text-xs font-sans text-[var(--muted)] pt-2 border-t border-[var(--border)] opacity-80">
          {subtext}
        </div>
      )}
    </GlassCard>
  );
};
