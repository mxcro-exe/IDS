import React, { useState, useEffect } from 'react';
import {
  Brain,
  Search,
  Download,
  BookOpen,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Filter,
  Layers,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { sound } from '../../utils/soundFx';

interface CopilotKnowledgeViewProps {
  lang?: 'en' | 'ta';
}

const CATEGORY_LABELS: Record<string, string> = {
  greetings: 'Greetings & Farewells',
  small_talk: 'Small Talk & Mood',
  identity: 'Bot Persona & Creator',
  thanks_apology: 'Thanks & Courtesies',
  help_capabilities: 'Help & Guidance',
  jokes_fun: 'Jokes & Motivation',
  feedback_handling: 'Feedback & Civility',
  time_date: 'Time, Date & Calendar',
  utilities: 'Calculators & Math',
  flow_control: 'Confirmations & Flow',
  ui_meta: 'Chat & UI Commands',
  wishes: 'Festivals & Wishes',
  preferences: 'AI Preferences',
  productivity: 'Productivity Tips',
  security_awareness: 'General Cyber Hygiene',
  architecture: 'Architecture & Tech Stack',
  attack_types: 'Attack Types (OWASP)',
  detection_modules: '23 Security Modules',
  risk_scoring: 'Risk Scoring & Modes',
  rate_honeypot: 'Rate Limiter & Honeypots',
  dashboard_pages: 'SOC Dashboard Navigation',
  telegram_bot: 'Telegram Bot Operations',
  simulator_evasion: 'Simulator & Evasion Lab',
  machine_learning: 'ML Classifier & Metrics',
  setup_operations: 'Setup, Docker & Ports',
  troubleshooting: 'Troubleshooting & FAQ',
  concepts_comparison: 'Security Concepts & Comparisons',
};

export const CopilotKnowledgeView: React.FC<CopilotKnowledgeViewProps> = ({ lang = 'en' }) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'learning'>('catalog');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'general' | 'project'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [intents, setIntents] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(3000);
  const [unanswered, setUnanswered] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    setPage(1);
  }, [search, sourceFilter, categoryFilter]);

  useEffect(() => {
    fetchIntents();
  }, [search, sourceFilter, categoryFilter, page]);

  useEffect(() => {
    fetchUnanswered();
  }, []);

  const fetchIntents = async () => {
    setIsLoading(true);
    try {
      const src = sourceFilter === 'all' ? '' : `&source=${sourceFilter}`;
      const cat = categoryFilter === 'all' ? '' : `&category=${categoryFilter}`;
      const q = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : '';
      const offset = (page - 1) * pageSize;
      const res = await fetch(`/api/copilot/intents?limit=${pageSize}&offset=${offset}${src}${cat}${q}`);
      const data = await res.json();
      if (data.intents) {
        setIntents(data.intents);
        setTotalCount(data.total);
      }
    } catch (e) {
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnanswered = async () => {
    try {
      const res = await fetch('/api/copilot/unanswered');
      const data = await res.json();
      if (Array.isArray(data)) {
        setUnanswered(data);
      }
    } catch (e) {}
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    sound.playClick();
    setTimeout(() => setCopiedId(null), 1800);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-5 font-sans">
      {/* 1. Header & Summary Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
              <Brain className="w-4 h-4" />
            </span>
            <h2 className="text-base font-semibold text-[var(--text)]">
              {lang === 'ta' ? 'Copilot அறிவு தளம் & தொடர் கற்றல்' : 'Copilot Knowledge Base'}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
              3,000 Intents
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-1">
            {lang === 'ta'
              ? 'உள்ளமைக்கப்பட்ட ஆஃப்லைன் கட்டளைகள், திட்ட வினா-விடைகள், மற்றும் கிளவுட் AI கற்றல் வரலாறு.'
              : 'Built-in offline commands, AegisGate SOC architecture Q&As, and Gemini fall-through learning loop.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Learning Loop Toggle */}
          <button
            onClick={() => {
              setActiveTab((prev) => (prev === 'catalog' ? 'learning' : 'catalog'));
              sound.playClick();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
              activeTab === 'learning'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-xs'
                : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:text-[var(--text)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Learning Loop</span>
            {unanswered.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-purple-500/30 text-purple-200">
                {unanswered.length}
              </span>
            )}
          </button>

          {/* Export JSON */}
          <button
            onClick={() => {
              window.open('/api/copilot/export', '_blank');
              sound.playClick();
            }}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)] text-xs text-[var(--text)] flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* 2. Compact Metric Highlights (Single Sleek Bar) */}
      <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            <span className="text-[var(--muted)]">Total Intents:</span>
            <span className="font-mono font-semibold text-[var(--text)]">3,000</span>
          </div>
          <span className="text-[var(--border)] hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-[var(--muted)]">General Commands:</span>
            <span className="font-mono font-semibold text-cyan-400">2,000</span>
          </div>
          <span className="text-[var(--border)] hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[var(--muted)]">Project Q&A:</span>
            <span className="font-mono font-semibold text-emerald-400">1,000</span>
          </div>
          <span className="text-[var(--border)] hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="text-[var(--muted)]">Indexed Patterns:</span>
            <span className="font-mono font-semibold text-purple-400">54,072</span>
          </div>
        </div>
        <div className="text-[11px] font-mono text-[var(--status-allow)] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-allow)] animate-pulse" />
          <span>Offline Latency: &lt; 2 ms</span>
        </div>
      </div>

      {/* TAB 1: INTENT CATALOG */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Search & Filter Controls */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search intents, questions, patterns..."
                className="w-full bg-[var(--surface-solid)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2 text-[10px] text-[var(--muted)] hover:text-[var(--text)]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Group: Source & Category */}
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              {/* Source Switcher */}
              <div className="flex items-center p-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[11px]">
                {(['all', 'general', 'project'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSourceFilter(s);
                      sound.playClick();
                    }}
                    className={`px-2.5 py-1 rounded-md capitalize font-medium transition-all ${
                      sourceFilter === s
                        ? 'bg-[var(--accent)] text-white shadow-xs'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {s === 'all' ? 'All (3k)' : s === 'general' ? 'General (2k)' : 'Project (1k)'}
                  </button>
                ))}
              </div>

              {/* Category Dropdown */}
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  sound.playClick();
                }}
                className="bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[var(--accent)] max-w-[200px]"
              >
                <option value="all">All Categories</option>
                {Object.entries(CATEGORY_LABELS).map(([catId, label]) => (
                  <option key={catId} value={catId}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Summary & Pagination Header */}
          <div className="flex items-center justify-between text-xs text-[var(--muted)] px-1">
            <span>
              Showing <strong className="text-[var(--text)]">{intents.length}</strong> of{' '}
              <strong className="text-[var(--text)]">{totalCount}</strong> matching intents
            </span>
            <span>
              Page <strong className="text-[var(--text)]">{page}</strong> of{' '}
              <strong className="text-[var(--text)]">{totalPages}</strong>
            </span>
          </div>

          {/* Simplified, Clean Cards List */}
          <div className="space-y-2.5">
            {isLoading ? (
              <div className="text-center py-12 text-xs text-[var(--muted)] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
                <span>Loading intents catalogue...</span>
              </div>
            ) : intents.length === 0 ? (
              <div className="text-center py-12 text-xs text-[var(--muted)] border border-dashed border-[var(--border)] rounded-xl">
                No matching intents found. Try adjusting your search query or category filter.
              </div>
            ) : (
              intents.map((item) => {
                const isExpanded = expandedId === item.id;
                const samplePattern =
                  item.patterns?.[lang]?.[0] ||
                  item.patterns?.en?.[0] ||
                  'No sample query available.';
                const sampleResponse =
                  item.responses?.[lang]?.[0] ||
                  item.responses?.en?.[0] ||
                  'No response text available.';
                const categoryName = CATEGORY_LABELS[item.category] || item.category;

                return (
                  <GlassCard
                    key={item.id}
                    className="p-3.5 border border-[var(--border)] bg-[var(--surface-solid)] space-y-2.5 hover:border-[var(--accent)]/40 transition-all rounded-xl shadow-xs"
                  >
                    {/* Row 1: Badges, Category, Language Pills & Action */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Category Badge */}
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] flex items-center gap-1">
                          <Layers className="w-3 h-3 text-[var(--accent)]" />
                          <span>{categoryName}</span>
                        </span>

                        {/* Source Tag */}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider ${
                            item.source_type === 'general'
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                          }`}
                        >
                          {item.source_type === 'general' ? 'General' : 'Project Q&A'}
                        </span>

                        {/* Intent ID */}
                        <span className="font-mono text-[11px] text-[var(--muted)]">
                          {item.id}
                        </span>
                      </div>

                      {/* Right: Languages & Action */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[10px] font-mono text-[var(--muted)] bg-[var(--surface)] px-2 py-0.5 rounded-md border border-[var(--border)]">
                          <span className={item.patterns?.en?.length ? 'text-[var(--accent)]' : ''}>EN</span>
                          <span>•</span>
                          <span className={item.patterns?.ta?.length ? 'text-amber-400' : ''}>தமிழ்</span>
                          <span>•</span>
                          <span className={item.patterns?.tanglish?.length ? 'text-cyan-400' : ''}>Tanglish</span>
                        </div>

                        {/* Copy Sample Prompt */}
                        <button
                          onClick={() => handleCopy(samplePattern, item.id)}
                          title="Copy sample prompt to test in Copilot"
                          className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5 transition-colors border border-transparent hover:border-[var(--border)]"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-[var(--status-allow)]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Clean Representative Query */}
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-mono uppercase text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded mt-0.5 shrink-0">
                        Ask
                      </span>
                      <p className="text-xs font-semibold text-[var(--text)]">
                        "{samplePattern}"
                      </p>
                    </div>

                    {/* Row 3: Clean Conversational Response Preview */}
                    <div className="text-xs text-[var(--muted)] leading-relaxed pl-7 border-l-2 border-[var(--border)]">
                      {sampleResponse}
                    </div>

                    {/* Row 4: Expand/Collapse Drawer for Deep Technical Details */}
                    <div className="pt-1 flex items-center justify-between border-t border-[var(--border)]/60 text-[11px]">
                      <button
                        onClick={() => {
                          setExpandedId((prev) => (prev === item.id ? null : item.id));
                          sound.playClick();
                        }}
                        className="text-[var(--accent)] hover:underline inline-flex items-center gap-1 font-medium"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Hide variations ({item.patterns?.en?.length + item.patterns?.ta?.length + item.patterns?.tanglish?.length} patterns)</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>View variations & responses</span>
                          </>
                        )}
                      </button>

                      {item.chips && item.chips.length > 0 && (
                        <div className="flex items-center gap-1 overflow-hidden max-w-[50%]">
                          <span className="text-[10px] text-[var(--muted)]">Chips:</span>
                          {item.chips.slice(0, 2).map((c: string, idx: number) => (
                            <span key={idx} className="px-1.5 py-0.2 rounded text-[10px] bg-white/5 text-[var(--muted)] border border-[var(--border)] truncate">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Expanded Drawer */}
                    {isExpanded && (
                      <div className="p-3 rounded-lg bg-[var(--surface)]/80 border border-[var(--border)] space-y-3 text-xs mt-2">
                        {/* English Variations */}
                        {item.patterns?.en && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono text-[var(--accent)] font-semibold uppercase">
                              English Patterns ({item.patterns.en.length}):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {item.patterns.en.map((p: string, idx: number) => (
                                <span key={idx} className="px-2 py-0.5 rounded bg-[var(--surface-solid)] border border-[var(--border)] text-[11px] text-[var(--text)] font-sans">
                                  "{p}"
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tamil Variations */}
                        {item.patterns?.ta && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono text-amber-400 font-semibold uppercase">
                              தமிழ் முறைகள் ({item.patterns.ta.length}):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {item.patterns.ta.map((p: string, idx: number) => (
                                <span key={idx} className="px-2 py-0.5 rounded bg-[var(--surface-solid)] border border-[var(--border)] text-[11px] text-[var(--text)] font-sans">
                                  "{p}"
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tanglish Variations */}
                        {item.patterns?.tanglish && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono text-cyan-400 font-semibold uppercase">
                              Tanglish Patterns ({item.patterns.tanglish.length}):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {item.patterns.tanglish.map((p: string, idx: number) => (
                                <span key={idx} className="px-2 py-0.5 rounded bg-[var(--surface-solid)] border border-[var(--border)] text-[11px] text-[var(--text)] font-sans">
                                  "{p}"
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Alternative Responses */}
                        <div className="space-y-1 pt-2 border-t border-[var(--border)]">
                          <span className="text-[10px] font-mono text-[var(--muted)] font-semibold uppercase">
                            Response Variations:
                          </span>
                          <div className="space-y-1 text-[11px] text-[var(--muted)]">
                            {item.responses?.en?.map((r: string, idx: number) => (
                              <div key={idx} className="p-1.5 rounded bg-white/5 border border-[var(--border)]/50">
                                <strong className="text-[var(--text)]">EN [{idx + 1}]:</strong> {r}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </GlassCard>
                );
              })
            )}
          </div>

          {/* Clean Pagination Bar */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] text-xs">
              <button
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  sound.playClick();
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  page <= 1
                    ? 'opacity-40 cursor-not-allowed border-[var(--border)] text-[var(--muted)]'
                    : 'border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--text)] bg-[var(--surface)]'
                }`}
              >
                ← Previous Page
              </button>

              <div className="flex items-center gap-1 font-mono text-xs text-[var(--muted)]">
                <span>Page</span>
                <strong className="text-[var(--accent)]">{page}</strong>
                <span>of</span>
                <strong>{totalPages}</strong>
              </div>

              <button
                disabled={page >= totalPages}
                onClick={() => {
                  setPage((p) => Math.min(totalPages, p + 1));
                  sound.playClick();
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  page >= totalPages
                    ? 'opacity-40 cursor-not-allowed border-[var(--border)] text-[var(--muted)]'
                    : 'border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--text)] bg-[var(--surface)]'
                }`}
              >
                Next Page →
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CONTINUOUS LEARNING LOOP */}
      {activeTab === 'learning' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] text-xs text-[var(--muted)] space-y-1">
            <div className="font-semibold text-[var(--text)] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Gemini Fall-through Learning Loop</span>
            </div>
            <p>
              When a user asks questions not covered by the 3,000 built-in offline intents, they route to the Gemini Cloud AI. Repeated queries are audited below and can be promoted to become permanent offline intents.
            </p>
          </div>

          <div className="space-y-2.5">
            {unanswered.length === 0 ? (
              <div className="text-center py-12 text-xs text-[var(--muted)] border border-dashed border-[var(--border)] rounded-xl">
                <ShieldCheck className="w-8 h-8 text-[var(--status-allow)] mx-auto mb-2 opacity-60" />
                <p>No unanswered queries logged yet.</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">
                  All requests have been successfully serviced by the built-in 3,000 intent library!
                </p>
              </div>
            ) : (
              unanswered.map((u, idx) => (
                <GlassCard
                  key={idx}
                  className="p-3.5 border border-[var(--border)] bg-[var(--surface-solid)] flex items-center justify-between gap-3 rounded-xl"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-[var(--text)]">
                      "{u.query}"
                    </div>
                    <div className="text-[10px] font-mono text-[var(--muted)] flex items-center gap-2">
                      <span>Language: <strong className="text-[var(--text)]">{u.lang || 'en'}</strong></span>
                      <span>•</span>
                      <span>Frequency: <strong className="text-[var(--accent)]">{u.count || 1} times</strong></span>
                      <span>•</span>
                      <span>Logged: {u.timestamp ? new Date(u.timestamp).toLocaleTimeString() : 'Recent'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      alert(`Promote query "${u.query}" into offline knowledge base.`);
                      sound.playClick();
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs border border-[var(--accent)]/40 bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all flex items-center gap-1.5 font-medium shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Promote Intent</span>
                  </button>
                </GlassCard>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
