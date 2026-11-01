import React, { useState, useEffect } from 'react';
import {
  X,
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  Hash,
} from 'lucide-react';

interface AuditItem {
  id: number;
  timestamp: number;
  actor: string;
  action: string;
  target: string;
  details: any;
  prev_hash: string;
  current_hash: string;
}

export function AuditLogModal({ onClose, lang = 'en' }: { onClose: () => void; lang?: 'en' | 'ta' }) {
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/audit-log');
      if (res.ok) {
        const json = await res.json();
        setLogs(json.audit_log || []);
      }
      const vRes = await fetch('/api/audit-log/verify');
      if (vRes.ok) {
        const vJson = await vRes.json();
        setVerification(vJson);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.actor.toLowerCase().includes(search.toLowerCase()) ||
      (l.target && l.target.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-[var(--surface-solid)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] cursor-default"
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--surface-solid)] border border-[var(--border)]">
              <FileCheck className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[var(--text)] flex items-center gap-2">
                <span>{lang === 'ta' ? 'பாதுகாப்பு தணிக்கை பதிவு' : 'Tamper-Evident Audit Log'}</span>
                {verification?.valid ? (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#3FB68B]/10 text-[#3FB68B] border border-[#3FB68B]/30 font-mono font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>SHA-256 Chain Verified</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#E5656F]/10 text-[#E5656F] border border-[#E5656F]/30 font-mono font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Chain Broken</span>
                  </span>
                )}
              </h3>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Cryptographically hashed ledger verifying all administrative actions and bot operations.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-[var(--border)] bg-[var(--surface)]/50 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by action or actor..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[var(--surface-solid)] border border-[var(--border)] text-xs text-[var(--text)] focus:outline-none"
            />
          </div>

          <button
            onClick={fetchLogs}
            className="px-3.5 py-1.5 rounded-xl bg-[var(--surface-solid)] border border-[var(--border)] hover:bg-white/5 text-xs text-[var(--text)] flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-verify Chain</span>
          </button>
        </div>

        {/* Log Entries Table */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-3">
            {filtered.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-2 text-xs font-mono"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--accent)] font-sans">{log.action}</span>
                    <span className="text-[var(--muted)]">by</span>
                    <span className="text-[var(--text)] font-semibold">{log.actor}</span>
                  </div>
                  <span className="text-[var(--muted)]">
                    {new Date(log.timestamp * 1000).toLocaleString()}
                  </span>
                </div>

                {log.target && (
                  <div className="text-[11px] text-[var(--muted)]">
                    Target: <span className="text-[var(--text)]">{log.target}</span>
                  </div>
                )}

                {/* Hashes */}
                <div className="p-2 rounded bg-[var(--bg)] border border-[var(--border)] text-[10px] text-[var(--muted)] space-y-0.5">
                  <div className="truncate">Prev Hash: {log.prev_hash}</div>
                  <div className="truncate text-[var(--accent)]">Curr Hash: {log.current_hash}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
