import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

export interface RadarBlip {
  id: string;
  ip: string;
  risk: number; // 0.0 to 1.0
  action: 'ALLOW' | 'WARN' | 'BLOCK';
  attackType: string;
  angle: number; // 0 to 360 degrees
  distance: number; // radius %
  time: string;
}

interface RadarViewProps {
  currentLang?: string;
  recentRequests?: any[];
  onSelectIp?: (ip: string) => void;
}

export const RadarView: React.FC<RadarViewProps> = ({
  currentLang = 'en',
  recentRequests = [],
  onSelectIp,
}) => {
  const [blips, setBlips] = useState<RadarBlip[]>([
    { id: 'b1', ip: '192.168.1.45', risk: 0.12, action: 'ALLOW', attackType: 'Benign_Traffic', angle: 45, distance: 28, time: '12s ago' },
    { id: 'b2', ip: '10.0.0.12', risk: 0.54, action: 'WARN', attackType: 'High_Entropy_Scan', angle: 160, distance: 58, time: '8s ago' },
    { id: 'b3', ip: '45.33.32.156', risk: 0.98, action: 'BLOCK', attackType: 'SQL_Injection', angle: 290, distance: 92, time: '2s ago' },
    { id: 'b4', ip: '172.16.4.88', risk: 0.88, action: 'BLOCK', attackType: 'Honeypot_Hit', angle: 210, distance: 88, time: '4s ago' },
    { id: 'b5', ip: '192.168.1.102', risk: 0.08, action: 'ALLOW', attackType: 'API_Search', angle: 95, distance: 22, time: '1s ago' },
  ]);

  const [hoveredBlip, setHoveredBlip] = useState<RadarBlip | null>(null);

  useEffect(() => {
    if (!recentRequests || recentRequests.length === 0) return;
    const latest = recentRequests[0];
    if (!latest) return;

    const hash = (latest.client_ip || '127.0.0.1')
      .split('')
      .reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const angle = (hash * 37) % 360;
    const distance = Math.min(Math.max((latest.risk_score || 0.2) * 85 + 15, 15), 94);

    const newBlip: RadarBlip = {
      id: `blip-${Date.now()}`,
      ip: latest.client_ip || '127.0.0.1',
      risk: latest.risk_score || 0.1,
      action: latest.action || 'ALLOW',
      attackType: latest.attack_type || 'Benign',
      angle,
      distance,
      time: 'Just now',
    };

    setBlips((prev) => [newBlip, ...prev.slice(0, 14)]);
  }, [recentRequests]);

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-sans font-semibold text-[var(--text)] flex items-center gap-2">
            <Radio className="w-4 h-4 text-[var(--accent)]" />
            <span>{currentLang === 'ta' ? 'அச்சுறுத்தல் ரேடார்' : 'Threat Perimeter Radar'}</span>
          </h2>
          <p className="text-xs text-[var(--muted)] font-sans">
            360-degree perimeter vector analysis &bull; Center = Safe core, Outer rings = Hostile perimeter
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--status-allow)]" />
            <span className="text-[var(--muted)]">ALLOW</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--status-warn)]" />
            <span className="text-[var(--muted)]">WARN</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--status-block)]" />
            <span className="text-[var(--muted)]">BLOCK</span>
          </div>
        </div>
      </div>

      {/* Main Radar Surface */}
      <GlassCard className="p-6 flex items-center justify-center min-h-[480px] relative overflow-hidden">
        {/* Circular Radar Container */}
        <div className="relative w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] rounded-full border border-[var(--border)] flex items-center justify-center">
          
          {/* Neutral Range Rings */}
          <div className="absolute w-[25%] h-[25%] rounded-full border border-[var(--border)]" />
          <span className="absolute top-[38%] left-3 text-[9px] font-mono text-[var(--muted)] opacity-60">0.25</span>

          <div className="absolute w-[50%] h-[50%] rounded-full border border-[var(--border)]" />
          <span className="absolute top-[26%] left-3 text-[9px] font-mono text-[var(--muted)] opacity-60">0.50</span>

          <div className="absolute w-[75%] h-[75%] rounded-full border border-[var(--border)]" />
          <span className="absolute top-[13%] left-3 text-[9px] font-mono text-[var(--muted)] opacity-60">0.75</span>

          <div className="absolute inset-0 rounded-full border border-[var(--border)]" />
          <span className="absolute top-2 left-3 text-[9px] font-mono text-[var(--muted)] font-medium">1.00</span>

          {/* Neutral Crosshairs */}
          <div className="absolute inset-x-0 h-px bg-[var(--border)] opacity-60" />
          <div className="absolute inset-y-0 w-px bg-[var(--border)] opacity-60" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
          </div>

          {/* Accent Sweep at Low Opacity (10-12%) */}
          <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none animate-radar-sweep">
            <div
              className="w-1/2 h-1/2 origin-bottom-right"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0deg, rgba(91, 141, 239, 0.12) 40deg, transparent 45deg)',
              }}
            />
          </div>

          {/* Render Blips (Muted status colors, clean dots) */}
          {blips.map((blip) => {
            const rad = (blip.angle * Math.PI) / 180;
            const rPercent = (blip.distance / 100) * 45;
            const topPercent = 50 - rPercent * Math.cos(rad);
            const leftPercent = 50 + rPercent * Math.sin(rad);

            const isBlock = blip.action === 'BLOCK';
            const isWarn = blip.action === 'WARN';

            const blipColor = isBlock
              ? 'bg-[var(--status-block)]'
              : isWarn
              ? 'bg-[var(--status-warn)]'
              : 'bg-[var(--status-allow)]';

            return (
              <div
                key={blip.id}
                onMouseEnter={() => setHoveredBlip(blip)}
                onMouseLeave={() => setHoveredBlip(null)}
                onClick={() => onSelectIp && onSelectIp(blip.ip)}
                className="absolute cursor-pointer -translate-x-1/2 -translate-y-1/2 z-20 group p-1"
                style={{ top: `${topPercent}%`, left: `${leftPercent}%` }}
                title={`Click to view Attacker Profile: ${blip.ip}`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full ${blipColor} transition-transform group-hover:scale-150`}
                />
              </div>
            );
          })}
        </div>

        {/* Clean Hover Tooltip (Neutral card, no glow) */}
        <AnimatePresence>
          {hoveredBlip && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-5 left-5 z-30 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] shadow-md min-w-[220px] font-mono text-xs space-y-1"
            >
              <div className="flex items-center justify-between pb-1 border-b border-[var(--border)]">
                <span className="font-semibold text-[var(--text)]">{hoveredBlip.ip}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${
                    hoveredBlip.action === 'BLOCK'
                      ? 'badge-block'
                      : hoveredBlip.action === 'WARN'
                      ? 'badge-warn'
                      : 'badge-allow'
                  }`}
                >
                  {hoveredBlip.action}
                </span>
              </div>
              <div className="text-[var(--text)] flex justify-between text-[11px]">
                <span className="text-[var(--muted)]">Vector:</span>
                <span>{hoveredBlip.attackType}</span>
              </div>
              <div className="text-[var(--text)] flex justify-between text-[11px]">
                <span className="text-[var(--muted)]">Risk:</span>
                <span className="font-semibold">{(hoveredBlip.risk * 100).toFixed(0)}%</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </div>
  );
};
