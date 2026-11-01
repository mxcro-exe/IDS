import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Server, Laptop } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface PacketFlowProps {
  onTriggerToast?: (toast: {
    attack_type: string;
    client_ip: string;
    risk_score: number;
    mitre_id?: string;
    reason?: string;
  }) => void;
}

export const PacketFlow: React.FC<PacketFlowProps> = ({ onTriggerToast }) => {
  const [activeScenario, setActiveScenario] = useState<'allow' | 'block' | 'ratelimit'>('allow');
  const [animating, setAnimating] = useState<boolean>(false);
  const [shieldImpact, setShieldImpact] = useState<boolean>(false);
  const [apiDelivered, setApiDelivered] = useState<boolean>(false);

  const triggerFlow = (scenario: 'allow' | 'block' | 'ratelimit') => {
    setActiveScenario(scenario);
    setAnimating(true);
    setShieldImpact(false);
    setApiDelivered(false);

    // Trigger toast notification
    if (onTriggerToast) {
      if (scenario === 'block') {
        onTriggerToast({
          attack_type: 'SQL_Injection',
          client_ip: '192.168.1.100',
          risk_score: 0.98,
          mitre_id: 'T1190',
          reason: 'Exploit payload blocked at gateway reverse proxy inspection.',
        });
      } else if (scenario === 'ratelimit') {
        onTriggerToast({
          attack_type: 'Rate_Limit_Burst',
          client_ip: '192.168.1.100',
          risk_score: 0.62,
          mitre_id: 'T1499',
          reason: 'HTTP 429 Too Many Requests: Sliding window limit (50 req/60s) exceeded.',
        });
      } else {
        onTriggerToast({
          attack_type: 'Benign_Traffic',
          client_ip: '192.168.1.100',
          risk_score: 0.08,
          mitre_id: 'Valid_API',
          reason: 'Benign query verified and forwarded to protected microservices.',
        });
      }
    }

    // Timeline:
    // 0ms: Packet leaves Client
    // 550ms: Hits Gateway Shield
    setTimeout(() => {
      setShieldImpact(true);
      if (scenario === 'allow') {
        setTimeout(() => setApiDelivered(true), 550);
      }
    }, 550);

    setTimeout(() => {
      setAnimating(false);
    }, 1600);
  };

  return (
    <GlassCard className="p-5 space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-sans font-semibold text-[var(--text)]">
            Packet-Flow Architecture
          </h3>
          <p className="text-xs text-[var(--muted)] font-sans">
            Client &rarr; AegisGate IDS (Reverse Proxy) &rarr; Protected API Microservices
          </p>
        </div>

        {/* Action Buttons (Clean, no glow) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerFlow('allow')}
            className="px-3 py-1.5 rounded-lg text-xs font-sans font-medium border border-[var(--border)] hover:border-[var(--status-allow)]/40 hover:bg-[var(--status-allow)]/10 text-[var(--status-allow)] transition-colors"
          >
            Pass Benign
          </button>
          <button
            onClick={() => triggerFlow('block')}
            className="px-3 py-1.5 rounded-lg text-xs font-sans font-medium border border-[var(--border)] hover:border-[var(--status-block)]/40 hover:bg-[var(--status-block)]/10 text-[var(--status-block)] transition-colors"
          >
            Block Threat
          </button>
          <button
            onClick={() => triggerFlow('ratelimit')}
            className="px-3 py-1.5 rounded-lg text-xs font-sans font-medium border border-[var(--border)] hover:border-[var(--status-warn)]/40 hover:bg-[var(--status-warn)]/10 text-[var(--status-warn)] transition-colors"
          >
            429 Rate-Limit
          </button>
        </div>
      </div>

      {/* Diagram Canvas: Reduced height, enlarged nodes */}
      <div className="relative h-40 sm:h-44 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-solid)]/40 flex items-center justify-between px-8 sm:px-20 overflow-hidden">
        
        {/* Neutral Gray Dashed Trajectory Line */}
        <div className="absolute inset-x-16 sm:inset-x-28 h-0.5 border-t border-dashed border-[var(--border)]" />

        {/* Continuous Ambient Accent Packet Dots (Moving Client -> Gateway -> API at all times) */}
        {!animating && (
          <motion.div
            className="absolute w-2 h-2 rounded-full bg-[var(--accent)] opacity-60 z-20"
            initial={{ left: '16%' }}
            animate={{ left: '84%' }}
            transition={{
              duration: 4.5,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        )}

        {/* 1. Client Node */}
        <div className="relative z-10 flex flex-col items-center gap-1.5">
          <div className="w-14 h-14 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] flex items-center justify-center text-[var(--muted)]">
            <Laptop className="w-6 h-6 text-[var(--text)]" />
          </div>
          <span className="text-xs font-sans font-medium text-[var(--text)]">Client Node</span>
          <span className="text-[11px] font-mono text-[var(--muted)]">192.168.1.100</span>
        </div>

        {/* Interactive Triggered Packet */}
        {animating && (
          <>
            {/* Packet from Client -> Gateway */}
            <motion.div
              initial={{ left: '18%', top: '50%', scale: 0.7, opacity: 0 }}
              animate={{ left: '50%', top: '50%', scale: 1, opacity: 1 }}
              transition={{ duration: 0.55, ease: 'easeInOut' }}
              className={`absolute z-30 -translate-x-1/2 -translate-y-1/2 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border ${
                activeScenario === 'allow'
                  ? 'bg-[var(--status-allow)]/15 border-[var(--status-allow)] text-[var(--status-allow)]'
                  : activeScenario === 'block'
                  ? 'bg-[var(--status-block)]/15 border-[var(--status-block)] text-[var(--status-block)]'
                  : 'bg-[var(--status-warn)]/15 border-[var(--status-warn)] text-[var(--status-warn)]'
              }`}
            >
              {activeScenario === 'allow' ? 'GET /users' : activeScenario === 'block' ? 'SQLi Payload' : 'Burst #51'}
            </motion.div>

            {/* Allowed packet from Gateway -> Protected API */}
            {activeScenario === 'allow' && (
              <motion.div
                initial={{ left: '50%', top: '50%', scale: 1, opacity: 0 }}
                animate={{ left: '82%', top: '50%', scale: 1, opacity: 1 }}
                transition={{ delay: 0.55, duration: 0.55, ease: 'easeOut' }}
                className="absolute z-30 -translate-x-1/2 -translate-y-1/2 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[var(--status-allow)]/15 border border-[var(--status-allow)] text-[var(--status-allow)]"
              >
                Forwarded (200 OK)
              </motion.div>
            )}

            {/* Rate-limit bounced packet */}
            {activeScenario === 'ratelimit' && (
              <motion.div
                initial={{ left: '50%', top: '50%', scale: 1, opacity: 1 }}
                animate={{ left: '26%', top: '65%', scale: 0.9, opacity: 0 }}
                transition={{ delay: 0.55, duration: 0.6, ease: 'easeOut' }}
                className="absolute z-30 -translate-x-1/2 -translate-y-1/2 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[var(--status-warn)]/15 border border-[var(--status-warn)] text-[var(--status-warn)]"
              >
                429 Bounced
              </motion.div>
            )}
          </>
        )}

        {/* 2. Gateway Shield Node */}
        <div className="relative z-10 flex flex-col items-center gap-1.5">
          {/* Quick Shield Ripple on Block Impact */}
          {shieldImpact && activeScenario === 'block' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0.8 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute top-1 w-14 h-14 rounded-xl border border-[var(--status-block)]"
            />
          )}

          <div
            className={`w-14 h-14 rounded-xl border bg-[var(--surface-solid)] flex items-center justify-center transition-colors duration-200 ${
              shieldImpact && activeScenario === 'block'
                ? 'border-[var(--status-block)] text-[var(--status-block)]'
                : shieldImpact && activeScenario === 'allow'
                ? 'border-[var(--status-allow)] text-[var(--status-allow)]'
                : 'border-[var(--border)] text-[var(--accent)]'
            }`}
          >
            <Shield className="w-6 h-6" />
          </div>
          <span className="text-xs font-sans font-medium text-[var(--text)]">AegisGate IDS</span>
          <span className="text-[11px] font-mono text-[var(--muted)]">Reverse Proxy</span>
        </div>

        {/* 3. Protected Backend API Node */}
        <div className="relative z-10 flex flex-col items-center gap-1.5">
          <div
            className={`w-14 h-14 rounded-xl border bg-[var(--surface-solid)] flex items-center justify-center transition-colors duration-200 ${
              apiDelivered
                ? 'border-[var(--status-allow)] text-[var(--status-allow)]'
                : 'border-[var(--border)] text-[var(--muted)]'
            }`}
          >
            <Server className="w-6 h-6 text-[var(--text)]" />
          </div>
          <span className="text-xs font-sans font-medium text-[var(--text)]">Protected API</span>
          <span className="text-[11px] font-mono text-[var(--muted)]">Microservices</span>
        </div>

      </div>
    </GlassCard>
  );
};
