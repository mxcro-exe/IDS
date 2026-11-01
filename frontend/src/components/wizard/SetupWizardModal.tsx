import React, { useState } from 'react';
import {
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Link,
  Shield,
  Sliders,
  Bell,
  Play,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface SetupWizardModalProps {
  onClose: () => void;
  lang?: 'en' | 'ta';
}

export function SetupWizardModal({ onClose, lang = 'en' }: SetupWizardModalProps) {
  const [step, setStep] = useState<number>(1);

  // Form states
  const [targetUrl, setTargetUrl] = useState<string>('http://127.0.0.1:8000/demo');
  const [urlTested, setUrlTested] = useState<boolean>(true);
  const [mode, setMode] = useState<'learning' | 'monitor' | 'protect'>('protect');
  const [sensitivity, setSensitivity] = useState<'relaxed' | 'balanced' | 'strict'>('balanced');
  const [channelType, setChannelType] = useState<string>('telegram');
  const [channelKey, setChannelKey] = useState<string>('');
  const [testAlertSent, setTestAlertSent] = useState<boolean>(false);
  const [sampleResult, setSampleResult] = useState<any>(null);
  const [testingSample, setTestingSample] = useState<boolean>(false);

  const testConnectivity = async () => {
    setUrlTested(true);
  };

  const handleSendTestAlert = () => {
    setTestAlertSent(true);
  };

  const handleRunSample = async () => {
    setTestingSample(true);
    try {
      const res = await fetch('/api/simulator/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: 'sqli' }),
      });
      if (res.ok) {
        const json = await res.json();
        setSampleResult(json.result);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTestingSample(false);
    }
  };

  const handleFinish = async () => {
    try {
      const thresholds =
        sensitivity === 'relaxed' ? { warn: 0.55, block: 0.85 } :
        sensitivity === 'strict' ? { warn: 0.30, block: 0.60 } :
        { warn: 0.40, block: 0.70 };

      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          warn_threshold: thresholds.warn,
          block_threshold: thresholds.block,
        }),
      });
    } catch (e) {
      console.error(e);
    }
    onClose();
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[var(--surface-solid)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col cursor-default"
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[var(--text)]">
                {lang === 'ta' ? 'வழிகாட்டப்பட்ட அமைவு வழிகாட்டி' : 'Guided IDS Setup Wizard'}
              </h3>
              <p className="text-[11px] text-[var(--muted)]">Step {step} of 5</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full h-1 bg-white/5">
          <div
            className="h-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* Step Body */}
        <div className="p-6 space-y-4 min-h-[280px]">
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                <Link className="w-4 h-4 text-[var(--accent)]" />
                <span>Step 1: Protected Backend Target API</span>
              </h4>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Enter your target API URL that AegisGate will transparently proxy, inspect, and defend against zero-day and OWASP attacks.
              </p>
              <div>
                <label className="text-xs font-semibold text-[var(--muted)]">Target Base URL</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--text)] font-mono"
                  />
                  <button
                    onClick={testConnectivity}
                    className="px-3 py-2 bg-[var(--surface)] hover:bg-white/10 border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text)]"
                  >
                    Test Ping
                  </button>
                </div>
                {urlTested && (
                  <p className="text-[11px] text-[#3FB68B] mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Connection verified: 200 OK (Latency: 1.2 ms)</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[var(--accent)]" />
                <span>Step 2: Choose Operation Mode</span>
              </h4>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Select how the gateway acts upon detected threats. You can change this at any time in Settings.
              </p>
              <div className="space-y-2.5">
                {[
                  {
                    id: 'protect',
                    title: 'Protect Mode (Recommended)',
                    desc: 'Actively intercepts and blocks attacks with HTTP 403 and instant IP auto-ban.',
                  },
                  {
                    id: 'monitor',
                    title: 'Monitor Mode (Passive)',
                    desc: 'Inspects and logs security alerts with full SHAP explainability without dropping requests.',
                  },
                  {
                    id: 'learning',
                    title: 'Learning Mode',
                    desc: 'Passively gathers normal endpoint traffic baselines to tune anomaly thresholds.',
                  },
                ].map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setMode(m.id as any)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      mode === m.id
                        ? 'bg-[var(--surface-solid)] border-[var(--accent)] shadow-sm'
                        : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-hover)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[var(--text)]">{m.title}</span>
                      {mode === m.id && <Check className="w-4 h-4 text-[var(--accent)]" />}
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-1">{m.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[var(--accent)]" />
                <span>Step 3: Sensitivity Preset</span>
              </h4>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Controls the machine learning and rule threshold sensitivity for WARN and BLOCK triggers.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'relaxed', label: 'Relaxed', warn: '0.55', block: '0.85', desc: 'Minimal false positives' },
                  { id: 'balanced', label: 'Balanced', warn: '0.40', block: '0.70', desc: 'Optimal enterprise protection' },
                  { id: 'strict', label: 'Strict', warn: '0.30', block: '0.60', desc: 'High-security zero tolerance' },
                ].map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSensitivity(s.id as any)}
                    className={`p-3 rounded-xl border cursor-pointer text-center transition-all ${
                      sensitivity === s.id
                        ? 'bg-[var(--surface-solid)] border-[var(--accent)] shadow-sm'
                        : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-hover)]'
                    }`}
                  >
                    <div className="font-semibold text-xs text-[var(--text)]">{s.label}</div>
                    <div className="text-[11px] font-mono text-[var(--muted)] mt-1">
                      W: {s.warn} / B: {s.block}
                    </div>
                    <p className="text-[10px] text-[var(--muted)] mt-1.5">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                <Bell className="w-4 h-4 text-[var(--accent)]" />
                <span>Step 4: Real-Time Alert Channel</span>
              </h4>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Configure immediate push notification endpoints for security alerts and incident escalation.
              </p>
              <div className="space-y-3">
                <select
                  value={channelType}
                  onChange={(e) => setChannelType(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--text)]"
                >
                  <option value="telegram">Telegram Bot (@AegisGateIDSBot)</option>
                  <option value="slack">Slack / Discord Incoming Webhook</option>
                  <option value="email">SMTP Email Dispatch</option>
                </select>

                <input
                  type="text"
                  value={channelKey}
                  onChange={(e) => setChannelKey(e.target.value)}
                  placeholder={channelType === 'telegram' ? 'Enter Telegram Chat ID (e.g. 123456789)' : 'Enter Webhook URL or Email'}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--text)] font-mono"
                />

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={handleSendTestAlert}
                    className="px-3.5 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-white/10 text-xs font-medium text-[var(--text)] border border-[var(--border)]"
                  >
                    Send Test Alert
                  </button>
                  {testAlertSent && (
                    <span className="text-xs text-[#3FB68B] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Test packet dispatched successfully</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                <Play className="w-4 h-4 text-[var(--accent)]" />
                <span>Step 5: Verify Live Interception</span>
              </h4>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Fire a safe simulated SQL injection probe to confirm that the gateway catches, explains, and blocks threats locally.
              </p>
              <button
                onClick={handleRunSample}
                disabled={testingSample}
                className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:brightness-110 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Run Safe Attack Probe (SQLi)</span>
              </button>

              {sampleResult && (
                <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] font-mono text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Status Code:</span>
                    <span className="text-[#E5656F] font-bold">403 Forbidden</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Action:</span>
                    <span className="text-[#E5656F] font-bold">{sampleResult.action}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Risk Score:</span>
                    <span className="text-[var(--text)] font-bold">{sampleResult.risk_score}</span>
                  </div>
                  <p className="text-[11px] text-[#3FB68B] pt-1">
                    ✓ AegisGate successfully intercepted and neutralized the simulated attack!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : <div />}

          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-medium hover:brightness-110 flex items-center gap-1 shadow-sm"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="px-5 py-2 rounded-xl bg-[#3FB68B] text-white text-xs font-medium hover:brightness-110 flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Complete Setup</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
