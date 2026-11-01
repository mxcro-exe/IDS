import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  onScanline?: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ onScanline }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aegis_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  const [ringActive, setRingActive] = useState<{ active: boolean; x: number; y: number }>({
    active: false,
    x: 0,
    y: 0,
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Sync class on root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('aegis_theme', theme);
  }, [theme]);

  const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';

    // Button coordinates for origin
    const rect = buttonRef.current?.getBoundingClientRect() || {
      left: e.clientX,
      top: e.clientY,
      width: 36,
      height: 36,
    };
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    // Thin 1px accent reveal edge at 30% opacity (no big glow)
    setRingActive({ active: true, x, y });
    setTimeout(() => setRingActive({ active: false, x, y }), 750);

    // Subtle scanline and small neutral toast
    if (onScanline) onScanline();
    setToastMessage(nextTheme === 'dark' ? 'Dark theme on' : 'Light theme on');
    setTimeout(() => setToastMessage(null), 2000);

    // View Transition API support check
    if (!(document as any).startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = (document as any).startViewTransition(() => {
      setTheme(nextTheme);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        [
          { clipPath: `circle(0px at ${x}px ${y}px)` },
          { clipPath: `circle(${endRadius}px at ${x}px ${y}px)` },
        ],
        {
          duration: 700,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });
  };

  const isDark = theme === 'dark';

  return (
    <>
      {/* Theme Toggle Button (Neutral card, clean, no glow) */}
      <motion.button
        ref={buttonRef}
        onClick={toggleTheme}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        aria-label="Toggle Theme"
        title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ rotate: -45, scale: 0.8, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 45, scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Moon className="w-4 h-4 text-[var(--accent)]" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ rotate: 45, scale: 0.8, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -45, scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Sun className="w-4 h-4 text-[var(--accent)]" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Thin 1px Accent Reveal Ring (30% opacity, no big glow) */}
      <AnimatePresence>
        {ringActive.active && (
          <motion.div
            initial={{
              width: 0,
              height: 0,
              x: ringActive.x,
              y: ringActive.y,
              opacity: 0.3,
            }}
            animate={{
              width: '240vmax',
              height: '240vmax',
              x: ringActive.x - window.innerWidth * 1.2,
              y: ringActive.y - window.innerHeight * 1.2,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="fixed pointer-events-none rounded-full border border-[var(--accent)] z-[999998]"
          />
        )}
      </AnimatePresence>

      {/* Small Neutral Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="fixed top-16 right-6 z-[999999] px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-solid)] text-xs font-sans text-[var(--text)] shadow-md"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
