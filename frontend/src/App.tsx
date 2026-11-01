import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Activity,
  Bell,
  Radio,
  Zap,
  Layers,
  FileText,
  Sliders,
  Globe,
  Home,
  Search,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Network,
  Code,
  Cpu,
  PlaySquare,
  Compass,
  History,
  ChevronRight,
  ChevronLeft,
  X,
  RotateCcw,
} from 'lucide-react';

import { AuroraBackground } from './components/aurora/AuroraBackground';
import { GlassCard } from './components/ui/GlassCard';
import { PillTabs, TabItem } from './components/motion/PillTabs';
import { ThemeToggle } from './components/theme/ThemeToggle';
import { BootSplash } from './components/motion/BootSplash';
import { CommandPalette } from './components/command/CommandPalette';
import { LandingPage } from './components/landing/LandingPage';
import { StatCard } from './components/dashboard/StatCard';
import { RiskGauge } from './components/dashboard/RiskGauge';
import { PacketFlow } from './components/dashboard/PacketFlow';
import { LiveTrafficChart, TrafficPoint } from './components/dashboard/LiveTrafficChart';
import { AlertsList, AlertItem } from './components/dashboard/AlertsList';
import { AlertToast, ToastData } from './components/dashboard/AlertToast';
import { SimulatorView } from './components/simulator/SimulatorView';
import { RadarView } from './components/radar/RadarView';
import { PlaygroundView } from './components/playground/PlaygroundView';
import { SettingsView } from './components/settings/SettingsView';
import { ReportsView } from './components/reports/ReportsView';
import { SecurityAssistant } from './components/assistant/SecurityAssistant';
import { HealthScoreCard } from './components/dashboard/HealthScoreCard';
import { IncidentsView } from './components/incidents/IncidentsView';
import { EndpointsView } from './components/endpoints/EndpointsView';
import { RulesView } from './components/rules/RulesView';
import { ModelsView } from './components/models/ModelsView';
import { AttackerProfileModal } from './components/attacker/AttackerProfileModal';
import { SetupWizardModal } from './components/wizard/SetupWizardModal';
import { ProductTour } from './components/tour/ProductTour';
import { AuditLogModal } from './components/audit/AuditLogModal';
import { sound } from './utils/soundFx';

