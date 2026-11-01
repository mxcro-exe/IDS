import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X, ArrowRight, Terminal, Activity } from 'lucide-react';

export interface ToastData {
  id: string;
  attack_type: string;
  client_ip: string;
  risk_score: number;
  mitre_id?: string;
  reason?: string;
}

interface AlertToastProps {
  toast: ToastData | null;
  onClose: () => void;
  onViewAlert: () => void;
}

export const AlertToast: React.FC<AlertToastProps> = ({
  toast,
  onClose,
  onViewAlert,
}) => {
  const [progress, setProgress] = useState(100);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!toast) return;
    setProgress(100);

    const startTime = Date.now();
    const duration = 4800;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (elapsed >= duration) {
        clearInterval(interval);
        onClose();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [toast, onClose]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed top-6 right-6 z-[99999999] pointer-events-none flex flex-col items-end">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="pointer-events-auto w-[360px] sm:w-[390px] rounded-xl border border-[var(--border)] border-l-2 border-l-[var(--status-block)] bg-[var(--surface-solid)] p-4 shadow-xl overflow-hidden font-sans"
          >
            {/* Top Banner */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg badge-block flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono font-medium text-[var(--status-block)] uppercase">
                      THREAT BLOCKED
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]">
                      {toast.mitre_id || 'T1190'}
                    </span>
                  </div>
                  <h4 className="text-xs font-sans font-semibold text-[var(--text)] leading-tight mt-0.5">
                    {toast.attack_type.replace(/_/g, ' ')}
                  </h4>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1 rounded-md border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Incident Metrics */}
            <div className="my-2.5 space-y-1 text-xs bg-[var(--surface)] p-2.5 rounded-lg border border-[var(--border)] font-mono">
              <div className="flex justify-between items-center text-[var(--text)]">
                <span className="text-[var(--muted)] flex items-center gap-1.5 text-[11px]">
                  <Terminal className="w-3 h-3 text-[var(--accent)]" />
                  <span>Attacker IP:</span>
                </span>
                <strong className="text-[var(--text)]">{toast.client_ip}</strong>
              </div>
              <div className="flex justify-between items-center text-[var(--text)]">
                <span className="text-[var(--muted)] flex items-center gap-1.5 text-[11px]">
                  <Activity className="w-3 h-3 text-[var(--status-block)]" />
                  <span>Risk Score:</span>
                </span>
                <strong className="text-[var(--status-block)]">{(toast.risk_score * 100).toFixed(0)}% (Critical)</strong>
              </div>
              {toast.reason && (
                <p className="text-[11px] text-[var(--muted)] line-clamp-2 pt-1 border-t border-[var(--border)] font-sans">
                  {toast.reason}
                </p>
              )}
            </div>

            {/* Action Row */}
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[10px] font-mono text-[var(--muted)]">Dismissing in {Math.ceil(progress / 20)}s...</span>
              <button
                onClick={() => {
                  onViewAlert();
                  onClose();
                }}
                className="px-3 py-1 rounded-md text-xs font-sans font-medium bg-[var(--accent)] text-white hover:opacity-90 flex items-center gap-1.5 transition-opacity"
              >
                <span>Inspect SHAP</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Countdown Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--border)] overflow-hidden">
              <div
                className="h-full bg-[var(--status-block)] transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
};
