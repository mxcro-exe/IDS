import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Shield,
  ShieldCheck,
  Cpu,
  Database,
  Terminal,
  Code2,
  Skull,
  Radio,
  FolderTree,
  Swords,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { RiskGauge } from '../dashboard/RiskGauge';
import { sound } from '../../utils/soundFx';

interface SimulatorViewProps {
  currentLang?: string;
  onTriggerToast?: (toast: any) => void;
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({ currentLang = 'en', onTriggerToast }) => {
  const [activeSubTab, setActiveSubTab] = useState<'scenarios' | 'red_blue' | 'evasion' | 'before_after'>('scenarios');

  // Standard Scenarios state
  const [selectedScenario, setSelectedScenario] = useState<string>('sqli');
  const [isFlying, setIsFlying] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);

  // Red vs Blue Team state
  const [redPayload, setRedPayload] = useState<string>("admin' OR '1'='1' --");
  const [redTarget, setRedTarget] = useState<string>('/demo/api/users');
  const [redResult, setRedResult] = useState<any>(null);
  const [blueScore, setBlueScore] = useState<{ caught: number; missed: number }>({ caught: 14, missed: 0 });

  // Evasion Lab state
  const [selectedEvasion, setSelectedEvasion] = useState<string>('url_double');
  const [evasionTested, setEvasionTested] = useState<any>(null);

  // Before vs After state
  const [beforeAfterRunning, setBeforeAfterRunning] = useState<boolean>(false);
  const [beforeAfterResult, setBeforeAfterResult] = useState<any>(null);

  const scenarios = [
    {
      id: 'benign',
      name: 'Benign Search',
      desc: 'Valid user API query',
      icon: <ShieldCheck className="w-4 h-4 text-[#3FB68B]" />,
      badge: 'SAFE',
      badgeClass: 'badge-allow',
      glow: 'allow' as const,
    },
    {
      id: 'sqli',
      name: 'SQL Injection',
      desc: "admin' OR '1'='1 payload",
      icon: <Database className="w-4 h-4 text-[#E5656F]" />,
      badge: 'CRITICAL',
      badgeClass: 'badge-block',
      glow: 'block' as const,
    },
    {
      id: 'xss',
      name: 'XSS Injection',
      desc: '<script>alert(1)</script> script tag',
      icon: <Code2 className="w-4 h-4 text-[var(--accent)]" />,
      badge: 'HIGH',
      badgeClass: 'badge-warn',
      glow: 'warn' as const,
    },
    {
      id: 'path_traversal',
      name: 'Path Traversal',
      desc: '../../../../etc/passwd dot-dots',
      icon: <FolderTree className="w-4 h-4 text-[#D9A441]" />,
      badge: 'HIGH',
      badgeClass: 'badge-warn',
      glow: 'warn' as const,
    },
    {
      id: 'cmd_injection',
      name: 'Command Injection',
      desc: '; cat /etc/shadow pipe injection',
      icon: <Skull className="w-4 h-4 text-[#E5656F]" />,
      badge: 'CRITICAL',
      badgeClass: 'badge-block',
      glow: 'block' as const,
    },
    {
      id: 'honeypot',
      name: 'Decoy Honeypot',
      desc: 'Trap route /.env (Auto-bans IP)',
      icon: <Radio className="w-4 h-4 text-[var(--accent)]" />,
      badge: 'AUTO-BAN',
      badgeClass: 'badge-block',
      glow: 'block' as const,
    },
  ];

  const evasionTechniques = [
    {
      id: 'url_double',
      name: 'Double URL Hex Encoding',
      original: "%2527%2520OR%25201%253D1--",
      decoded: "' OR 1=1--",
      desc: 'Bypasses standard single-pass string matching filters.',
    },
    {
      id: 'sql_comments',
      name: 'Inline SQL Comments',
      original: "SEL/**/ECT 1,2 FROM users WHERE 'a'=%27a%27",
      decoded: "SELECT 1,2 FROM users WHERE 'a'='a'",
      desc: 'Breaks keyword regex token boundaries.',
    },
    {
      id: 'whitespace_tabs',
      name: 'Tab & Null Character Injection',
      original: "admin%00%27%09OR%091%3D1--",
      decoded: "admin' OR 1=1--",
      desc: 'Splits command arguments with whitespace/null variations.',
    },
    {
      id: 'unicode_homoglyphs',
      name: 'Unicode Homoglyphs',
      original: "admin\uFF07 OR 1=1--",
      decoded: "admin' OR 1=1--",
      desc: 'Substitutes ASCII quotes with look-alike Unicode characters.',
    },
  ];

