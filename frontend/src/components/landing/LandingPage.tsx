import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  ArrowRight,
  Zap,
  Activity,
  Cpu,
  Lock,
  Layers,
  FileText,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { OdometerCounter } from '../motion/OdometerCounter';
import { CurvedCardGallery } from './CurvedCardGallery';
import { HighlightsStrip } from './HighlightsStrip';
import { LanyardBadge } from '../motion/LanyardBadge';
import { GlassCard } from '../ui/GlassCard';

interface LandingPageProps {
  onEnterDashboard: () => void;
  onEnterSimulator: () => void;
  currentLang?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterDashboard,
  onEnterSimulator,
  currentLang = 'en',
}) => {
  const headlineWords = ['Protect', 'every', 'API', 'request.', 'Explained.'];

  const gridTiles = [
    { title: 'Feature Extraction', desc: '23 lexical, entropy, and structural tokens normalized through a 6-stage de-obfuscation pipeline.', icon: <Code2Icon /> },
    { title: 'Random Forest', desc: '100 supervised decision trees evaluating OWASP signatures and evasion patterns in sub-millisecond time.', icon: <Cpu className="w-5 h-5 text-[var(--accent)]" /> },
    { title: 'Isolation Forest', desc: 'Unsupervised tree partitioning detecting zero-day anomalies and unexpected payload distributions.', icon: <Layers className="w-5 h-5 text-[var(--accent)]" /> },
    { title: 'Behavioral Analysis', desc: 'Exponential temporal decay tracking endpoint diversity, request cadence, and failed authentication bursts.', icon: <Activity className="w-5 h-5 text-[var(--status-warn)]" /> },
    { title: 'Sliding-Window Rate Limiter', desc: 'Deque-based in-memory limiter enforcing strict rate caps to prevent Denial of Service.', icon: <Lock className="w-5 h-5 text-[var(--status-warn)]" /> },
    { title: 'Dynamic Risk Score', desc: 'Weighted fusion formula: w1*ML + w2*Behavior + w3*Rules with threat escalation overrides.', icon: <Sparkles className="w-5 h-5 text-[var(--accent)]" /> },
    { title: 'SOC Console Telemetry', desc: 'Real-time WebSocket telemetry, perimeter radar, and automated IEEE PDF audit reporting.', icon: <ShieldAlert className="w-5 h-5 text-[var(--status-block)]" /> },
  ];

  return (
    <div className="relative overflow-hidden space-y-20 pb-20">
      
      {/* ====================================================================
           1. HERO SECTION
           ==================================================================== */}
      <section className="relative pt-20 sm:pt-28 pb-10 px-6 max-w-5xl mx-auto text-center space-y-7 z-10">
        
        {/* Academic / Enterprise Tag */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-solid)] text-xs font-mono text-[var(--muted)]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-allow)]" />
          <span>ENTERPRISE SPECIFICATION &bull; AI-POWERED API GATEWAY IDS</span>
        </motion.div>

        {/* Word-by-Word Headline (Clean, no rainbow gradient) */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-sans font-bold tracking-tight text-[var(--text)] max-w-4xl mx-auto leading-[1.1]">
          {headlineWords.map((word, idx) => (
            <motion.span
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: idx * 0.08,
                ease: 'easeOut',
              }}
              className={`inline-block mr-3 sm:mr-4 ${
                word === 'Explained.' ? 'text-[var(--accent)]' : ''
              }`}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="text-sm sm:text-base font-sans text-[var(--muted)] max-w-2xl mx-auto leading-relaxed"
        >
          A high-performance reverse proxy combining Hybrid Random Forest, Isolation Forest anomaly scoring, and TreeSHAP game-theoretic explainability.
        </motion.p>

        {/* CTA Buttons (Clean solid accent + secondary, no glow) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3"
        >
          <button
            onClick={onEnterDashboard}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[var(--accent)] font-sans text-xs font-medium text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 group"
          >
            <span>Open SOC Dashboard</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={onEnterSimulator}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-solid)] font-sans text-xs font-medium text-[var(--text)] hover:border-[var(--border-hover)] transition-colors flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 text-[var(--accent)]" />
            <span>Try Attack Simulator</span>
          </button>
        </motion.div>

        {/* Floating Neutral Stats Pill (Allowed 70%, Warned 20%, Blocked 10%) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.75 }}
          className="pt-6"
        >
          <div className="inline-flex flex-wrap items-center justify-center gap-6 sm:gap-12 px-8 py-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] font-mono text-xs shadow-sm">
            <div className="text-left">
              <div className="text-xl sm:text-2xl font-mono font-semibold text-[var(--text)]">
                <OdometerCounter value={12480} />
              </div>
              <div className="text-[11px] text-[var(--muted)] font-sans">Total Requests</div>
            </div>

            <div className="w-px h-7 bg-[var(--border)] hidden sm:block" />

            <div className="text-left">
              <div className="text-xl sm:text-2xl font-mono font-semibold text-[var(--status-allow)]">
                <OdometerCounter value={99.4} decimals={1} suffix="%" />
              </div>
              <div className="text-[11px] text-[var(--muted)] font-sans">Mitigation Rate</div>
            </div>

            <div className="w-px h-7 bg-[var(--border)] hidden sm:block" />

            <div className="text-left">
              <div className="text-xl sm:text-2xl font-mono font-semibold text-[var(--accent)]">
                <OdometerCounter value={2.4} decimals={1} suffix=" ms" />
              </div>
              <div className="text-[11px] text-[var(--muted)] font-sans">Average Latency</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ====================================================================
           2. 3D CURVED ATTACK GALLERY
           ==================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <CurvedCardGallery />
      </section>

      {/* ====================================================================
           3. DEFENSE ARCHITECTURE GRID
           ==================================================================== */}
      <section className="max-w-6xl mx-auto px-6 space-y-8">
        <div className="text-center space-y-1.5">
          <h3 className="text-xl sm:text-2xl font-sans font-semibold text-[var(--text)]">
            Multi-Layer Defense Architecture
          </h3>
          <p className="text-xs sm:text-sm font-sans text-[var(--muted)] max-w-xl mx-auto">
            Every incoming HTTP request undergoes deep algorithmic inspection across 7 distinct pipeline stages before reaching microservices.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gridTiles.map((tile, idx) => (
            <motion.div
              key={tile.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: idx * 0.05 }}
            >
              <GlassCard className="p-5 space-y-2.5 h-full">
                <div className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-solid)] flex items-center justify-center">
                  {tile.icon}
                </div>
                <h4 className="text-sm font-sans font-semibold text-[var(--text)]">
                  {tile.title}
                </h4>
                <p className="text-xs font-sans text-[var(--muted)] leading-relaxed">
                  {tile.desc}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ====================================================================
           4. HORIZONTAL HIGHLIGHTS STRIP
           ==================================================================== */}
      <section className="max-w-6xl mx-auto px-6">
        <HighlightsStrip />
      </section>

      {/* ====================================================================
           5. CONNECT & REVIEW
           ==================================================================== */}
      <section className="max-w-6xl mx-auto px-6 pt-10 border-t border-[var(--border)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left: Physics Lanyard Badge */}
          <div className="lg:col-span-5 flex justify-center">
            <LanyardBadge />
          </div>

          {/* Right: Quick Review Links */}
          <div className="lg:col-span-7 space-y-5">
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--accent)] font-medium">
                Project Dossier & Verification
              </span>
              <h3 className="text-xl sm:text-2xl font-sans font-semibold text-[var(--text)]">
                Evaluation Ready
              </h3>
              <p className="text-xs sm:text-sm font-sans text-[var(--muted)] leading-relaxed">
                Complete research implementation designed for viva voce and evaluator demonstration. Export real IEEE-formatted documentation or view live audit telemetry.
              </p>
            </div>

            <div className="space-y-2.5 font-sans">
              <a
                href="/api/export/pdf"
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--accent)] flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[var(--text)]">
                      Download IEEE Academic PDF Report
                    </div>
                    <div className="text-[11px] text-[var(--muted)]">
                      Print-ready review dossier with confusion matrix and latency percentiles
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--text)] group-hover:translate-x-1 transition-all" />
              </a>

              <a
                href="/api/export/csv/requests"
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--muted)] flex items-center justify-center">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[var(--text)]">
                      Export Audit Telemetry Log (CSV)
                    </div>
                    <div className="text-[11px] text-[var(--muted)]">
                      Chronological request events and security decision scores
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--text)] group-hover:translate-x-1 transition-all" />
              </a>

              <button
                onClick={onEnterDashboard}
                className="w-full group flex items-center justify-between p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--status-allow)] flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[var(--text)]">
                      Launch SOC Security Dashboard
                    </div>
                    <div className="text-[11px] text-[var(--muted)]">
                      Live WebSocket telemetry stream and threshold management controls
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--text)] group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-[var(--border)] text-center text-xs text-[var(--muted)] font-mono">
        AegisGate IDS &bull; Slate Pro Edition &bull; Python FastAPI + Random Forest + TreeSHAP
      </footer>
    </div>
  );
};

function Code2Icon() {
  return (
    <svg className="w-5 h-5 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
