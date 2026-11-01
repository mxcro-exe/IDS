import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ShieldCheck, Sparkles, Award } from 'lucide-react';

export const LanyardBadge: React.FC = () => {
  const cardRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Spring physics for natural pendulum rebound
  const springConfig = { damping: 14, stiffness: 120, mass: 1.2 };
  const smoothX = useSpring(x, springConfig);
  const smoothY = useSpring(y, springConfig);

  // Dynamic rotation based on drag position
  const rotateZ = useTransform(smoothX, [-150, 150], [-22, 22]);
  const rotateY = useTransform(smoothX, [-150, 150], [14, -14]);
  const rotateX = useTransform(smoothY, [-100, 100], [-14, 14]);

  return (
    <div className="relative flex flex-col items-center select-none pt-4 pb-8" style={{ perspective: 1200 }}>
      {/* Top Ceiling Hook */}
      <div className="w-8 h-3 rounded-full bg-aurora-border shadow-inner -mb-1 z-20" />

      {/* Lanyard Fabric Strap (Rope) */}
      <div className="relative w-4 h-24 bg-gradient-to-b from-[#070B14] to-[#1E1B4B] rounded-sm shadow-md flex items-center justify-center overflow-hidden border-x border-white/10">
        <div className="w-0.5 h-full bg-gradient-to-b from-aurora-cyan to-aurora-violet" />
        <span className="text-[6px] tracking-widest text-aurora-cyan font-bold rotate-90 uppercase">
          AEGIS
        </span>
      </div>

      {/* Metallic Clip & Ring */}
      <div className="w-6 h-6 rounded-full border border-aurora-cyan/40 bg-gradient-to-tr from-[#1E1B4B] to-[#312E81] shadow-md flex items-center justify-center -mt-2 z-10">
        <div className="w-2 h-2 rounded-full bg-aurora-cyan" />
      </div>

      {/* Draggable ID Badge Card */}
      <motion.div
        ref={cardRef}
        drag
        dragConstraints={{ left: -120, right: 120, top: -40, bottom: 80 }}
        dragElastic={0.6}
        style={{
          x: smoothX,
          y: smoothY,
          rotateZ,
          rotateY,
          rotateX,
          transformStyle: 'preserve-3d',
        }}
        whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
        whileHover={{ cursor: 'grab' }}
        className="relative w-64 md:w-72 mt-2 rounded-3xl p-6 glass-card border border-aurora-violet/40 shadow-glow-aurora"
      >
        {/* Hologram Ribbon Accent */}
        <div className="absolute top-0 left-6 right-6 h-1.5 rounded-b-full bg-gradient-to-r from-aurora-indigo via-aurora-violet to-aurora-cyan" />

        {/* Lanyard Slot Hole */}
        <div className="w-12 h-2 mx-auto rounded-full bg-black/40 border border-white/20 mb-4" />

        {/* Badge Header: Photo / Shield Hologram Avatar */}
        <div className="flex items-center gap-3.5 pb-4 border-b border-white/10">
          <div className="relative w-12 h-12 rounded-2xl glass-card border border-aurora-cyan/40 flex items-center justify-center text-aurora-cyan shadow-glow-aurora overflow-hidden">
            <ShieldCheck className="w-6 h-6" />
            <div className="absolute inset-0 bg-gradient-to-tr from-aurora-cyan/20 to-transparent pointer-events-none" />
          </div>

          <div>
            <div className="text-sm font-display font-bold text-aurora-text leading-tight">
              AegisGate IDS
            </div>
            <div className="text-[10px] font-mono text-aurora-cyan font-bold tracking-wider uppercase">
              SECURITY RESEARCH PROJECT
            </div>
          </div>
        </div>

        {/* Badge Metadata */}
        <div className="py-4 space-y-2 font-mono text-xs">
          <div className="flex justify-between">
            <span className="text-aurora-muted">Project Domain:</span>
            <span className="font-bold text-aurora-text">API Gateway IDS</span>
          </div>
          <div className="flex justify-between">
            <span className="text-aurora-muted">ML Architecture:</span>
            <span className="font-bold text-aurora-cyan">Hybrid RF + iForest</span>
          </div>
          <div className="flex justify-between">
            <span className="text-aurora-muted">Explainability:</span>
            <span className="font-bold text-aurora-violet">TreeSHAP Values</span>
          </div>
          <div className="flex justify-between">
            <span className="text-aurora-muted">Target Evaluation:</span>
            <span className="font-bold text-status-allow">9.7 / 10 Mini-Project</span>
          </div>
        </div>

        {/* Bottom Barcode / Security Chip Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-1 font-mono text-[9px] text-aurora-muted">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>ACADEMIC REVIEW 2026</span>
          </div>
          <span className="text-[9px] font-mono text-aurora-cyan border border-aurora-cyan/30 px-2 py-0.5 rounded-full">
            LIVE DEMO READY
          </span>
        </div>
      </motion.div>
    </div>
  );
};