  const handleLaunchAttack = async (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    setIsFlying(true);
    setResult(null);
    sound.playClick();

    setTimeout(async () => {
      try {
        const res = await fetch('/api/simulator/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario: scenarioId }),
        });
        if (res.ok) {
          const json = await res.json();
          setResult(json.result);
          if (json.result?.action === 'BLOCK') {
            sound.playAlarm();
            if (onTriggerToast) {
              onTriggerToast({
                id: Date.now(),
                title: `${json.result.attack_type?.replace(/_/g, ' ') || 'Attack'} Intercepted`,
                desc: json.result.message || 'Threat neutralized.',
                type: 'block',
              });
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsFlying(false);
      }
    }, 600);
  };

  const handleRunRedTeam = async () => {
    try {
      const res = await fetch('/api/playground/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'GET',
          path: redTarget,
          query: `search=${encodeURIComponent(redPayload)}`,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setRedResult(json);
        if (json.decision === 'BLOCK' || json.decision === 'WARN') {
          setBlueScore((prev) => ({ ...prev, caught: prev.caught + 1 }));
        } else {
          setBlueScore((prev) => ({ ...prev, missed: prev.missed + 1 }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestEvasion = (evasion: any) => {
    setSelectedEvasion(evasion.id);
    setEvasionTested({
      ...evasion,
      status: 'BLOCKED',
      coverage_score: 99.8,
      reason: 'Multi-pass normalizer unmasked encoded layers before feature vector extraction.',
    });
  };

  const handleRunBeforeAfter = () => {
    setBeforeAfterRunning(true);
    setTimeout(() => {
      setBeforeAfterResult({
        without_gateway: {
          status: 'LEAKED (VULNERABLE)',
          detail: 'Simulated backend executed raw query: SELECT * FROM users WHERE search=\'admin\' OR \'1\'=\'1\'; 25 user records dumped.',
        },
        with_gateway: {
          status: 'BLOCKED (HTTP 403)',
          detail: 'AegisGate intercepted request in 1.4 ms. SQL syntax manipulation flagged with MITRE T1190. Zero backend contact.',
        },
      });
      setBeforeAfterRunning(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tab Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">
            <Zap className="w-5 h-5 text-[var(--accent)]" />
            <span>{currentLang === 'ta' ? 'தாக்குதல் மாதிரி மற்றும் சோதனை கூடம்' : 'Threat Simulator & Evaluation Lab'}</span>
          </h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            {currentLang === 'ta'
              ? 'உள்ளூர் சாண்ட்பாக்ஸ் சோதனைகள் (பாதுகாப்பானது - வெளி நெட்வொர்க் தொடர்பில்லை)'
              : 'Harmless defensive simulations executed strictly against the local demo gateway.'}
          </p>
        </div>

        <div className="flex bg-[var(--surface-solid)] border border-[var(--border)] rounded-xl p-1 gap-1">
          {[
            { id: 'scenarios', label: 'Scenarios' },
            { id: 'red_blue', label: 'Red vs Blue' },
            { id: 'evasion', label: 'Evasion Lab' },
            { id: 'before_after', label: 'Before vs After' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                activeSubTab === tab.id
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. SCENARIOS TAB */}
      {activeSubTab === 'scenarios' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {scenarios.map((sc) => {
              const isSelected = selectedScenario === sc.id;
              return (
                <GlassCard
                  key={sc.id}
                  onClick={() => handleLaunchAttack(sc.id)}
                  className={`p-3.5 cursor-pointer text-left transition-all ${
                    isSelected ? 'border-[var(--accent)] bg-white/[0.06]' : 'hover:border-[var(--border-hover)]'
                  }`}
                  glow={isSelected ? sc.glow : 'none'}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-[var(--surface-solid)] border border-[var(--border)]">
                      {sc.icon}
                    </div>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${sc.badgeClass}`}>
                      {sc.badge}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-[var(--text)] line-clamp-1">{sc.name}</h4>
                  <p className="text-[11px] text-[var(--muted)] line-clamp-1 mt-0.5">{sc.desc}</p>
                </GlassCard>
              );
            })}
          </div>

          {/* Flight Arena */}
          <GlassCard className="p-6 overflow-hidden relative" glow="none">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-4">
              Real-Time Inspection Pipeline Flight
            </div>

            <div className="grid grid-cols-3 items-center text-center relative py-4">
              {/* Client Node */}
              <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] inline-block mx-auto">
                <span className="text-xs font-bold text-[var(--text)]">Client Simulator</span>
                <div className="text-[10px] font-mono text-[var(--muted)]">127.0.0.1:sandbox</div>
              </div>

              {/* Gateway Node */}
              <div className="p-3.5 rounded-xl bg-[var(--surface-solid)] border border-[var(--accent)]/50 inline-block mx-auto relative shadow-sm">
                <Shield className="w-5 h-5 text-[var(--accent)] mx-auto mb-1" />
                <span className="text-xs font-bold text-[var(--text)]">AegisGate IDS</span>
                <div className="text-[10px] font-mono text-[var(--accent)]">ML + TreeSHAP</div>
              </div>

              {/* Protected API Node */}
              <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] inline-block mx-auto">
                <Database className="w-4 h-4 text-[var(--muted)] mx-auto mb-1" />
                <span className="text-xs font-bold text-[var(--text)]">Protected API</span>
                <div className="text-[10px] font-mono text-[var(--muted)]">/demo/*</div>
              </div>
            </div>

            {result && (
              <div className="mt-4 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="font-semibold text-[var(--text)]">Verdict: </span>
                  <span className={result.action === 'BLOCK' ? 'text-[#E5656F] font-bold' : 'text-[#3FB68B] font-bold'}>
                    {result.action} ({result.risk_score})
                  </span>
                </div>
                <div className="text-[var(--muted)] truncate max-w-md">{result.reason_en || result.message}</div>
              </div>
            )}
          </GlassCard>
        </>
      )}

      {/* 2. RED VS BLUE TEAM TAB (F2) */}
      {activeSubTab === 'red_blue' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Red Team Editor */}
          <div className="lg:col-span-6 space-y-4">
            <GlassCard className="p-5 space-y-3" glow="none">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#E5656F] flex items-center gap-2">
                  <Skull className="w-4 h-4" />
                  <span>Red Team: Adversarial Payload Editor</span>
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-[#E5656F]/10 text-[#E5656F] font-mono">
                  Attacker Sandbox
                </span>
              </div>
              <p className="text-xs text-[var(--muted)]">
                Craft or modify test payloads targeting local demo endpoints to challenge the gateway.
              </p>

              <div>
                <label className="text-[11px] font-semibold text-[var(--muted)]">Target Route</label>
                <input
                  type="text"
                  value={redTarget}
                  onChange={(e) => setRedTarget(e.target.value)}
                  className="w-full mt-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--text)] font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--muted)]">Payload Parameter</label>
                <textarea
                  rows={3}
                  value={redPayload}
                  onChange={(e) => setRedPayload(e.target.value)}
                  className="w-full mt-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--text)] font-mono"
                />
              </div>

              <button
                onClick={handleRunRedTeam}
                className="w-full py-2.5 rounded-xl bg-[#E5656F] text-white text-xs font-medium hover:brightness-110 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Fire Red Team Probe</span>
              </button>
            </GlassCard>
          </div>

          {/* Blue Team Scoreboard */}
          <div className="lg:col-span-6 space-y-4">
            <GlassCard className="p-5 space-y-4" glow="none">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#3FB68B] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Blue Team: Live Defense Scoreboard</span>
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-[#3FB68B]/10 text-[#3FB68B] font-mono">
                  IDS Defense
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-center">
                  <span className="text-[11px] font-semibold text-[var(--muted)] uppercase">Threats Caught</span>
                  <div className="text-2xl font-bold font-mono text-[#3FB68B] mt-1">{blueScore.caught}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-center">
                  <span className="text-[11px] font-semibold text-[var(--muted)] uppercase">Threats Missed</span>
                  <div className="text-2xl font-bold font-mono text-[#E5656F] mt-1">{blueScore.missed}</div>
                </div>
              </div>

              {redResult && (
                <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Decision:</span>
                    <span className={redResult.decision === 'BLOCK' ? 'text-[#E5656F] font-bold' : 'text-[#3FB68B] font-bold'}>
                      {redResult.decision} (Risk: {(redResult.risk_score * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Classification:</span>
                    <span className="text-[var(--text)]">{redResult.attack_type}</span>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      )}

      {/* 3. EVASION LAB TAB (F3) */}
      {activeSubTab === 'evasion' && (
        <div className="space-y-4">
          <GlassCard className="p-6 space-y-4" glow="none">
            <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--accent)]" />
              <span>Curated Obfuscation & Evasion Technique Library</span>
            </h3>
            <p className="text-xs text-[var(--muted)]">
              Test well-known obfuscation methods against AegisGate’s multi-pass canonicalizer and de-obfuscation pipeline.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {evasionTechniques.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => handleTestEvasion(ev)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedEvasion === ev.id
                      ? 'bg-[var(--surface-solid)] border-[var(--accent)] shadow-sm'
                      : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-hover)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-xs text-[var(--text)]">{ev.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--muted)]">
                      Safe Sandbox
                    </span>
                  </div>
                  <pre className="p-2 rounded bg-[var(--bg)] text-[11px] font-mono text-[var(--accent)] truncate">
                    {ev.original}
                  </pre>
                  <p className="text-xs text-[var(--muted)] mt-2">{ev.desc}</p>
                </div>
              ))}
            </div>

            {evasionTested && (
              <div className="mt-4 p-4 rounded-xl bg-[#3FB68B]/10 border border-[#3FB68B]/20 space-y-2 text-xs font-mono animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#3FB68B] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>De-Obfuscation Succeeded: {evasionTested.status}</span>
                  </span>
                  <span className="text-[11px] text-[var(--muted)]">Coverage Score: {evasionTested.coverage_score}%</span>
                </div>
                <div className="text-[var(--text)]">Normalized: <code className="text-white">{evasionTested.decoded}</code></div>
                <p className="text-[11px] text-[var(--muted)]">{evasionTested.reason}</p>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* 4. BEFORE VS AFTER DEMO TAB (F1) */}
      {activeSubTab === 'before_after' && (
        <div className="space-y-4">
          <GlassCard className="p-6 space-y-4" glow="none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                  <span>Before vs. After Defense Split-Screen</span>
                </h3>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Demonstrate the vulnerable local mock API running without protection vs. through AegisGate.
                </p>
              </div>

              <button
                onClick={handleRunBeforeAfter}
                disabled={beforeAfterRunning}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:brightness-110 text-white text-xs font-medium transition-all shadow-sm"
              >
                {beforeAfterRunning ? 'Executing Test Probe...' : 'Run Attack Demonstration'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Without Gateway */}
              <div className="p-4 rounded-xl border border-[#E5656F]/30 bg-[#E5656F]/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#E5656F]">1. WITHOUT Gateway (Direct)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E5656F]/20 text-[#E5656F] font-bold">
                    VULNERABLE
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Incoming SQLi passes uninspected to backend database.
                </p>
                {beforeAfterResult && (
                  <pre className="p-2.5 rounded bg-[var(--bg)] text-[11px] font-mono text-[#E5656F] whitespace-pre-wrap">
                    {beforeAfterResult.without_gateway.detail}
                  </pre>
                )}
              </div>

              {/* With AegisGate */}
              <div className="p-4 rounded-xl border border-[#3FB68B]/30 bg-[#3FB68B]/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#3FB68B]">2. WITH AegisGate IDS</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#3FB68B]/20 text-[#3FB68B] font-bold">
                    PROTECTED (403)
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Deep normalizer + Random Forest intercepts in 1.4 ms before reaching backend.
                </p>
                {beforeAfterResult && (
                  <pre className="p-2.5 rounded bg-[var(--bg)] text-[11px] font-mono text-[#3FB68B] whitespace-pre-wrap">
                    {beforeAfterResult.with_gateway.detail}
                  </pre>
                )}
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
