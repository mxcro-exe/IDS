import React, { useState, useEffect } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  ShieldAlert,
  ShieldCheck,
  Ban,
  CheckCircle,
  HelpCircle,
  Code2,
  FileText,
  SlidersHorizontal,
  BellOff,
  FolderPlus,
  ArrowRight,
} from 'lucide-react';

interface AlertDetailModalProps {
  alert: any;
  onClose: () => void;
  onActionSuccess?: (message: string) => void;
  lang?: 'en' | 'ta';
}

export function AlertDetailModal({ alert, onClose, onActionSuccess, lang = 'en' }: AlertDetailModalProps) {
  const [viewMode, setViewMode] = useState<'simple' | 'technical'>('simple');
  const [explanationData, setExplanationData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [speaking, setSpeaking] = useState<boolean>(false);
  const [selectedDuration, setSelectedDuration] = useState<string>('30m');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    async function loadExplanation() {
      if (!alert?.id) return;
      try {
        const res = await fetch(`/api/explainer/${alert.id}`);
        if (res.ok) {
          const json = await res.json();
          setExplanationData(json.explanation);
        }
      } catch {
        // Fallback
        setExplanationData({
          attack_type: alert.attack_type,
          severity: alert.risk_score >= 0.7 ? 'High' : 'Medium',
          risk_score: alert.risk_score,
          confidence_pct: Math.round((alert.confidence || 0.9) * 100),
          explanation_en: alert.reason || 'Anomalous request pattern detected and intercepted.',
          explanation_ta: alert.reason_ta || 'அசாதாரண கோரிக்கை வடிவம் கண்டறியப்பட்டு தடுக்கப்பட்டது.',
          what_to_do_en: 'Review the client IP and apply a temporary block or update input validation.',
          what_to_do_ta: 'கிளையன்ட் IP முகவரியை ஆய்வு செய்து தற்காலிக முடக்கம் செய்யுங்கள்.',
          raw_payload: alert.raw_payload || '',
          decoded_payload: alert.decoded_payload || '',
        });
      } finally {
        setLoading(false);
      }
    }
    loadExplanation();
  }, [alert?.id]);

  // Browser Text-To-Speech
  const handleToggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const textToRead =
      lang === 'ta' && explanationData?.explanation_ta
        ? explanationData.explanation_ta
        : explanationData?.explanation_en || alert.reason;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = lang === 'ta' ? 'ta-IN' : 'en-US';
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  // One-Click Fix It Handler
  const handleFixAction = async (action: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/alerts/${alert.id}/fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          client_ip: alert.client_ip,
          duration: selectedDuration,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (onActionSuccess) onActionSuccess(json.message);
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const severity = explanationData?.severity || (alert.risk_score >= 0.7 ? 'High' : 'Medium');
  const severityBadgeClass =
    severity === 'Critical' ? 'badge-block text-[#E5656F]' :
    severity === 'High' ? 'badge-warn text-[#D9A441]' :
    severity === 'Medium' ? 'badge-allow text-[#3FB68B]' : 'bg-white/5 text-[var(--muted)] border border-[var(--border)]';

  const shaps = React.useMemo(() => {
    try {
      return typeof alert.shap_json === 'string' ? JSON.parse(alert.shap_json) : (alert.shap_json || []);
    } catch {
      return [];
    }
  }, [alert.shap_json]);

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-[var(--surface-solid)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--surface-solid)] border border-[var(--border)]">
              <ShieldAlert className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-[var(--text)]">
                  {lang === 'ta' ? 'அச்சுறுத்தல் விவரம்' : 'Incident Explainer'} #{alert.id}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono uppercase font-bold border ${severityBadgeClass}`}>
                  {severity}
                </span>
                <span className="text-xs text-[var(--muted)] font-mono">
                  {alert.client_ip}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] mt-0.5">{alert.attack_type.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Simple / Technical Toggle */}
            <div className="flex bg-[var(--surface-solid)] border border-[var(--border)] rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('simple')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  viewMode === 'simple' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {lang === 'ta' ? 'எளிய பார்வை' : 'Simple'}
              </button>
              <button
                onClick={() => setViewMode('technical')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  viewMode === 'technical' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {lang === 'ta' ? 'தொழில்நுட்பம்' : 'Technical'}
              </button>
            </div>

            {/* Read Aloud Button */}
            <button
              onClick={handleToggleSpeech}
              title="Read Aloud"
              className={`p-2 rounded-lg border border-[var(--border)] transition-colors ${
                speaking ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-solid)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {speaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {viewMode === 'simple' ? (
            /* SIMPLE PLAIN-LANGUAGE VIEW */
            <>
              {/* 2-Sentence Plain Language Explanation */}
              <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-2">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{lang === 'ta' ? 'மனித விளக்கம்' : 'Plain Language Summary'}</span>
                </div>
                <p className="text-sm text-[var(--text)] leading-relaxed">
                  {lang === 'ta' && explanationData?.explanation_ta
                    ? explanationData.explanation_ta
                    : explanationData?.explanation_en || alert.reason}
                </p>
              </div>

              {/* What should I do? Box */}
              <div className="p-4 rounded-xl bg-[#3FB68B]/10 border border-[#3FB68B]/20">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#3FB68B] mb-1.5">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{lang === 'ta' ? 'நான் என்ன செய்ய வேண்டும்?' : 'What Should I Do?'}</span>
                </div>
                <p className="text-xs text-[var(--text)] leading-relaxed">
                  {lang === 'ta' && explanationData?.what_to_do_ta
                    ? explanationData.what_to_do_ta
                    : explanationData?.what_to_do_en || 'Inspect client IP and enforce input validation rules.'}
                </p>
              </div>

              {/* Confidence & Score Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                  <span className="text-[11px] text-[var(--muted)] uppercase font-semibold">Risk Score</span>
                  <div className="text-lg font-bold font-mono text-[var(--text)] mt-0.5">
                    {alert.risk_score ? (alert.risk_score * 100).toFixed(0) : 0}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                  <span className="text-[11px] text-[var(--muted)] uppercase font-semibold">Calibrated Conf.</span>
                  <div className="text-lg font-bold font-mono text-[#3FB68B] mt-0.5">
                    {explanationData?.confidence_pct || 94}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                  <span className="text-[11px] text-[var(--muted)] uppercase font-semibold">MITRE Tactic</span>
                  <div className="text-xs font-semibold text-[var(--text)] mt-1 truncate">
                    {alert.mitre_id || 'T1190'}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* TECHNICAL FORENSIC VIEW */
            <>
              {/* Raw vs Decoded Payload */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium mb-1">
                    <span>Raw Input String (Wire)</span>
                    <span className="font-mono text-[11px]">Original</span>
                  </div>
                  <pre className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-mono text-[var(--text)] overflow-x-auto whitespace-pre-wrap break-all">
                    {alert.raw_payload || 'None'}
                  </pre>
                </div>

                {alert.decoded_payload && alert.decoded_payload !== alert.raw_payload && (
                  <div>
                    <div className="flex items-center justify-between text-xs text-[var(--accent)] font-medium mb-1">
                      <span>Normalized Decoded Payload (After De-Obfuscation)</span>
                      <span className="font-mono text-[11px]">De-obfuscated</span>
                    </div>
                    <pre className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--accent)]/30 text-xs font-mono text-[var(--text)] overflow-x-auto whitespace-pre-wrap break-all">
                      {alert.decoded_payload}
                    </pre>
                  </div>
                )}
              </div>

              {/* TreeSHAP Feature Attribution Bar */}
              {shaps.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2.5">
                    TreeSHAP Feature Attributions
                  </div>
                  <div className="space-y-2">
                    {shaps.map((f: any, idx: number) => {
                      const contrib = f.contribution || 0;
                      const widthPct = Math.min(100, Math.abs(contrib) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[var(--text)]">{f.feature.replace(/_/g, ' ')}</span>
                            <span className={contrib > 0 ? 'text-[#E5656F]' : 'text-[#3FB68B]'}>
                              {contrib > 0 ? `+${contrib.toFixed(3)}` : contrib.toFixed(3)}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full bg-[var(--accent)] rounded-full transition-all"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ONE-CLICK "FIX IT" ACTION BAR */}
          <div className="pt-4 border-t border-[var(--border)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                {lang === 'ta' ? 'உடனடி தீர்வு நடவடிக்கைகள்' : 'One-Click "Fix It" Remediation'}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <span>Duration:</span>
                <select
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(e.target.value)}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded px-1.5 py-0.5 text-xs text-[var(--text)]"
                >
                  <option value="30m">30 min</option>
                  <option value="2h">2 hours</option>
                  <option value="24h">24 hours</option>
                  <option value="7d">7 days</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                disabled={actionLoading}
                onClick={() => handleFixAction('ban_ip')}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-[#E5656F]/10 hover:bg-[#E5656F]/20 text-[#E5656F] border border-[#E5656F]/30 text-xs font-medium transition-all"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{lang === 'ta' ? 'IP தடை செய்' : 'Ban IP'}</span>
              </button>

              <button
                disabled={actionLoading}
                onClick={() => handleFixAction('allow_ip')}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-[#3FB68B]/10 hover:bg-[#3FB68B]/20 text-[#3FB68B] border border-[#3FB68B]/30 text-xs font-medium transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{lang === 'ta' ? 'அனுமதி செய்' : 'Allowlist'}</span>
              </button>

              <button
                disabled={actionLoading}
                onClick={() => handleFixAction('false_positive')}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-[var(--surface)] hover:bg-white/10 text-[var(--text)] border border-[var(--border)] text-xs font-medium transition-all"
              >
                <CheckCircle className="w-3.5 h-3.5 text-[#3FB68B]" />
                <span>False Positive</span>
              </button>

              <button
                disabled={actionLoading}
                onClick={() => handleFixAction('mute')}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-[var(--surface)] hover:bg-white/10 text-[var(--text)] border border-[var(--border)] text-xs font-medium transition-all"
              >
                <BellOff className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Mute 1h</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
