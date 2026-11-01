import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

export const ThemeRevealToggle: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return false; // Light theme by default as per fintech design requirements
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    const nextTheme = !isDark;

    // Check if View Transition API is supported
    if (!(document as any).startViewTransition) {
      setIsDark(nextTheme);
      return;
    }

    const x = e.clientX;
    const y = e.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = (document as any).startViewTransition(() => {
      setIsDark(nextTheme);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 500,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });
  };

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="p-2.5 rounded-full bg-slate-200/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors border border-slate-300/40 dark:border-white/10 shadow-sm"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600" />
      )}
    </motion.button>
  );
};
