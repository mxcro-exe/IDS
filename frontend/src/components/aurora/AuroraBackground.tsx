import React from 'react';
import { motion } from 'framer-motion';

interface AuroraBackgroundProps {
  threatLevel?: number; // 0 to 100
  children?: React.ReactNode;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  threatLevel = 15,
  children,
}) => {
  // Threat-reactive ambient: during block spikes, top-left glow smoothly tints toward the BLOCK color at max 8% opacity
  const isHighThreat = threatLevel >= 65;
  const threatFactor = Math.min(Math.max((threatLevel - 20) / 80, 0), 1);

  // Smooth tint: accent (rgba(91, 141, 239, 0.07)) -> block tint (rgba(229, 101, 111, 0.08))
  const ambientGlowColor = isHighThreat
    ? `rgba(229, 101, 111, ${0.05 + threatFactor * 0.03})`
    : 'rgba(91, 141, 239, 0.07)';

  return (
    <div className="app-wrapper relative min-h-screen min-h-[100dvh] w-full overflow-hidden bg-[var(--bg)] text-[var(--text)] transition-colors duration-400">
      
      {/* Clean Ambient Accent Glow (Soft, smooth, zero rough noise) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          className="absolute -top-[15%] -left-[10%] w-[680px] h-[680px] rounded-full blur-[140px] pointer-events-none"
          animate={{
            backgroundColor: ambientGlowColor,
          }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />
      </div>

      {/* Main UI Layer */}
      <div className="relative z-10 flex flex-col min-h-screen min-h-[100dvh]">
        {children}
      </div>
    </div>
  );
};
