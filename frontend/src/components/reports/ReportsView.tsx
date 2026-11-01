import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, CheckCircle, RefreshCw, BarChart3, Database, ShieldCheck, BookOpen } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { sound } from '../../utils/soundFx';

interface ReportsViewProps {
  currentLang?: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ currentLang = 'en' }) => {
  const [retraining, setRetraining] = useState(false);
  const [retrainResult, setRetrainResult] = useState<any | null>(null);

  const handleRetrain = async () => {
    setRetraining(true);
    sound.playClick();
    try {
      const res = await fetch('/api/retrain', { method: 'POST' });
      const data = await res.json();
      setRetrainResult(data);
      sound.playAlert();
    } catch (e) {
      console.error(e);
    } finally {
      setRetraining(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-sans font-semibold text-[var(--text)] flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--accent)]" />
          <span>{currentLang === 'ta' ? 'கல்வி அறிக்கைகள் மற்றும் ப்ராஜெக்ட் வழிகாட்டிகள்' : 'Academic Dossier & Project Verification Guides'}</span>
        </h2>
        <p className="text-xs text-[var(--muted)] mt-0.5 font-sans">
          Download evaluation-ready testing guides, complete architecture blueprints, IEEE conference reports, and CSV audit logs.
        </p>
      </div>

      {/* Featured Primary Evaluation Guides (PDF 1 & PDF 2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PDF 1: Manual Testing Guide */}
        <GlassCard className="p-5 space-y-3.5 flex flex-col justify-between border-2 border-[var(--status-allow)]/40 bg-[var(--surface-solid)] rounded-2xl shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                PDF 1 • Testing Guide
              </span>
            </div>
            <div>
              <h4 className="text-sm font-sans font-semibold text-[var(--text)]">
                AegisGate Manual Testing Guide PDF
              </h4>
              <p className="text-xs font-sans text-[var(--muted)] mt-1.5 leading-relaxed">
                Step-by-step hands-on guide for faculty and project reviewers. Includes exact copy-paste PowerShell commands for SQLi, XSS, rate limiting, decoy honeypots, TreeSHAP verification, and evaluation sign-off checklist.
              </p>
            </div>
          </div>
          <a
            href="/reports/AegisGate_Manual_Testing_Guide.pdf"
            target="_blank"
            rel="noreferrer"
            onClick={() => sound.playClick()}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-sans text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF 1 (Manual Testing Guide)</span>
          </a>
        </GlassCard>

        {/* PDF 2: Complete Project Blueprint */}
        <GlassCard className="p-5 space-y-3.5 flex flex-col justify-between border-2 border-[var(--accent)]/40 bg-[var(--surface-solid)] rounded-2xl shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 font-semibold">
                PDF 2 • Complete Blueprint
              </span>
            </div>
            <div>
              <h4 className="text-sm font-sans font-semibold text-[var(--text)]">
                AegisGate Complete Project Blueprint & Tech Stack PDF
              </h4>
              <p className="text-xs font-sans text-[var(--muted)] mt-1.5 leading-relaxed">
                Everything in the project explained simply: 3 enforcement modes, 10-step inspection flow, all 12 security modules, hybrid ML (Random Forest + Isolation Forest), TreeSHAP, Copilot (3k intents), Telegram bot, and all 7 tabs.
              </p>
            </div>
          </div>
          <a
            href="/reports/AegisGate_Architecture_TechStack_Guide.pdf"
            target="_blank"
            rel="noreferrer"
            onClick={() => sound.playClick()}
            className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:opacity-90 font-sans text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF 2 (Complete Blueprint)</span>
          </a>
        </GlassCard>
      </div>

      {/* Action Download Cards (IEEE Report, CSV Audit, Active Learning) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <GlassCard className="p-5 space-y-3.5 flex flex-col justify-between rounded-xl">
          <div className="space-y-3">
            <div className="w-9 h-9 rounded-lg border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--accent)] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-sans font-semibold text-[var(--text)]">IEEE Academic Report PDF</h4>
              <p className="text-xs font-sans text-[var(--muted)] mt-1 leading-relaxed">
                Print-ready conference paper with project abstract, methodology, feature table, and embedded confusion matrix.
              </p>
            </div>
          </div>
          <a
            href="/api/export/pdf"
            target="_blank"
            rel="noreferrer"
            onClick={() => sound.playClick()}
            className="w-full py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-solid)] font-sans text-xs font-medium text-[var(--text)] flex items-center justify-center gap-2 hover:border-[var(--border-hover)] transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download IEEE PDF</span>
          </a>
        </GlassCard>

        <GlassCard className="p-5 space-y-3.5 flex flex-col justify-between rounded-xl">
          <div className="space-y-3">
            <div className="w-9 h-9 rounded-lg border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--muted)] flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-sans font-semibold text-[var(--text)]">Telemetry CSV Audit Log</h4>
              <p className="text-xs font-sans text-[var(--muted)] mt-1 leading-relaxed">
                Export inspected HTTP requests with timestamps, client IPs, endpoints, risk scores, and MITRE techniques for SIEM ingestion.
              </p>
            </div>
          </div>
          <a
            href="/api/export/csv/requests"
            target="_blank"
            rel="noreferrer"
            onClick={() => sound.playClick()}
            className="w-full py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-solid)] font-sans text-xs font-medium text-[var(--text)] flex items-center justify-center gap-2 hover:border-[var(--border-hover)] transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Audit Log</span>
          </a>
        </GlassCard>

        <GlassCard className="p-5 space-y-3.5 flex flex-col justify-between rounded-xl">
          <div className="space-y-3">
            <div className="w-9 h-9 rounded-lg border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--status-allow)] flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-sans font-semibold text-[var(--text)]">Active Learning Retrain</h4>
              <p className="text-xs font-sans text-[var(--muted)] mt-1 leading-relaxed">
                Incorporate analyst feedback (False Positives / Confirmed Attacks) into the training dataset and re-fit models dynamically.
              </p>
            </div>
          </div>
          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="w-full py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-solid)] font-sans text-xs font-medium text-[var(--text)] flex items-center justify-center gap-2 hover:border-[var(--border-hover)] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${retraining ? 'animate-spin' : ''}`} />
            <span>{retraining ? 'Retraining...' : 'Trigger Model Retrain'}</span>
          </button>
        </GlassCard>
      </div>

      {/* Retrain Alert Notification */}
      {retrainResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-lg badge-allow font-sans text-xs flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{retrainResult.message} &bull; Accuracy: {(retrainResult.metrics?.accuracy * 100).toFixed(1)}% &bull; Macro F1: {(retrainResult.metrics?.macro_f1 * 100).toFixed(1)}%</span>
          </div>
          <span className="text-[11px] font-mono font-medium">Model v1.1 Active</span>
        </motion.div>
      )}

      {/* Real Generated Evaluation Figures */}
      <div className="space-y-3">
        <h3 className="text-sm font-sans font-semibold text-[var(--text)] flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
          <span>Empirical Evaluation Visualizations (Held-Out Test Split)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Confusion Matrix */}
          <GlassCard className="p-5 space-y-2.5 rounded-xl">
            <h4 className="text-xs font-sans font-medium text-[var(--text)]">
              Multiclass Confusion Matrix
            </h4>
            <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-black/40">
              <img
                src="/reports/confusion_matrix.png"
                alt="Confusion Matrix"
                className="w-full h-auto object-contain"
              />
            </div>
            <p className="text-[11px] font-sans text-[var(--muted)]">
              Evaluated on 860 independent unseen test samples across 7 attack classes + benign traffic.
            </p>
          </GlassCard>

          {/* Feature Importance */}
          <GlassCard className="p-5 space-y-2.5 rounded-xl">
            <h4 className="text-xs font-sans font-medium text-[var(--text)]">
              Top 15 Feature Importances (Gini Impurity)
            </h4>
            <div className="rounded-lg overflow-hidden border border-[var(--border)] bg-black/40">
              <img
                src="/reports/feature_importance.png"
                alt="Feature Importance"
                className="w-full h-auto object-contain"
              />
            </div>
            <p className="text-[11px] font-sans text-[var(--muted)]">
              Mean impurity reduction demonstrating predictive weights for entropy and script tokens.
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
