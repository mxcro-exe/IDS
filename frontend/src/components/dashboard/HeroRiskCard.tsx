import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Activity, ArrowUpRight, Lock } from 'lucide-react';
import { CountUp } from '../motion/CountUp';

interface HeroRiskCardProps {
  threatLevel: number; // 0 to 100
  blockedCount: number;
  mode: string;
  currentLang: string;
}

export const HeroRiskCard: React.FC<HeroRiskCardProps> = ({
  threatLevel = 28,
  blockedCount = 4,
  mode = 'protect',
  currentLang,
}) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className="relative overflow-hidden rounded-3xl p-6 md:p-8 hero-gradient-card text-white shadow-coral-glow flex flex-col justify-between"
    >
      {/* Decorative Background Glow Orb */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

      {/* Header */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold tracking-wider uppercase">
          <Activity className="w-3.5 h-3.5" />
          <span>{currentLang === 'ta' ? 'நுழைவாயில் அச்சுறுத்தல் நிலை' : 'Gateway Threat Sensor'}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 text-[10px] font-mono font-bold tracking-widest uppercase">
          <Lock className="w-3 h-3 text-emerald-300" />
          <span>{mode}</span>
        </div>
      </div>

      {/* Center Metric Display */}
      <div className="my-6 z-10">
        <div className="text-xs uppercase font-bold tracking-wider text-white/80">
          {currentLang === 'ta' ? 'தற்போதைய ஆபத்து குறியீடு' : 'Current Threat Level'}
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <div className="text-5xl md:text-6xl font-bold font-mono tracking-tight">
            <CountUp value={threatLevel} duration={1.2} />
          </div>
          <span className="text-xl font-bold text-white/70">/ 100</span>
        </div>
      </div>

      {/* Progress Bar with animated stripe fill */}
      <div className="space-y-2 z-10">
        <div className="flex justify-between text-xs font-semibold text-white/90">
          <span>{currentLang === 'ta' ? 'கவச நிலை' : 'Shield Integrity'}</span>
          <span>{100 - threatLevel}% SAFE</span>
        </div>
        <div className="w-full h-3.5 rounded-full bg-black/25 overflow-hidden p-0.5 border border-white/20">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(threatLevel, 100)}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="h-full rounded-full bg-white stripe-fill shadow-sm"
          />
        </div>
      </div>

      {/* Footer Details */}
      <div className="pt-5 mt-4 border-t border-white/20 flex items-center justify-between text-xs text-white/80 z-10">
        <div className="flex items-center gap-1.5 font-medium">
          <ShieldAlert className="w-4 h-4 text-white" />
          <span>
            {currentLang === 'ta' ? 'தடுக்கப்பட்ட தாக்குதல்கள்:' : 'Attacks Intercepted:'}{' '}
            <strong className="text-white font-mono">{blockedCount}</strong>
          </span>
        </div>
        <div className="text-[11px] text-white/70 font-mono">MITRE ATT&CK v14</div>
      </div>
    </motion.div>
  );
};
