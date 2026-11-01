import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = 'h-4 w-full' }) => {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-slate-200/80 dark:bg-slate-800/80 ${className}`}
    >
      <div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent animate-shimmer"
      />
    </div>
  );
};
