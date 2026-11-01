import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, ShieldCheck, Activity, BrainCircuit } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

export const HighlightsStrip: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState<number>(0);

  const highlights = [
    {
      title: 'Hybrid ML Architecture',
      subtitle: 'Random Forest (100 Trees) + Isolation Forest Anomaly Detection',
      desc: 'Dual-engine classification combines supervised OWASP attack recognition with unsupervised zero-day outlier anomaly detection in sub-3ms latency.',
      icon: <BrainCircuit className="w-8 h-8 text-aurora-cyan" />,
      stat: '98.8%',
      statLabel: 'Test Accuracy',
    },
    {
      title: 'TreeSHAP Forensic Explainability',
      subtitle: 'Game-Theoretic Feature Attribution per Request',
      desc: 'Every block action provides human-readable Shapley additive explanations, pinpointing which characters, entropy scores, or keywords drove the decision.',
      icon: <Cpu className="w-8 h-8 text-aurora-violet" />,
      stat: '23',
      statLabel: 'Engineered Features',
    },
    {
      title: 'Active Decoy Honeypots',
      subtitle: 'Auto-Ban Traps Neutralizing Automated Scanners',
      desc: 'Decoy paths (/admin, /.env, /actuator) identify malicious reconnaissance tools (sqlmap, nuclei, nikto) and enforce immediate 10-minute client IP bans.',
      icon: <ShieldCheck className="w-8 h-8 text-status-block" />,
      stat: '10 min',
      statLabel: 'Isolation Cooldown',
    },
    {
      title: 'Sliding-Window Rate Limiter',
      subtitle: 'Thread-Safe Memory Throttling & Burst Prevention',
      desc: 'Deque-based sliding window prevents API exhaustion and brute-force credential stuffing with zero database query overhead.',
      icon: <Activity className="w-8 h-8 text-status-allow" />,
      stat: '2.8 ms',
      statLabel: 'Average Latency',
    },
  ];

  return (
    <div className="py-12 space-y-6">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h3 className="text-2xl sm:text-3xl font-display font-bold text-aurora-text">
          Architecture Highlights
        </h3>
        <p className="text-xs sm:text-sm font-mono text-aurora-muted">
          Hover to expand technical specifications of the AegisGate engine.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 h-[420px]">
        {highlights.map((item, idx) => {
          const isActive = activeIdx === idx;

          return (
            <motion.div
              key={item.title}
              onMouseEnter={() => setActiveIdx(idx)}
              layout
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className={`rounded-3xl glass-card p-8 border transition-all duration-300 flex flex-col justify-between cursor-pointer overflow-hidden ${
                isActive
                  ? 'flex-[2.4] border-aurora-violet/60 shadow-glow-aurora'
                  : 'flex-1 border-aurora-border opacity-70 hover:opacity-100'
              }`}
            >
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-white/10 w-fit">
                  {item.icon}
                </div>

                <div>
                  <h4 className="text-xl font-display font-bold text-aurora-text">
                    {item.title}
                  </h4>
                  <p className="text-xs font-mono text-aurora-cyan mt-1">
                    {item.subtitle}
                  </p>
                </div>

                {isActive && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-xs font-mono text-aurora-muted leading-relaxed pt-2"
                  >
                    {item.desc}
                  </motion.p>
                )}
              </div>

              {/* Bottom Stat */}
              <div className="pt-4 border-t border-white/10 flex items-baseline justify-between font-mono">
                <span className="text-2xl sm:text-3xl font-display font-bold text-aurora-text">
                  {item.stat}
                </span>
                <span className="text-[11px] text-aurora-muted uppercase tracking-wider">
                  {item.statLabel}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
