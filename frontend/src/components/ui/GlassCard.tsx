import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  isTilt?: boolean;
  spotlight?: boolean;
  glow?: 'allow' | 'warn' | 'block' | 'aurora' | 'default' | 'none';
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glow = 'none',
  onClick,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePos(null);
  };

  // Cursor-following spotlight tinted at 8-10% opacity, only on hover
  const spotlightColor =
    glow === 'allow'
      ? 'rgba(63, 182, 139, 0.08)'
      : glow === 'warn'
      ? 'rgba(217, 164, 65, 0.08)'
      : glow === 'block'
      ? 'rgba(229, 101, 111, 0.08)'
      : 'rgba(91, 141, 239, 0.09)';

  const statusHoverBorderClass =
    glow === 'allow'
      ? 'hover:border-emerald-500/35'
      : glow === 'warn'
      ? 'hover:border-amber-500/35'
      : glow === 'block'
      ? 'hover:border-rose-500/35'
      : 'hover:border-[var(--border-hover)]';

  return (
    <motion.div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`glass-card relative overflow-hidden ${statusHoverBorderClass} ${className}`}
      {...(props as any)}
    >
      {/* Dynamic Cursor-Following Interaction Spotlight (8-10% opacity, ~220px) */}
      {isHovered && mousePos && (
        <div
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-200"
          style={{
            background: `radial-gradient(220px circle at ${mousePos.x}px ${mousePos.y}px, ${spotlightColor}, transparent 80%)`,
          }}
        />
      )}

      {/* Main Card Content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </motion.div>
  );
};