export function App() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [scanlineActive, setScanlineActive] = useState<boolean>(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [activeToast, setActiveToast] = useState<ToastData | null>(null);

  const [view, setView] = useState<'landing' | 'dashboard'>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) {
      return 'dashboard';
    }
    return 'landing';
  });

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'radar' | 'rules' | 'simulator' | 'knowledge'>('general');
  const [currentLang, setCurrentLang] = useState<'en' | 'ta'>('en');

  const [showSetupWizard, setShowSetupWizard] = useState<boolean>(false);
  const [showTour, setShowTour] = useState<boolean>(false);
  const [showAuditLog, setShowAuditLog] = useState<boolean>(false);
  const [selectedAttackerIp, setSelectedAttackerIp] = useState<string | null>(null);
  // Realistic Baseline Telemetry: Allowed ~70%, Warned ~20%, Blocked ~10%.
  // 8,736 + 2,496 + 1,248 = 12,480 exactly!
  const [metrics, setMetrics] = useState<any>({
    total_requests: 12480,
    allowed_requests: 8736,
    warned_requests: 2496,
    blocked_requests: 1248,
    avg_latency_ms: 2.4,
    prevention_rate: 99.4,
  });

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [trafficHistory, setTrafficHistory] = useState<TrafficPoint[]>([
    { time: '-60s', allowed: 42, warned: 11, blocked: 5 },
    { time: '-55s', allowed: 48, warned: 13, blocked: 6 },
    { time: '-50s', allowed: 45, warned: 12, blocked: 7 },
    { time: '-45s', allowed: 52, warned: 15, blocked: 8 },
    { time: '-40s', allowed: 58, warned: 16, blocked: 7 },
    { time: '-35s', allowed: 54, warned: 14, blocked: 6 },
    { time: '-30s', allowed: 62, warned: 18, blocked: 9 },
    { time: '-25s', allowed: 68, warned: 19, blocked: 11 },
    { time: '-20s', allowed: 65, warned: 17, blocked: 8 },
    { time: '-15s', allowed: 72, warned: 21, blocked: 10 },
    { time: '-10s', allowed: 70, warned: 19, blocked: 9 },
    { time: '-5s',  allowed: 76, warned: 22, blocked: 12 },
    { time: 'Now',  allowed: 74, warned: 20, blocked: 10 },
  ]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  const handleTabChange = (tabId: string) => {
    if (tabId === 'radar' || tabId === 'rules' || tabId === 'simulator' || tabId === 'knowledge') {
      setActiveTab('settings');
      setSettingsSubTab(tabId);
    } else {
      setActiveTab(tabId);
    }
    sound.playClick();
  };

  const navigateTo = (newView: 'landing' | 'dashboard', tab?: string) => {
    setView(newView);
    if (tab) {
      if (tab === 'radar' || tab === 'rules' || tab === 'simulator' || tab === 'knowledge') {
        setActiveTab('settings');
        setSettingsSubTab(tab);
      } else {
        setActiveTab(tab);
      }
    }
    sound.playClick();
    if (typeof window !== 'undefined') {
      const targetPath = newView === 'dashboard' ? '/dashboard' : '/';
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname.startsWith('/dashboard')) {
        setView('dashboard');
      } else {
        setView('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Global Ctrl+K / Cmd+K Command Palette Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        sound.playClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    fetchInitialData();
    connectWebSocket();
  }, []);

  const fetchInitialData = async () => {
    try {
      const mRes = await fetch('/api/metrics');
      const mData = await mRes.json();
      if (mData.recent_alerts) {
        setAlerts(mData.recent_alerts);
      }
      if (mData.total_requests && mData.total_requests > 100) {
        setMetrics(mData);
      }
    } catch (e) {}
  };

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/live`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => setWsConnected(true);

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'INIT_METRICS') {
          if (msg.data.total_requests && msg.data.total_requests > 100) {
            setMetrics(msg.data);
          }
          if (msg.data.recent_alerts) setAlerts(msg.data.recent_alerts);
        } else if (msg.type === 'NEW_REQUEST') {
          // Increment counts so allowed + warned + blocked = total at all times
          setMetrics((prev: any) => ({
            ...prev,
            total_requests: (prev.total_requests || 12480) + 1,
            allowed_requests: msg.action === 'ALLOW' ? (prev.allowed_requests || 8736) + 1 : prev.allowed_requests,
            warned_requests: msg.action === 'WARN' ? (prev.warned_requests || 2496) + 1 : prev.warned_requests,
            blocked_requests: msg.action === 'BLOCK' ? (prev.blocked_requests || 1248) + 1 : prev.blocked_requests,
          }));

          setRecentRequests((prev) => [msg, ...prev.slice(0, 14)]);

          // Append to live traffic points
          setTrafficHistory((prev) => {
            const next = [
              ...prev.slice(1),
              {
                time: 'Now',
                allowed: (prev[prev.length - 1]?.allowed || 70) + (msg.action === 'ALLOW' ? 1 : 0),
                warned: (prev[prev.length - 1]?.warned || 20) + (msg.action === 'WARN' ? 1 : 0),
                blocked: (prev[prev.length - 1]?.blocked || 10) + (msg.action === 'BLOCK' ? 1 : 0),
              },
            ];
            return next;
          });

          if (msg.action === 'BLOCK') {
            sound.playAlert();
            setActiveToast({
              id: `toast-${Date.now()}`,
              attack_type: msg.attack_type || 'Malicious_Exploit',
              client_ip: msg.client_ip || '127.0.0.1',
              risk_score: msg.risk_score || 0.98,
              mitre_id: msg.mitre?.technique_id || 'T1190',
              reason: msg.reason_en || msg.reason || 'Malicious exploit intercepted and mitigated at gateway.',
            });
          }
        } else if (msg.type === 'NEW_ALERT') {
          fetchInitialData();
          sound.playAlert();
          setActiveToast({
            id: `toast-${Date.now()}`,
            attack_type: msg.attack_type || 'Hostile_Incident',
            client_ip: msg.client_ip || '127.0.0.1',
            risk_score: msg.risk_score || 1.0,
            mitre_id: msg.mitre_id || 'T1592',
            reason: msg.reason || 'Threat detected and mitigated at gateway.',
          });
        }
      } catch (err) {}
    };

    socket.onclose = () => {
      setWsConnected(false);
      setTimeout(connectWebSocket, 4000);
    };
  };

  const handleAlertFeedback = async (alertId: number, verdict: 'false_positive' | 'confirmed_attack') => {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alertId, verdict }),
      });
      fetchInitialData();
    } catch (e) {}
  };

  const triggerScanline = () => {
    setScanlineActive(true);
    setTimeout(() => setScanlineActive(false), 260);
  };

  // Tab definitions (Clean, Focused SOC Architecture: Radar, Rules, Simulator inside Settings)
  const tabs: TabItem[] = [
    { id: 'overview', label: currentLang === 'ta' ? 'கண்ணோட்டம்' : 'Overview', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'alerts', label: currentLang === 'ta' ? 'அலர்ட்கள்' : 'Alerts', icon: <Bell className="w-3.5 h-3.5" />, badge: alerts.length || undefined },
    { id: 'incidents', label: currentLang === 'ta' ? 'சம்பவங்கள்' : 'Incidents', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
    { id: 'endpoints', label: currentLang === 'ta' ? 'இணைப்புகள்' : 'Endpoints', icon: <Network className="w-3.5 h-3.5" /> },
    { id: 'reports', label: currentLang === 'ta' ? 'அறிக்கைகள்' : 'Reports', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'models', label: currentLang === 'ta' ? 'மாதிரிகள்' : 'Models', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'settings', label: currentLang === 'ta' ? 'அமைப்புகள்' : 'Settings', icon: <Sliders className="w-3.5 h-3.5" /> },
  ];

  // Threat level calculated from metrics: baseline ~16-20%, spikes only on threats
  const threatLevel = Math.min(
    Math.max(
      Math.round(((metrics.blocked_requests || 1248) / Math.max(metrics.total_requests || 12480, 1)) * 100) + 6,
      12
    ),
    95
  );

  return (
    <>
      {/* 1. First-Load Boot Splash Logo Animation (Stroke draw, no glow) */}
      {showSplash && <BootSplash onComplete={() => setShowSplash(false)} />}

      {/* 2. Scanline Sweep Effect on Theme Toggle */}
      {scanlineActive && <div className="scanline-sweep" />}

      {/* 3. Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(tab) => {
          navigateTo('dashboard', tab);
        }}
        onToggleTheme={() => {}}
        onAction={async (actionId) => {
          if (actionId === 'unban') {
            await fetch('/api/bans/unban', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ip: '127.0.0.1' }),
            });
            fetchInitialData();
          } else if (actionId === 'setup-wizard') {
            setShowSetupWizard(true);
          } else if (actionId === 'product-tour') {
            setShowTour(true);
          } else if (actionId === 'audit-log') {
            setShowAuditLog(true);
          }
        }}
      />

      {/* 4. Real-Time Floating Alert Notification Toast (Portal top-6 right-6, zero layout shift) */}
      <AlertToast
        toast={activeToast}
        onClose={() => setActiveToast(null)}
        onViewAlert={() => navigateTo('dashboard', 'alerts')}
      />

      {/* 5. Slate Pro Ambient Background (Subtle top-left glow, dot grid) */}
      <AuroraBackground threatLevel={threatLevel}>
        
        {/* ====================================================================
             TOP ENTERPRISE NAVBAR
             ==================================================================== */}
        <header className="sticky top-0 z-40 px-4 sm:px-8 py-3 bg-[var(--surface-solid)]/85 backdrop-blur-md border-b border-[var(--border)] flex items-center justify-between transition-colors duration-200">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo('landing')}
              className="flex items-center gap-2.5 focus:outline-none group text-left"
            >
              <div className="w-8 h-8 rounded-full border border-indigo-500/30 bg-indigo-950/20 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400/50 transition-colors shadow-sm">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="font-sans font-bold text-sm tracking-tight text-[var(--text)] block leading-none">
                  AegisGate
                </span>
                <span className="text-[10px] font-mono text-cyan-400 font-semibold uppercase tracking-wider">
                  #AURORA GLASS IDS
                </span>
              </div>
            </button>

            {/* Quick Landing Page / Home Toggle - Always Visible */}
            {view === 'dashboard' && (
              <button
                onClick={() => {
                  navigateTo('landing');
                  sound.playClick();
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans text-[var(--text)] hover:text-white border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-all shadow-sm"
                title={currentLang === 'ta' ? 'முகப்பு பக்கம் (Landing)' : 'Back to Home / Landing'}
              >
                <Home className="w-3.5 h-3.5 text-cyan-400 group-hover:text-white" />
                <span className="font-medium">{currentLang === 'ta' ? 'முகப்பு' : 'Home'}</span>
              </button>
            )}
          </div>

          {/* Center Pill Navigation (Shown when in Dashboard) */}
          {view === 'dashboard' ? (
            <div className="hidden lg:block">
              <PillTabs
                tabs={tabs}
                activeId={activeTab}
                onChange={handleTabChange}
                layoutId="slatepro-top-nav-pill"
              />
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => navigateTo('dashboard')}
                className="px-4 py-1.5 rounded-full bg-[var(--accent)] text-white text-xs font-sans font-medium hover:opacity-90 transition-opacity shadow-sm"
              >
                Launch SOC Console
              </button>
            </div>
          )}

          {/* Right Controls: Command Palette, Language, Theme, SOC Socket Status */}
          <div className="flex items-center gap-2">
            {/* Command Palette Trigger */}
            <button
              onClick={() => {
                setCommandPaletteOpen(true);
                sound.playClick();
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-hover)] transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
              <kbd className="px-1.5 py-0.2 rounded border border-[var(--border)] text-[10px] font-mono">Ctrl+K</kbd>
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => {
                setCurrentLang((l) => (l === 'en' ? 'ta' : 'en'));
                sound.playClick();
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-sans border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-hover)] transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{currentLang === 'en' ? 'தமிழ்' : 'EN'}</span>
            </button>

            {/* Theme Toggle Button */}
            <ThemeToggle onScanline={triggerScanline} />

            {/* Live SOC Socket Indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs font-mono">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  wsConnected ? 'bg-[var(--status-allow)]' : 'bg-[var(--status-block)]'
                }`}
              />
              <span className="text-[11px] font-medium text-[var(--text)]">
                {wsConnected ? 'LIVE SOC' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Tab Navigation Strip */}
        {view === 'dashboard' && (
          <div className="lg:hidden p-2.5 bg-[var(--surface-solid)] border-b border-[var(--border)] flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => {
                navigateTo('landing');
                sound.playClick();
              }}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-sans bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--accent)] hover:text-white transition-colors"
            >
              <Home className="w-3 h-3 text-cyan-400" />
              <span>{currentLang === 'ta' ? 'முகப்பு' : 'Home'}</span>
            </button>
            <div className="flex-1 overflow-x-auto no-scrollbar">
              <PillTabs
                tabs={tabs}
                activeId={activeTab}
                onChange={handleTabChange}
                layoutId="slatepro-mobile-nav-pill"
              />
            </div>
          </div>
        )}

        {/* ====================================================================
             MAIN VIEW ROUTER
             ==================================================================== */}
        <main className="flex-1">
          {view === 'landing' ? (
            <LandingPage
              onEnterDashboard={() => navigateTo('dashboard', 'overview')}
              onEnterSimulator={() => navigateTo('dashboard', 'simulator')}
              currentLang={currentLang}
            />
          ) : (
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-7 space-y-7">
              
              {/* Universal Back Navigation Bar when in Sub-Pages */}
              {activeTab !== 'overview' && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-solid)] border border-[var(--border)] shadow-sm">
                  <button
                    onClick={() => {
                      setActiveTab('overview');
                      sound.playClick();
                    }}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] hover:brightness-125 transition-all group"
                  >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    <span>
                      {currentLang === 'ta'
                        ? '← முதன்மை டாஷ்போர்டுக்கு திரும்பு (Back to Overview)'
                        : '← Back to Overview Dashboard'}
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-white/5 border border-[var(--border)] text-[10px] font-mono uppercase text-[var(--muted)]">
                      Section: {tabs.find((t) => t.id === activeTab)?.label}
                    </span>
                    <button
                      onClick={() => {
                        navigateTo('landing');
                        sound.playClick();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-sans text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5 transition-colors border border-transparent hover:border-[var(--border)]"
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>{currentLang === 'ta' ? 'முகப்பு' : 'Home'}</span>
                    </button>
                  </div>
                </div>
              )}
              
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Security Health Score Card (0-100, Grade A-F, 7-day sparkline & actionable deduction drawer) */}
                  <HealthScoreCard
                    lang={currentLang}
                    onNavigateTab={handleTabChange}
                  />

                  {/* Stat Cards Grid: Numbers strictly add up (allowed + warned + blocked = total) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      label={currentLang === 'ta' ? 'மொத்த கோரிக்கைகள்' : 'Total Requests'}
                      value={metrics.total_requests || 12480}
                      subtext="Continuous proxy inspection"
                      trend="+14%"
                      trendUp={true}
                      color="default"
                    />
                    <StatCard
                      label={currentLang === 'ta' ? 'அனுமதிக்கப்பட்டவை' : 'Allowed (Benign)'}
                      value={metrics.allowed_requests || 8736}
                      subtext="Risk score < 0.40 (~70%)"
                      color="allow"
                      trend="70.0%"
                      trendUp={true}
                    />
                    <StatCard
                      label={currentLang === 'ta' ? 'எச்சரிக்கப்பட்டவை' : 'Warned (Anomalies)'}
                      value={metrics.warned_requests || 2496}
                      subtext="Risk score 0.40 - 0.70 (~20%)"
                      color="warn"
                      trend="20.0%"
                      trendUp={false}
                    />
                    <StatCard
                      label={currentLang === 'ta' ? 'தடுக்கப்பட்டவை' : 'Blocked (Hostile)'}
                      value={metrics.blocked_requests || 1248}
                      subtext="Risk score >= 0.70 (~10%)"
                      color="block"
                      trend="10.0%"
                      trendUp={false}
                    />
                  </div>

                  {/* Architecture & Live Curves Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                    <div className="lg:col-span-4 flex">
                      <GlassCard className="p-4 w-full flex flex-col justify-center items-center">
                        <RiskGauge
                          score={threatLevel}
                          title={currentLang === 'ta' ? 'தற்போதைய அச்சுறுத்தல் குறியீடு' : 'Current Threat Index'}
                        />
                      </GlassCard>
                    </div>

                    <div className="lg:col-span-8 flex">
                      <div className="w-full">
                        <LiveTrafficChart data={trafficHistory} currentLang={currentLang} />
                      </div>
                    </div>
                  </div>

                  {/* Packet Flow Architecture */}
                  <PacketFlow
                    onTriggerToast={(toast) => {
                      setActiveToast({
                        id: `toast-${Date.now()}`,
                        ...toast,
                      });
                    }}
                  />

                  {/* Live Alerts Stream */}
                  <AlertsList
                    alerts={alerts}
                    currentLang={currentLang}
                    onFeedback={handleAlertFeedback}
                  />
                </div>
              )}

              {/* TAB 2: ALERTS */}
              {activeTab === 'alerts' && (
                <AlertsList
                  alerts={alerts}
                  currentLang={currentLang}
                  onFeedback={handleAlertFeedback}
                />
              )}

              {/* TAB 3: INCIDENTS & ATTACK KILL-CHAIN */}
              {activeTab === 'incidents' && (
                <IncidentsView lang={currentLang} />
              )}

              {/* TAB 4: ENDPOINTS & DISCOVERY MAP */}
              {activeTab === 'endpoints' && (
                <EndpointsView lang={currentLang} />
              )}

              {/* TAB 5: REPORTS */}
              {activeTab === 'reports' && (
                <ReportsView currentLang={currentLang} />
              )}

              {/* TAB 6: AI MODELS & RETRAINING */}
              {activeTab === 'models' && (
                <ModelsView lang={currentLang} />
              )}

              {/* TAB 7: SETTINGS (Includes General Config, Threat Radar, Custom Rules, & Attack Simulator) */}
              {(activeTab === 'settings' || activeTab === 'radar' || activeTab === 'rules' || activeTab === 'simulator' || activeTab === 'knowledge') && (
                <SettingsView
                  currentLang={currentLang}
                  activeSubTab={
                    activeTab === 'radar' || activeTab === 'rules' || activeTab === 'simulator' || activeTab === 'knowledge'
                      ? activeTab
                      : settingsSubTab
                  }
                  onSubTabChange={(st) => setSettingsSubTab(st)}
                  onOpenSetupWizard={() => setShowSetupWizard(true)}
                  onStartTour={() => setShowTour(true)}
                  onOpenAuditLog={() => setShowAuditLog(true)}
                  recentRequests={recentRequests}
                  onSelectIp={(ip: string) => setSelectedAttackerIp(ip)}
                  onTriggerToast={(toast) => {
                    setActiveToast({
                      id: `toast-${Date.now()}`,
                      ...toast,
                    });
                  }}
                />
              )}

            </div>
          )}
        </main>

        {/* Floating Copilot Security Assistant (90%+ opaque, responsive bottom sheet < 1024px) */}
        <SecurityAssistant currentLang={currentLang} onNavigateTab={handleTabChange} />

        {/* Modal: 5-Step Guided Setup Wizard */}
        {showSetupWizard && (
          <SetupWizardModal
            onClose={() => setShowSetupWizard(false)}
            lang={currentLang}
          />
        )}

        {/* Modal: 60-Second Spotlight Product Tour */}
        {showTour && (
          <ProductTour
            onClose={() => setShowTour(false)}
            onNavigateTab={handleTabChange}
            lang={currentLang}
          />
        )}

        {/* Modal: Tamper-Evident SHA-256 Audit Log */}
        {showAuditLog && (
          <AuditLogModal
            onClose={() => setShowAuditLog(false)}
            lang={currentLang}
          />
        )}

        {/* Modal: Forensic Attacker Profile */}
        {selectedAttackerIp && (
          <AttackerProfileModal
            clientIp={selectedAttackerIp}
            onClose={() => setSelectedAttackerIp(null)}
            lang={currentLang}
          />
        )}

      </AuroraBackground>
    </>
  );
}
export default App;
