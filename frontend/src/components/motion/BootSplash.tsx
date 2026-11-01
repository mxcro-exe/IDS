import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DecryptText } from './DecryptText';

interface BootSplashProps {
  onComplete: () => void;
}

export const BootSplash: React.FC<BootSplashProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<'drawing' | 'decrypt' | 'done'>('drawing');

  useEffect(() => {
    const t1 = setTimeout(() => setStage('decrypt'), 500);
    const t2 = setTimeout(() => {
      setStage('done');
      onComplete();
    }, 1250);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {stage !== 'done' && (
        <motion.div
          key="bootsplash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999999] flex flex-col items-center justify-center bg-[#0B0F17] text-[#E6EAF2]"
        >
          {/* SVG Shield Stroke Drawing (Precise line draw, NO glow) */}
          <div className="relative w-20 h-20 mb-5 flex items-center justify-center">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer Shield Path with stroke draw */}
              <motion.path
                d="M50 12 L82 25 V52 C82 72 50 88 50 88 C50 88 18 72 18 52 V25 Z"
                stroke="#5B8DEF"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.7, ease: 'easeInOut' }}
              />

              {/* Inner Check Core */}
              <motion.path
                d="M40 50 L47 57 L62 42"
                stroke="#5B8DEF"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.3, ease: 'easeOut' }}
              />
            </svg>
          </div>

          {/* Status Message */}
          <div className="text-center space-y-1 font-sans">
            <div className="text-sm font-semibold tracking-tight text-white flex items-center gap-2 justify-center">
              <span>AegisGate</span>
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded border border-white/10 bg-white/5 text-[#94A0B8]">
                IDS
              </span>
            </div>
            <div className="text-xs font-mono text-[#94A0B8]">
              <DecryptText text="Initializing Gateway Security Shield..." speed={18} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
