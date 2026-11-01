import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  ShieldAlert,
  Play,
  Pause,
  RotateCcw,
  Download,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  FileText,
  Send,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface IncidentEvent {
  id: number;
  stage: string;
  timestamp: number;
  details_obj: any;
}

interface IncidentItem {
  id: number;
  title: string;
  client_ip: string;
  attack_type: string;
  severity: string;
  status: string;
  assignee: string;
  created_at: number;
  updated_at: number;
  event_count?: number;
  events?: IncidentEvent[];
  story_summary?: string;
  notes?: any[];
}

interface IncidentsViewProps {
  lang?: 'en' | 'ta';
}

export function IncidentsView({ lang = 'en' }: IncidentsViewProps) {
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [newNote, setNewNote] = useState<string>('');

  // Replay animation state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeEventIndex, setActiveEventIndex] = useState<number>(0);
  const [playSpeed, setPlaySpeed] = useState<number>(1);

  const fetchIncidents = async () => {
    try {
      const url = statusFilter === 'all' ? '/api/incidents' : `/api/incidents?status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setIncidents(json.incidents || []);
        if (json.incidents?.length > 0 && !selectedIncident) {
          loadIncidentDetails(json.incidents[0].id);
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const loadIncidentDetails = async (id: number) => {
    try {
      const res = await fetch(`/api/incidents/${id}`);
      if (res.ok) {
        const json = await res.json();
        setSelectedIncident(json);
        setActiveEventIndex(0);
        setIsPlaying(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter]);

  // Replay ticker
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && selectedIncident?.events) {
      timer = setInterval(() => {
        setActiveEventIndex((prev) => {
          if (prev >= (selectedIncident.events?.length || 1) - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500 / playSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, selectedIncident, playSpeed]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedIncident) return;
    try {
      const res = await fetch(`/api/incidents/${selectedIncident.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setSelectedIncident({ ...selectedIncident, status: newStatus });
        fetchIncidents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !newNote.trim()) return;
    try {
      const res = await fetch(`/api/incidents/${selectedIncident.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote }),
      });
      if (res.ok) {
        const json = await res.json();
        setSelectedIncident({
          ...selectedIncident,
          notes: [json.note, ...(selectedIncident.notes || [])],
        });
        setNewNote('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const stageColors: Record<string, string> = {
    recon: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    probing: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    exploit: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    evasion: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    blocked: 'bg-[#E5656F]/10 text-[#E5656F] border-[#E5656F]/20',
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-[var(--accent)]" />
            <span>{lang === 'ta' ? 'அச்சுறுத்தல் சம்பவ மேலாண்மை' : 'Incident Management & Kill-Chain'}</span>
          </h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            {lang === 'ta'
              ? 'தாக்குதல் வடிவங்களை ஒருங்கிணைத்து முழு வாழ்க்கை சுழற்சியையும் கண்காணிக்கவும்'
              : 'Auto-correlated threat campaigns mapped to MITRE kill-chain progression stages.'}
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex bg-[var(--surface-solid)] border border-[var(--border)] rounded-xl p-1 gap-1">
          {['all', 'open', 'investigating', 'resolved'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium capitalize transition-all ${
                statusFilter === st
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Incidents List & Kill-Chain Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Incident Cards Column */}
        <div className="lg:col-span-5 space-y-3">
          {incidents.map((inc) => {
            const isSelected = selectedIncident?.id === inc.id;
            const sevColor =
              inc.severity === 'critical' ? 'text-[#E5656F] bg-[#E5656F]/10 border-[#E5656F]/30' :
              inc.severity === 'high' ? 'text-[#D9A441] bg-[#D9A441]/10 border-[#D9A441]/30' :
              'text-[#3FB68B] bg-[#3FB68B]/10 border-[#3FB68B]/30';

            return (
              <GlassCard
                key={inc.id}
                onClick={() => loadIncidentDetails(inc.id)}
                className={`p-4 cursor-pointer transition-all ${
                  isSelected ? 'border-[var(--accent)] bg-white/[0.06]' : 'hover:border-[var(--border-hover)]'
                }`}
                glow={isSelected ? 'default' : 'none'}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[var(--accent)]">
                        #{inc.id}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${sevColor}`}>
                        {inc.severity}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface-solid)] border border-[var(--border)] text-[var(--muted)] font-mono">
                        {inc.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-[var(--text)] line-clamp-1">{inc.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                      <span className="font-mono">{inc.client_ip}</span>
                      <span>•</span>
                      <span>{inc.event_count || 4} events</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--muted)] mt-1 flex-shrink-0" />
                </div>
              </GlassCard>
            );
          })}
        </div>

        {/* Right: Selected Incident Kill-Chain Timeline */}
        <div className="lg:col-span-7">
          {selectedIncident ? (
            <GlassCard className="p-6 space-y-6" glow="none">
              {/* Incident Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border)] gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-[var(--accent)] font-bold">#{selectedIncident.id}</span>
                    <span className="text-xs text-[var(--muted)] font-mono">Client: {selectedIncident.client_ip}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text)]">{selectedIncident.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Dropdown */}
                  <select
                    value={selectedIncident.status}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    className="bg-[var(--surface-solid)] border border-[var(--border)] text-xs font-medium text-[var(--text)] rounded-lg px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="open">Open</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                    <option value="false_positive">False Positive</option>
                  </select>

                  {/* PDF Report Download */}
                  <a
                    href={`/api/incidents/${selectedIncident.id}/pdf`}
                    download
                    className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-solid)] hover:bg-white/10 text-[var(--text)] transition-colors flex items-center gap-1.5 text-xs font-medium"
                    title="Export Forensic PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </a>
                </div>
              </div>

              {/* Story Summary Sentence */}
              <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Story Summary</span>
                </div>
                <p className="text-xs text-[var(--text)] leading-relaxed">
                  {selectedIncident.story_summary || 'Autonomous attack correlation generated from sensor events.'}
                </p>
              </div>

              {/* Kill-Chain Progression Timeline & Replay */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Kill-Chain Stage Progression
                  </span>

                  {/* Replay Controls */}
                  <div className="flex items-center gap-2 bg-[var(--surface-solid)] border border-[var(--border)] rounded-lg px-2 py-1">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="p-1 rounded text-[var(--accent)] hover:bg-white/5"
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setActiveEventIndex(0);
                      }}
                      className="p-1 rounded text-[var(--muted)] hover:text-[var(--text)]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] text-[var(--muted)] font-mono ml-1">
                      {activeEventIndex + 1}/{selectedIncident.events?.length || 1}
                    </span>
                  </div>
                </div>

                {/* Vertical Timeline */}
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--border)]">
                  {selectedIncident.events?.map((ev, idx) => {
                    const isActive = idx === activeEventIndex;
                    const stageBadge = stageColors[ev.stage] || stageColors.exploit;
                    return (
                      <div
                        key={ev.id}
                        onClick={() => setActiveEventIndex(idx)}
                        className={`relative p-3 rounded-xl border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[var(--surface-solid)] border-[var(--accent)] shadow-md'
                            : 'bg-[var(--surface)] border-[var(--border)] opacity-80 hover:opacity-100'
                        }`}
                      >
                        {/* Timeline Dot */}
                        <div
                          className={`absolute -left-[27px] top-3.5 w-3 h-3 rounded-full border-2 ${
                            isActive
                              ? 'bg-[var(--accent)] border-white scale-125'
                              : 'bg-[var(--surface-solid)] border-[var(--border)]'
                          } transition-transform`}
                        />

                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${stageBadge}`}>
                              {ev.stage}
                            </span>
                            <span className="font-semibold text-xs text-[var(--text)]">
                              {ev.details_obj?.attack_type?.replace(/_/g, ' ') || 'Event'}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-[var(--muted)]">
                            {new Date(ev.timestamp * 1000).toLocaleTimeString()}
                          </span>
                        </div>

                        {ev.details_obj?.raw_payload && (
                          <pre className="mt-2 p-2 rounded bg-[var(--bg)] text-[11px] font-mono text-[var(--text)] overflow-x-auto whitespace-pre-wrap break-all">
                            {ev.details_obj.raw_payload}
                          </pre>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Analyst Notes Section */}
              <div className="pt-4 border-t border-[var(--border)] space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Analyst Notes & Actions
                </span>

                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add an investigation note or mitigation..."
                    className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-[var(--accent)] hover:brightness-110 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Post</span>
                  </button>
                </form>

                <div className="space-y-2">
                  {selectedIncident.notes?.map((n) => (
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
            </GlassCard>
          ) : (
            <GlassCard className="p-12 text-center text-[var(--muted)]" glow="none">
              <FolderKanban className="w-10 h-10 mx-auto mb-3 opacity-30 text-[var(--accent)]" />
              <p className="text-sm">Select an incident to view its kill-chain timeline.</p>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
