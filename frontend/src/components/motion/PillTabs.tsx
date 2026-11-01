import React from 'react';
import { motion } from 'framer-motion';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
}

interface PillTabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  layoutId?: string;
  className?: string;
}

export const PillTabs: React.FC<PillTabsProps> = ({
  tabs,
  activeId,
  onChange,
  layoutId = 'slatepro-pill-tabs',
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center p-1 rounded-full border border-[var(--border)] bg-[var(--surface-solid)]/70 backdrop-blur-md ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative px-3.5 py-1.5 rounded-full text-xs font-sans font-medium transition-colors duration-150 flex items-center gap-1.5 select-none focus:outline-none ${
              isActive
                ? 'text-white'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {/* Sliding Solid Accent Pill */}
            {isActive && (
              <motion.div
                layoutId={layoutId}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 26,
                }}
                className="absolute inset-0 rounded-full bg-[var(--accent)] shadow-sm"
              />
            )}

            {/* Icon & Label */}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.icon && <span className="w-3.5 h-3.5">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium ${
                  isActive ? 'bg-white/20 text-white' : 'bg-black/40 border border-white/10 text-slate-200'
                }`}>
                  {tab.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};
