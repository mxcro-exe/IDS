import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  ThumbsDown,
  X,
  Cpu,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { DecryptText } from '../motion/DecryptText';
import { sound } from '../../utils/soundFx';

import { AlertDetailModal } from './AlertDetailModal';

export interface AlertItem {
  id: number;
  timestamp: number;
  client_ip: string;
  attack_type: string;
  risk_score: number;
  confidence: number;
  mitre_id: string;
  mitre_tactic?: string;
  reason: string;
  reason_ta?: string;
  raw_payload?: string;
  decoded_payload?: string;
  shap_contributions?: Array<{
    feature: string;
    contribution: number;
    value?: number;
  }>;
}

interface AlertsListProps {
  alerts: AlertItem[];
  currentLang?: string;
  onFeedback?: (alertId: number, verdict: 'false_positive' | 'confirmed_attack') => void;
}

export const AlertsList: React.FC<AlertsListProps> = ({
  alerts = [],
  currentLang = 'en',
  onFeedback,
}) => {
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<number | null>(null);

  const handleSelect = (alert: AlertItem) => {
    setSelectedAlert(alert);
    sound.playClick();
  };

  const submitVerdict = (id: number, verdict: 'false_positive' | 'confirmed_attack') => {
    if (onFeedback) onFeedback(id, verdict);
    setFeedbackSuccess(id);
    setTimeout(() => {
      setFeedbackSuccess(null);
      setSelectedAlert(null);
    }, 1200);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-sans font-semibold text-[var(--text)] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[var(--status-block)]" />
            <span>{currentLang === 'ta' ? 'நிகழ்நேர அச்சுறுத்தல் எச்சரிக்கைகள்' : 'Security Incident Alerts'}</span>
          </h3>
          <p className="text-xs text-[var(--muted)] font-sans">
            Real-time proxy audit telemetry &bull; Select any row for forensic TreeSHAP breakdown
          </p>
        </div>

        <div className="text-xs font-mono px-2.5 py-1 rounded-md border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--muted)]">
          {alerts.length} Incidents
        </div>
      </div>

      {/* Alerts Grid / Rows */}
      <div className="space-y-2">
        <AnimatePresence>
          {alerts.length === 0 ? (
            <GlassCard className="p-8 text-center text-xs font-sans text-[var(--muted)]">
              No hostile intrusion incidents detected. System operating in optimal state.
            </GlassCard>
          ) : (
            alerts.map((alert) => {
              const isBlock = alert.risk_score >= 0.7;
              const formattedTime = new Date(alert.timestamp * 1000).toLocaleTimeString();

              return (
                <motion.div
                  key={alert.id}
                  layoutId={`alert-card-${alert.id}`}
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleSelect(alert)}
                  className={`cursor-pointer p-3.5 sm:p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)] flex items-center justify-between gap-4 transition-all duration-150 ${
                    isBlock ? 'border-l-2 border-l-[var(--status-block)]' : 'border-l-2 border-l-[var(--status-warn)]'
                  }`}
                >
                  {/* Left Info */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isBlock ? 'badge-block' : 'badge-warn'
                      }`}
                    >
                      {isBlock ? <ShieldAlert className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-sans font-medium text-[var(--text)]">
                          {alert.attack_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] font-mono px-1.5 py-0.2 rounded border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--muted)]">
                          {alert.mitre_id}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--muted)] font-mono flex items-center gap-2 mt-0.5">
                        <span className="text-[var(--text)]">{alert.client_ip}</span>
                        <span>&bull;</span>
                        <span>{formattedTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Score & Status Pill */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-mono font-medium text-[var(--text)]">
                        Risk: <span className={isBlock ? 'text-[var(--status-block)]' : 'text-[var(--status-warn)]'}>{(alert.risk_score * 100).toFixed(0)}%</span>
                      </div>
                      <div className="text-[11px] font-mono text-[var(--muted)]">
                        Conf: {(alert.confidence * 100).toFixed(0)}%
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium ${
                        isBlock ? 'badge-block' : 'badge-warn'
                      }`}
                    >
                      {isBlock ? 'BLOCK' : 'WARN'}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Plain-Language Explainer & One-Click Fix-It Modal */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          lang={currentLang as any}
          onActionSuccess={(msg) => {
            if (onFeedback) onFeedback(selectedAlert.id, 'confirmed_attack');
          }}
        />
      )}
    </div>
  );
};
