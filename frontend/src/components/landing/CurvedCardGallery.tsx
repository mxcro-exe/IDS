import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Database, Code2, Terminal, Cpu, Users, EyeOff, Lock } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

export const CurvedCardGallery: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState<number>(0);

  const cards = [
    {
      title: 'SQL Injection (SQLi)',
      technique: 'T1190',
      desc: 'Token-level extraction & keyword density normalization detecting blind and union payloads.',
      icon: <Database className="w-6 h-6 text-aurora-cyan" />,
      tag: 'Detected by ML',
      tagColor: 'border-aurora-cyan/50 text-aurora-cyan bg-aurora-cyan/10',
    },
    {
      title: 'Cross-Site Scripting (XSS)',
      technique: 'T1059.007',
      desc: 'Script tag, DOM handler, and SVG vector detection across query params and JSON bodies.',
      icon: <Code2 className="w-6 h-6 text-aurora-violet" />,
      tag: 'Blocked at Gateway',
      tagColor: 'border-status-block/50 text-status-block bg-status-block/10',
    },
    {
      title: 'Path Traversal',
      technique: 'T1083',
      desc: 'Recursive ../ dot-dot unmasking detecting arbitrary system file disclosure attempts.',
      icon: <Terminal className="w-6 h-6 text-aurora-indigo" />,
      tag: 'Explained with SHAP',
      tagColor: 'border-aurora-indigo/50 text-aurora-indigo bg-aurora-indigo/10',
    },
    {
      title: 'Command Injection',
      technique: 'T1059',
      desc: 'OS shell metacharacters (; | && ` $) detected before hitting application subprocesses.',
      icon: <Cpu className="w-6 h-6 text-status-block" />,
      tag: 'Zero Latency Cost',
      tagColor: 'border-aurora-violet/50 text-aurora-violet bg-aurora-violet/10',
    },
    {
      title: 'Credential Stuffing',
      technique: 'T1110.004',
      desc: 'Temporal decay behavioral tracker detecting high-frequency login abuse on /api/login.',
      icon: <Lock className="w-6 h-6 text-status-warn" />,
      tag: 'Behavioral Decay',
      tagColor: 'border-status-warn/50 text-status-warn bg-status-warn/10',
    },
    {
      title: 'Decoy Honeypot Hit',
      technique: 'T1592',
      desc: 'Fake admin and /.env endpoints trapping malicious automated scanners with immediate auto-bans.',
      icon: <EyeOff className="w-6 h-6 text-status-block" />,
      tag: 'Auto-Banned 10m',
      tagColor: 'border-status-block/50 text-status-block bg-status-block/10',
    },
  ];

  return (
    <div className="py-12 relative overflow-hidden">
      {/* Section Subheading */}
      <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
        <h3 className="text-2xl sm:text-3xl font-display font-bold text-aurora-text">
          3D Threat Vector Gallery
        </h3>
        <p className="text-xs sm:text-sm font-mono text-aurora-muted">
          Multi-layer detection protecting endpoints against modern evasion techniques.
        </p>
      </div>

      {/* 3D Curved Horizontal Strip */}
      <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-8 pt-4 px-4 sm:px-12 no-scrollbar perspective-[1200px] justify-start md:justify-center">
        {cards.map((card, idx) => {
          const isActive = activeIdx === idx;
          const diff = idx - activeIdx;
          const rotateY = diff * 8; // Curved strip perspective

          return (
            <motion.div
              key={card.title}
              onMouseEnter={() => setActiveIdx(idx)}
              style={{
                transform: `perspective(1000px) rotateY(${rotateY}deg)`,
              }}
              whileHover={{ y: -8, scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`flex-shrink-0 w-72 sm:w-80 rounded-3xl glass-card p-6 border transition-all duration-300 relative ${
                isActive
                  ? 'border-aurora-violet/60 shadow-glow-aurora scale-105 opacity-100 z-20'
                  : 'border-aurora-border opacity-75 hover:opacity-100 z-10'
              }`}
            >
              {/* Floating Pill Tag */}
              <div className="flex items-center justify-between mb-4">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${card.tagColor}`}>
                  {card.tag}
                </span>
                <span className="text-[10px] font-mono text-aurora-muted">
                  MITRE {card.technique}
                </span>
              </div>

              {/* Icon */}
              <div className="p-3 rounded-2xl bg-white/10 w-fit mb-4">
                {card.icon}
              </div>

              {/* Title & Desc */}
              <div className="space-y-1.5 font-mono">
                <h4 className="text-base font-display font-bold text-aurora-text">
                  {card.title}
                </h4>
                <p className="text-xs text-aurora-muted leading-relaxed">
                  {card.desc}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
