import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Volume2,
  VolumeX,
  CheckCircle,
  RefreshCcw,
  Compass,
  ShieldCheck,
  History,
  Download,
  Radio,
  Code,
  Zap,
  Brain,
  ChevronRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { sound } from '../../utils/soundFx';
import { RadarView } from '../radar/RadarView';
import { RulesView } from '../rules/RulesView';
import { SimulatorView } from '../simulator/SimulatorView';
import { CopilotKnowledgeView } from '../knowledge/CopilotKnowledgeView';

interface SettingsViewProps {
  currentLang?: 'en' | 'ta';
  activeSubTab?: 'general' | 'radar' | 'rules' | 'simulator' | 'knowledge';
  onSubTabChange?: (subTab: 'general' | 'radar' | 'rules' | 'simulator' | 'knowledge') => void;
  onOpenSetupWizard?: () => void;
  onStartTour?: () => void;
  onOpenAuditLog?: () => void;
  recentRequests?: any[];
  onSelectIp?: (ip: string) => void;
  onTriggerToast?: (toast: any) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentLang = 'en',
  activeSubTab = 'general',
  onSubTabChange,
  onOpenSetupWizard,
  onStartTour,
  onOpenAuditLog,
  recentRequests = [],
  onSelectIp,
  onTriggerToast,
}) => {
  const [subTab, setSubTab] = useState<'general' | 'radar' | 'rules' | 'simulator' | 'knowledge'>(
    activeSubTab || 'general'
  );

  useEffect(() => {
    if (activeSubTab) {
      setSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  const handleSelectSubTab = (st: 'general' | 'radar' | 'rules' | 'simulator' | 'knowledge') => {
    setSubTab(st);
    onSubTabChange?.(st);
    sound.playClick();
  };

  const [mode, setMode] = useState<'learning' | 'monitor' | 'protect'>('protect');
  const [weightMl, setWeightMl] = useState(0.45);
  const [weightBeh, setWeightBeh] = useState(0.35);
  const [weightRules, setWeightRules] = useState(0.20);
  const [warnThreshold, setWarnThreshold] = useState(0.40);
  const [blockThreshold, setBlockThreshold] = useState(0.70);
  const [rateLimitMax, setRateLimitMax] = useState(50);
  const [autobanMins, setAutobanMins] = useState(10);
  const [soundEnabled, setSoundEnabled] = useState(sound.isEnabled());
  const [activeBans, setActiveBans] = useState<string[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchBans();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.mode) setMode(data.mode);
      if (data.weights) {
        setWeightMl(data.weights.ml);
        setWeightBeh(data.weights.behavioral);
        setWeightRules(data.weights.rules);
      }
      if (data.thresholds) {
        setWarnThreshold(data.thresholds.warn);
        setBlockThreshold(data.thresholds.block);
      }
    } catch (e) {}
  };

  const fetchBans = async () => {
    try {
      const res = await fetch('/api/bans');
      const data = await res.json();
      if (data.active_bans) setActiveBans(data.active_bans);
    } catch (e) {}
  };

  const handleSave = async () => {
    sound.playClick();
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          weight_ml: weightMl,
          weight_behavioral: weightBeh,
          weight_rules: weightRules,
          warn_threshold: warnThreshold,
          block_threshold: blockThreshold,
          rate_limit_max: rateLimitMax,
          rate_limit_window: 60,
          autoban_minutes: autobanMins,
        }),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (e) {}
  };

  const handleUnban = async (ip: string) => {
    sound.playClick();
    try {
      await fetch('/api/bans/unban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip }),
      });
      fetchBans();
    } catch (e) {}
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.setEnabled(next);
    if (next) sound.playClick();
  };

  // Vertical Navigation Items (Arranged Top to Bottom)
  const navItems = [
    {
      id: 'general' as const,
      label: currentLang === 'ta' ? 'கட்டமைப்பு அமைப்புகள்' : 'Configuration',
      subtitle: currentLang === 'ta' ? 'வரம்புகள் & தீவிரத்தன்மை' : 'Modes, weights & thresholds',
      icon: <Sliders className="w-4 h-4 text-cyan-400" />,
      badge: undefined,
    },
    {
      id: 'radar' as const,
      label: currentLang === 'ta' ? 'அச்சுறுத்தல் ரேடார்' : 'Threat Radar',
      subtitle: currentLang === 'ta' ? '360° சுற்றளவு கண்காணிப்பு' : '360° perimeter telemetry',
      icon: <Radio className="w-4 h-4 text-emerald-400" />,
      badge: 'LIVE',
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    },
    {
      id: 'rules' as const,
      label: currentLang === 'ta' ? 'பாதுகாப்பு விதிகள்' : 'Custom Rules',
      subtitle: currentLang === 'ta' ? 'WAF விதிகள் & பாலிசிகள்' : 'WAF filters & regex policies',
      icon: <Code className="w-4 h-4 text-indigo-400" />,
      badge: 'WAF',
      badgeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    },
    {
      id: 'simulator' as const,
      label: currentLang === 'ta' ? 'தாக்குதல் சிமுலேட்டர்' : 'Attack Simulator',
      subtitle: currentLang === 'ta' ? 'தாக்குதல் ஊடுருவல் சோதனை' : 'Exploit injection & evasion lab',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
      badge: 'SANDBOX',
      badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    },
    {
      id: 'knowledge' as const,
      label: currentLang === 'ta' ? 'Copilot அறிவு தளம்' : 'Copilot Knowledge',
      subtitle: currentLang === 'ta' ? '3,000 வினா-விடைகள் & கற்றல்' : '3,000 Intents & Learning loop',
      icon: <Brain className="w-4 h-4 text-purple-400" />,
      badge: '3K Q&A',
      badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
      {/* ====================================================================
          LEFT SIDEBAR: VERTICAL NAVIGATION & TOOLS (TOP TO BOTTOM)
          ==================================================================== */}
      <aside className="lg:col-span-4 xl:col-span-3 space-y-4 lg:sticky lg:top-20">
        {/* Navigation Card */}
        <GlassCard className="p-3.5 border border-[var(--border)] bg-[var(--surface-solid)] space-y-3 rounded-2xl shadow-sm">
          {/* Sidebar Header */}
          <div className="px-2 py-1">
            <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[var(--accent)]" />
              <span>{currentLang === 'ta' ? 'அமைப்புகள் & கருவிகள்' : 'Settings & Controls'}</span>
            </h3>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">
              {currentLang === 'ta'
                ? 'பாதுகாப்பு விதிகள், ரேடார் மற்றும் AI'
                : 'Security controls, perimeter & copilot'}
            </p>
          </div>

          {/* Vertical Menu Buttons (Top to Bottom) */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = subTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectSubTab(item.id)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between group border ${
                    isActive
                      ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--text)] shadow-xs'
                      : 'border-transparent hover:border-[var(--border)] hover:bg-white/5 text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`p-2 rounded-lg border transition-colors ${
                        isActive
                          ? 'bg-[var(--accent)] text-white border-transparent'
                          : 'bg-[var(--surface)] border-[var(--border)] group-hover:border-[var(--border-hover)]'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                        <span className={isActive ? 'text-[var(--text)]' : ''}>{item.label}</span>
                      </div>
                      <div className="text-[10px] text-[var(--muted)] truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  {item.badge ? (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono border uppercase tracking-wider shrink-0 ${item.badgeClass}`}
                    >
                      {item.badge}
                    </span>
                  ) : (
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform shrink-0 ${
                        isActive ? 'text-[var(--accent)] translate-x-0.5' : 'text-[var(--muted)] opacity-40'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </GlassCard>

        {/* Platform Operations Card */}
        <GlassCard className="p-3.5 border border-[var(--border)] bg-[var(--surface-solid)] space-y-2.5 rounded-2xl shadow-sm">
          <div className="px-2 text-[11px] font-mono uppercase tracking-wider text-[var(--muted)] font-semibold">
            {currentLang === 'ta' ? 'தள செயல்பாடுகள்' : 'Platform Operations'}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => onOpenSetupWizard?.()}
              className="p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)] hover:text-[var(--text)] text-[var(--muted)] flex items-center gap-2 transition-colors text-left"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--status-allow)] shrink-0" />
              <span className="text-[11px] font-medium truncate">Wizard</span>
            </button>

            <button
              onClick={() => onStartTour?.()}
              className="p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)] hover:text-[var(--text)] text-[var(--muted)] flex items-center gap-2 transition-colors text-left"
            >
              <Compass className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
              <span className="text-[11px] font-medium truncate">Tour</span>
            </button>

            <button
              onClick={() => onOpenAuditLog?.()}
              className="p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)] hover:text-[var(--text)] text-[var(--muted)] flex items-center gap-2 transition-colors text-left"
            >
              <History className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
              <span className="text-[11px] font-medium truncate">Audit</span>
            </button>

            <button
              onClick={() => window.open('/api/export/pdf', '_blank')}
              className="p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)] hover:text-[var(--text)] text-[var(--muted)] flex items-center gap-2 transition-colors text-left"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-[11px] font-medium truncate">PDF</span>
            </button>
          </div>

          {/* Audio Synthesizer Toggle */}
          <div className="pt-2 border-t border-[var(--border)]/70 flex items-center justify-between px-1">
            <div className="text-[11px] text-[var(--muted)]">
              <span>Sound Telemetry:</span>{' '}
              <strong className={soundEnabled ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}>
                {soundEnabled ? 'ON' : 'OFF'}
              </strong>
            </div>
            <button
              onClick={toggleSound}
              className={`p-1.5 rounded-lg border transition-all ${
                soundEnabled
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                  : 'border-[var(--border)] text-[var(--muted)]'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>
        </GlassCard>
      </aside>

      {/* ====================================================================
          RIGHT MAIN WORKSPACE: ACTIVE SUB-VIEW CONTENT
          ==================================================================== */}
      <main className="lg:col-span-8 xl:col-span-9 space-y-5">
        {/* SUB-VIEW 1: THREAT RADAR */}
        {subTab === 'radar' && (
          <div className="space-y-4">
            <RadarView
              currentLang={currentLang}
              recentRequests={recentRequests}
              onSelectIp={onSelectIp}
            />
          </div>
        )}

        {/* SUB-VIEW 2: CUSTOM RULES ENGINE */}
        {subTab === 'rules' && (
          <div className="space-y-4">
            <RulesView lang={currentLang} />
          </div>
        )}

        {/* SUB-VIEW 3: ATTACK SIMULATOR */}
        {subTab === 'simulator' && (
          <div className="space-y-4">
            <SimulatorView
              currentLang={currentLang}
              onTriggerToast={onTriggerToast}
            />
          </div>
        )}

        {/* SUB-VIEW 4: REDESIGNED CLEAN COPILOT KNOWLEDGE BASE */}
        {subTab === 'knowledge' && (
          <div className="space-y-4">
            <CopilotKnowledgeView lang={currentLang} />
          </div>
        )}

        {/* SUB-VIEW 5: GENERAL CONFIGURATION */}
        {subTab === 'general' && (
          <div className="space-y-5">
            {/* Header Description */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="text-base font-semibold text-[var(--text)] flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>
                    {currentLang === 'ta'
                      ? 'கேட்வே கட்டமைப்பு & அமலாக்கம்'
                      : 'Gateway Enforcement & Sensitivity Configuration'}
                  </span>
                </h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {currentLang === 'ta'
                    ? 'இயக்க முறை, அபாய வரம்புகள், முடிவெடுக்கும் எடைகள் மற்றும் தானியங்கி தடுப்புகள்.'
                    : 'Manage operational enforcement mode, anomaly thresholds, fusion weights, and active IP bans.'}
                </p>
              </div>

              {/* Quick Save Live Action */}
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] font-sans font-medium text-xs text-white flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm shrink-0"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{savedSuccess ? 'Applied Live!' : 'Save & Apply'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              {/* Left Column: Operational Mode & Weights */}
              <div className="xl:col-span-7 space-y-4">
                <GlassCard className="p-5 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)]">
                  <h4 className="text-sm font-sans font-semibold text-[var(--text)]">
                    Operational Enforcement Mode
                  </h4>

                  {/* Mode Selector */}
                  <div className="grid grid-cols-3 gap-2.5 font-sans text-xs">
                    {(['learning', 'monitor', 'protect'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          setMode(m);
                          sound.playClick();
                        }}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          mode === m
                            ? 'bg-[var(--accent)] text-white font-medium border-transparent shadow-sm'
                            : 'border-[var(--border)] bg-[var(--surface-solid)] text-[var(--muted)] hover:border-[var(--border-hover)] hover:text-[var(--text)]'
                        }`}
                      >
                        <div className="uppercase font-semibold text-xs tracking-wider">{m}</div>
                        <div className="text-[10px] opacity-80 mt-1 font-sans">
                          {m === 'protect' ? 'Active Drop' : m === 'monitor' ? 'Audit Only' : 'Data Log'}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Threshold Sliders */}
                  <div className="space-y-4 pt-3 border-t border-[var(--border)] font-sans text-xs">
                    <div className="space-y-1.5">
                      <div className="flex justify-between font-mono">
                        <span className="font-sans text-[var(--text)]">WARN Threshold (Anomaly Flag):</span>
                        <span className="font-semibold text-[var(--status-warn)]">
                          {(warnThreshold * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="0.6"
                        step="0.05"
                        value={warnThreshold}
                        onChange={(e) => setWarnThreshold(parseFloat(e.target.value))}
                        className="w-full accent-[var(--status-warn)] cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between font-mono">
                        <span className="font-sans text-[var(--text)]">BLOCK Threshold (Strict Mitigation):</span>
                        <span className="font-semibold text-[var(--status-block)]">
                          {(blockThreshold * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="0.9"
                        step="0.05"
                        value={blockThreshold}
                        onChange={(e) => setBlockThreshold(parseFloat(e.target.value))}
                        className="w-full accent-[var(--status-block)] cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Risk Fusion Weights */}
                  <div className="space-y-3 pt-3 border-t border-[var(--border)] font-sans text-xs">
                    <span className="text-[11px] font-mono text-[var(--muted)] uppercase font-medium block">
                      Decision Weight Distribution (Total = 1.0)
                    </span>

                    <div className="space-y-1.5">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className="font-sans">ML Classifier Weight (w1):</span>
                        <span className="font-semibold text-[var(--accent)]">{weightMl.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.8"
                        step="0.05"
                        value={weightMl}
                        onChange={(e) => setWeightMl(parseFloat(e.target.value))}
                        className="w-full accent-[var(--accent)] cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className="font-sans">Behavioral Tracking Weight (w2):</span>
                        <span className="font-semibold text-cyan-400">{weightBeh.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.8"
                        step="0.05"
                        value={weightBeh}
                        onChange={(e) => setWeightBeh(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className="font-sans">Deterministic Rules Weight (w3):</span>
                        <span className="font-semibold text-[var(--status-allow)]">{weightRules.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="0.5"
                        step="0.05"
                        value={weightRules}
                        onChange={(e) => setWeightRules(parseFloat(e.target.value))}
                        className="w-full accent-[var(--status-allow)] cursor-pointer"
                      />
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Right Column: Rate Limiting & Active Bans */}
              <div className="xl:col-span-5 space-y-4">
                {/* Rate Limiting & Autoban Card */}
                <GlassCard className="p-5 space-y-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] text-xs">
                  <h4 className="text-sm font-semibold text-[var(--text)]">
                    Rate Limiter & Honeypot Banning
                  </h4>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono">
                        <span className="text-[var(--text)]">Max Requests / min (IP limit):</span>
                        <span className="font-semibold text-[var(--accent)]">{rateLimitMax} req/m</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="200"
                        step="5"
                        value={rateLimitMax}
                        onChange={(e) => setRateLimitMax(parseInt(e.target.value))}
                        className="w-full accent-[var(--accent)] cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-mono">
                        <span className="text-[var(--text)]">Auto-Ban Duration:</span>
                        <span className="font-semibold text-amber-400">{autobanMins} minutes</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="60"
                        step="5"
                        value={autobanMins}
                        onChange={(e) => setAutobanMins(parseInt(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>
                  </div>
                </GlassCard>

                {/* Active IP Bans Registry */}
                <GlassCard className="p-5 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--text)]">
                        Isolated IP Registry
                      </h4>
                      <p className="text-[11px] text-[var(--muted)] mt-0.5">
                        Automated honeypot & scanner bans (10m TTL).
                      </p>
                    </div>
                    <button
                      onClick={fetchBans}
                      className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2 font-mono text-xs max-h-48 overflow-y-auto pr-1">
                    {activeBans.length === 0 ? (
                      <div className="text-center py-6 text-[var(--muted)] font-sans border border-dashed border-[var(--border)] rounded-xl">
                        No active client bans. Honeypots clear.
                      </div>
                    ) : (
                      activeBans.map((ip) => (
                        <div
                          key={ip}
                          className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-between"
                        >
                          <span className="font-semibold text-[var(--status-block)]">{ip}</span>
                          <button
                            onClick={() => handleUnban(ip)}
                            className="px-2.5 py-1 rounded-lg text-[11px] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-hover)] transition-colors"
                          >
                            Unban
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </GlassCard>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
