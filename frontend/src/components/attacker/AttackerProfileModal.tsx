import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  Globe,
  Ban,
  ShieldCheck,
  Activity,
  Bot,
  AlertTriangle,
  Send,
  ExternalLink,
} from 'lucide-react';

interface AttackerProfileModalProps {
  clientIp: string;
  onClose: () => void;
  onBanSuccess?: (msg: string) => void;
  lang?: 'en' | 'ta';
}

export function AttackerProfileModal({ clientIp, onClose, onBanSuccess, lang = 'en' }: AttackerProfileModalProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [newNote, setNewNote] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/attackers/${clientIp}`);
        if (res.ok) {
          const json = await res.json();
          setProfile(json);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientIp]);

  const handleBan = async () => {
    try {
      const res = await fetch('/api/bans/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip_or_cidr: clientIp, duration: '24h', reason: 'Banned from Attacker Profile' }),
      });
      if (res.ok) {
        if (onBanSuccess) onBanSuccess(`Client IP ${clientIp} banned for 24 hours.`);
        onClose();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAllow = async () => {
    try {
      const res = await fetch('/api/allowlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip_or_cidr: clientIp, reason: 'Trusted from Profile' }),
      });
      if (res.ok) {
        if (onBanSuccess) onBanSuccess(`Client IP ${clientIp} added to allowlist.`);
        onClose();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      const res = await fetch(`/api/attackers/${clientIp}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote }),
      });
      if (res.ok) {
        const json = await res.json();
        setProfile({
          ...profile,
          notes: [json.note, ...(profile.notes || [])],
        });
        setNewNote('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (loading || !profile) {
    return (
      <div
        onClick={onClose}
        className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md cursor-pointer"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl bg-[var(--surface-solid)] border border-[var(--border)] rounded-2xl p-8 text-center text-[var(--muted)] cursor-default"
        >
          Loading attacker profile...
        </div>
      </div>
    );
  }

  const geo = profile.geoip || {};
  const repScore = profile.reputation_score || 50;
  const repColor =
    repScore > 70 ? 'text-[#3FB68B]' :
    repScore > 40 ? 'text-[#D9A441]' : 'text-[#E5656F]';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[var(--surface-solid)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] cursor-default"
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--surface-solid)] border border-[var(--border)] font-mono font-bold text-xs">
              <Globe className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono font-bold text-base text-[var(--text)]">{clientIp}</h3>
                {profile.is_banned ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#E5656F]/10 text-[#E5656F] border border-[#E5656F]/30">
                    Banned
                  </span>
                ) : profile.is_allowlisted ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#3FB68B]/10 text-[#3FB68B] border border-[#3FB68B]/30">
                    Allowlisted
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-white/5 text-[var(--muted)] border border-[var(--border)]">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                {geo.city}, {geo.country} • {geo.asn}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <span className="text-[11px] text-[var(--muted)] uppercase font-semibold">Reputation</span>
              <div className={`text-xl font-bold font-mono ${repColor} mt-0.5`}>
                {repScore}/100
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <span className="text-[11px] text-[var(--muted)] uppercase font-semibold">Total Requests</span>
              <div className="text-xl font-bold font-mono text-[var(--text)] mt-0.5">
                {profile.total_requests}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <span className="text-[11px] text-[var(--muted)] uppercase font-semibold">Blocked Hits</span>
              <div className="text-xl font-bold font-mono text-[#E5656F] mt-0.5">
                {profile.blocked_count}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <span className="text-[11px] text-[var(--muted)] uppercase font-semibold">Bot Probability</span>
              <div className="text-xl font-bold font-mono text-[var(--accent)] mt-0.5">
                {Math.round(profile.bot_likelihood * 100)}%
              </div>
            </div>
          </div>

          {/* Endpoints Targeted */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">
              Endpoints Targeted
            </div>
            <div className="space-y-1.5">
              {profile.top_endpoints?.map((ep: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs font-mono"
                >
                  <span className="text-[var(--text)] truncate">{ep.path}</span>
                  <span className="text-[var(--muted)]">{ep.hits} hits</span>
                </div>
              ))}
            </div>
          </div>

          {/* Analyst Notes */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Forensic Notes & Tags
            </div>
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add analyst note or tagging..."
                className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text)] focus:outline-none"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-medium hover:brightness-110"
              >
                Add
              </button>
            </form>
            <div className="space-y-2">
              {profile.notes?.map((n: any) => (
                <div key={n.id} className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs">
                  <div className="flex items-center justify-between text-[11px] text-[var(--muted)] mb-1">
                    <span className="font-semibold text-[var(--text)]">{n.author}</span>
                    <span>{new Date(n.created_at * 1000).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[var(--text)]">{n.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--border)] flex items-center justify-end gap-3 bg-[var(--surface)]">
          <button
            onClick={handleAllow}
            className="px-4 py-2 rounded-xl bg-[#3FB68B]/10 hover:bg-[#3FB68B]/20 text-[#3FB68B] border border-[#3FB68B]/30 text-xs font-medium transition-all"
          >
            Allowlist Client
          </button>
          <button
            onClick={handleBan}
            className="px-4 py-2 rounded-xl bg-[#E5656F]/10 hover:bg-[#E5656F]/20 text-[#E5656F] border border-[#E5656F]/30 text-xs font-medium transition-all"
          >
            Ban IP (24 Hours)
          </button>
        </div>
      </div>
    </div>
  );
}
