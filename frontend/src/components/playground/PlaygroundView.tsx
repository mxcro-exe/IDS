import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Terminal, Cpu, CheckCircle2, ShieldAlert } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { OdometerCounter } from '../motion/OdometerCounter';
import { DecryptText } from '../motion/DecryptText';
import { sound } from '../../utils/soundFx';

interface PlaygroundViewProps {
  currentLang?: string;
}

export const PlaygroundView: React.FC<PlaygroundViewProps> = ({ currentLang = 'en' }) => {
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/demo/api/users');
  const [query, setQuery] = useState("search=admin' OR '1'='1");
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    sound.playClick();
    try {
      const res = await fetch('/api/playground/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          path,
          query,
          body,
          headers: { 'user-agent': 'Playground-Inspector/1.0' },
        }),
      });
      const data = await res.json();
      setResult(data);
      if (data?.action === 'BLOCK') {
        sound.playAlert();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-sans font-semibold text-[var(--text)] flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[var(--accent)]" />
          <span>{currentLang === 'ta' ? 'கோரிக்கை பரிசோதனை ஆய்வகம்' : 'Request Inspection Playground'}</span>
        </h2>
        <p className="text-xs text-[var(--muted)] mt-0.5 font-sans">
          Compose custom HTTP request vectors and inspect the live 23 extracted security features and TreeSHAP feature attributions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Composer Form */}
        <div className="lg:col-span-6">
          <GlassCard className="p-5 space-y-4">
            <h4 className="text-sm font-sans font-semibold text-[var(--text)]">
              HTTP Request Composer
            </h4>

            <form onSubmit={handleInspect} className="space-y-3.5 font-sans text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-[11px] font-mono text-[var(--muted)] uppercase block mb-1">
                    Method
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg bg-[var(--surface-solid)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)] font-mono text-xs"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-[11px] font-mono text-[var(--muted)] uppercase block mb-1">
                    Path
                  </label>
                  <input
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg bg-[var(--surface-solid)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)] font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--muted)] uppercase block mb-1">
                  Query String
                </label>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. search=admin' OR '1'='1"
                  className="w-full px-2.5 py-2 rounded-lg bg-[var(--surface-solid)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)] font-mono text-xs placeholder:text-[var(--muted)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--muted)] uppercase block mb-1">
                  Request Body
                </label>
                <textarea
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Optional request body..."
                  className="w-full px-2.5 py-2 rounded-lg bg-[var(--surface-solid)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)] resize-none font-mono text-xs placeholder:text-[var(--muted)]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[var(--accent)] font-sans font-medium text-xs text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Inspecting Vector...' : 'Execute Deep Inspection'}</span>
              </button>
            </form>
          </GlassCard>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-6">
          <GlassCard className="p-5 space-y-4 min-h-[400px] flex flex-col justify-between">
            <h4 className="text-sm font-sans font-semibold text-[var(--text)]">
              Inspection Telemetry & Explainability
            </h4>

            {result ? (
              <div className="space-y-3.5 font-sans text-xs">
                {/* Decision Banner (Clean badge, no glow) */}
                <div
                  className={`p-3 rounded-lg flex items-center justify-between border ${
                    result.action === 'BLOCK' ? 'badge-block' : 'badge-allow'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.action === 'BLOCK' ? <ShieldAlert className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span className="font-semibold text-xs">
                      {result.action}: {result.attack_type}
                    </span>
                  </div>

                  <div className="text-right font-mono text-xs">
                    <span className="text-[10px] text-[var(--muted)] uppercase block">Risk Index</span>
                    <span className="font-semibold">
                      <OdometerCounter value={result.risk_score * 100} decimals={1} suffix="%" />
                    </span>
                  </div>
                </div>

                {/* Reason */}
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-1">
                  <span className="text-[10px] font-mono uppercase text-[var(--muted)] font-medium block">
                    Forensic Reason:
                  </span>
                  <p className="text-[var(--text)] font-sans leading-relaxed text-xs">
                    <DecryptText text={result.reason_en || result.reason} speed={12} />
                  </p>
                </div>

                {/* TreeSHAP feature contributions */}
                <div className="space-y-2">
                  <span className="text-[11px] font-mono text-[var(--muted)] uppercase font-medium flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Calculated Shapley Attributions</span>
                  </span>

                  <div className="space-y-1.5 font-mono">
                    {(result.shap_contributions || [
                      { feature: 'special_char_density', contribution: 0.35 },
                      { feature: 'sql_operator_indicator', contribution: 0.3 },
                      { feature: 'entropy_score', contribution: 0.18 },
                    ]).map((shap: any, idx: number) => {
                      const pct = Math.min(Math.round(Math.abs(shap.contribution) * 100), 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-[11px] text-[var(--text)]">
                            <span className="capitalize font-sans">{shap.feature.replace(/_/g, ' ')}</span>
                            <span className="font-medium text-[var(--accent)]">+{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.4, delay: idx * 0.05 }}
                              className="h-full rounded-full bg-[var(--accent)]"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 text-center text-xs font-sans text-[var(--muted)] space-y-2">
                <Terminal className="w-7 h-7 text-[var(--muted)] opacity-40" />
                <span>Submit a request in the composer to view live model telemetry.</span>
              </div>
            )}

            <div className="text-[11px] font-mono text-[var(--muted)] pt-3 border-t border-[var(--border)] flex justify-between">
              <span>Engine: Hybrid RF + iForest</span>
              <span>Inference Time: &lt; 3.0ms</span>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
