import React, { useState, useEffect } from 'react';
import { ShieldCheck, TrendingUp, AlertTriangle, ChevronRight, X, ExternalLink, RefreshCw } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface Deduction {
  code: string;
  points: number;
  title: string;
  description: string;
  link_tab: string;
  fix_action: string;
}

interface HealthScoreData {
  score: number;
  grade: string;
  mode: string;
  deductions: Deduction[];
  trend_7d: number[];
  unresolved_incidents: number;
  unprotected_endpoints: number;
  active_rules: number;
  active_bans: number;
}

interface HealthScoreCardProps {
  onNavigateTab: (tab: string) => void;
  lang?: 'en' | 'ta';
}

export function HealthScoreCard({ onNavigateTab, lang = 'en' }: HealthScoreCardProps) {
  const [data, setData] = useState<HealthScoreData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  const fetchHealthScore = async () => {
    try {
      const res = await fetch('/api/health-score');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Fallback
      setData({
        score: 92,
        grade: 'A',
        mode: 'protect',
        deductions: [
          {
            code: 'NO_ACTIVE_BANS',
            points: -8,
            title: 'Frequent Attackers Not Banned',
            description: 'Multiple blocked payloads detected with zero active IP bans in place.',
            link_tab: 'alerts',
            fix_action: 'Enable auto-ban or manually ban repeat offenders',
          },
        ],
        trend_7d: [88, 90, 89, 91, 94, 91, 92],
        unresolved_incidents: 1,
        unprotected_endpoints: 1,
        active_rules: 1,
        active_bans: 1,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthScore();
    const interval = setInterval(fetchHealthScore, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  if (loading || !data) {
    return (
      <GlassCard className="p-4 flex items-center justify-between animate-pulse">
        <div className="h-10 w-24 bg-white/5 rounded" />
        <div className="h-6 w-32 bg-white/5 rounded" />
      </GlassCard>
    );
  }

  const gradeColor =
    data.grade === 'A' ? 'text-[#3FB68B]' :
    data.grade === 'B' ? 'text-[#5B8DEF]' :
    data.grade === 'C' ? 'text-[#D9A441]' : 'text-[#E5656F]';

  const badgeBg =
    data.grade === 'A' ? 'bg-[#3FB68B]/10 border-[#3FB68B]/30' :
    data.grade === 'B' ? 'bg-[#5B8DEF]/10 border-[#5B8DEF]/30' :
    data.grade === 'C' ? 'bg-[#D9A441]/10 border-[#D9A441]/30' : 'bg-[#E5656F]/10 border-[#E5656F]/30';

  // SVG Sparkline calculation
  const minVal = Math.min(...data.trend_7d, 70);
  const maxVal = Math.max(...data.trend_7d, 100);
  const range = maxVal - minVal || 1;
  const points = data.trend_7d.map((val, idx) => {
    const x = (idx / (data.trend_7d.length - 1)) * 100;
    const y = 30 - ((val - minVal) / range) * 24;
    return `${x},${y}`;
  }).join(' ');

  return (
    <>
      <GlassCard className="p-4 relative overflow-hidden" glow="default">
        <div className="flex items-center justify-between gap-4">
          {/* Score & Grade */}
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border font-bold text-xl font-mono ${gradeColor} ${badgeBg}`}>
              {data.grade}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold font-mono tracking-tight text-[var(--text)]">
                  {data.score}
                </span>
                <span className="text-xs text-[var(--muted)] font-mono">/ 100</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[var(--surface-solid)] border border-[var(--border)] text-[var(--muted)]">
                  {lang === 'ta' ? 'பாதுகாப்பு நிலை' : 'Health Score'}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                {data.deductions.length === 0
                  ? (lang === 'ta' ? 'அனைத்து அமைப்புகளும் பாதுகாப்பாக உள்ளன' : 'Controls fully hardened')
                  : `${data.deductions.length} ${lang === 'ta' ? 'மேம்பாடுகள் தேவை' : 'actionable deduction(s)'}`}
              </p>
            </div>
          </div>

          {/* 7-Day Sparkline */}
          <div className="hidden sm:flex flex-col items-end">
            <div className="flex items-center gap-1 text-[11px] text-[var(--muted)] mb-1">
              <TrendingUp className="w-3 h-3 text-[var(--accent)]" />
              <span>7-Day Posture</span>
            </div>
            <svg className="w-28 h-8 overflow-visible" viewBox="0 0 100 30">
              <polyline
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
            </svg>
          </div>

          {/* Breakdown Drawer Trigger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium bg-[var(--surface-solid)] hover:bg-white/10 text-[var(--text)] border border-[var(--border)] transition-colors"
          >
            <span>{lang === 'ta' ? 'விவரம்' : 'Posture'}</span>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--muted)]" />
          </button>
        </div>
      </GlassCard>

      {/* Breakdown Drawer */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-[999999] flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-full bg-[var(--surface-solid)] border-l border-[var(--border)] p-6 overflow-y-auto flex flex-col justify-between shadow-2xl cursor-default"
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
                  <h3 className="text-base font-semibold text-[var(--text)]">
                    {lang === 'ta' ? 'பாதுகாப்பு சுகாதார அறிக்கை' : 'Security Posture Audit'}
                  </h3>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Score Summary Banner */}
              <div className="my-5 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between">
                <div>
                  <div className="text-xs text-[var(--muted)] uppercase tracking-wider font-semibold">
                    Calculated Score
                  </div>
                  <div className="text-3xl font-bold font-mono text-[var(--text)] mt-1">
                    {data.score} <span className="text-sm font-normal text-[var(--muted)]">/ 100</span>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-xl text-2xl font-bold font-mono border ${gradeColor} ${badgeBg}`}>
                  Grade {data.grade}
                </div>
              </div>

              {/* Deductions Breakdown */}
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {lang === 'ta' ? 'குறைபாடுகள் மற்றும் திருத்தங்கள்' : 'Active Deductions & Fixes'}
                </div>
                {data.deductions.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#3FB68B]/10 border border-[#3FB68B]/30 text-xs text-[#3FB68B]">
                    No deductions! All security controls, rate limiters, honeypots, and ML models are operating at peak health.
                  </div>
                ) : (
                  data.deductions.map((d) => (
                    <div
                      key={d.code}
                      className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-[var(--text)]">{d.title}</span>
                        <span className="text-xs font-mono font-bold text-[#E5656F] bg-[#E5656F]/10 px-2 py-0.5 rounded">
                          {d.points} pts
                        </span>
                      </div>
                      <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">{d.description}</p>
                      <button
                        onClick={() => {
                          setDrawerOpen(false);
                          onNavigateTab(d.link_tab);
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline font-medium"
                      >
                        <span>Fix in {d.link_tab.charAt(0).toUpperCase() + d.link_tab.slice(1)}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-[var(--border)]">
              <button
                onClick={() => {
                  fetchHealthScore();
                }}
                className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:brightness-110 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{lang === 'ta' ? 'மீண்டும் கணக்கிடு' : 'Recalculate Posture'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
