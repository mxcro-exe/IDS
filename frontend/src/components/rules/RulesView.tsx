import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Plus,
  Play,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface ConditionItem {
  field: string;
  operator: string;
  value: string;
  negate?: boolean;
}

interface RuleItem {
  id: number;
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  conditions: {
    logic: string;
    items: ConditionItem[];
  };
  action: string;
  hit_count: number;
  last_triggered?: number;
}

export function RulesView({ lang = 'en' }: { lang?: 'en' | 'ta' }) {
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);

  // Form state
  const [ruleName, setRuleName] = useState<string>('');
  const [ruleDesc, setRuleDesc] = useState<string>('');
  const [priority, setPriority] = useState<number>(5);
  const [action, setAction] = useState<string>('BLOCK');
  const [logic, setLogic] = useState<string>('AND');
  const [conditions, setConditions] = useState<ConditionItem[]>([
    { field: 'path', operator: 'contains', value: '/admin' },
  ]);

  // Sandbox Test Box state
  const [testMethod, setTestMethod] = useState<string>('GET');
  const [testPath, setTestPath] = useState<string>('/admin/sensitive');
  const [testQuery, setTestQuery] = useState<string>('');
  const [testIp, setTestIp] = useState<string>('192.168.1.100');
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState<boolean>(false);

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/rules');
      if (res.ok) {
        const json = await res.json();
        setRules(json.rules || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggleRule = async (id: number, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/rules/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      if (res.ok) {
        setRules(rules.map((r) => (r.id === id ? { ...r, enabled: !currentEnabled } : r)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm('Are you sure you want to delete this custom rule?')) return;
    try {
      const res = await fetch(`/api/rules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRules(rules.filter((r) => r.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ruleName,
          description: ruleDesc,
          priority,
          action,
          conditions: { logic, items: conditions },
        }),
      });
      if (res.ok) {
        setCreateModalOpen(false);
        fetchRules();
        setRuleName('');
        setRuleDesc('');
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to create rule');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRunTest = async () => {
    setTestLoading(true);
    try {
      const res = await fetch('/api/rules/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: testMethod,
          path: testPath,
          query: testQuery,
          client_ip: testIp,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setTestResult(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTestLoading(false);
    }
  };

  const addCondition = () => {
    setConditions([...conditions, { field: 'path', operator: 'contains', value: '' }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[var(--accent)]" />
            <span>{lang === 'ta' ? 'தனிப்பயன் பாதுகாப்புக் கொள்கைகள்' : 'No-Code Custom Rule Builder'}</span>
          </h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            {lang === 'ta'
              ? 'ReDoS பாதுகாப்பான விதிகளுடன் நிகழ்நேர தடுப்பு கொள்கைகளை உருவாக்கவும்'
              : 'Create deterministic WAF-style rules with multi-condition matching, ReDoS protection, and priority evaluation.'}
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:brightness-110 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Rule</span>
        </button>
      </div>

      {/* Rules Grid */}
      <div className="space-y-3">
        {rules.map((r) => {
          const actionBadge =
            r.action === 'BLOCK' ? 'text-[#E5656F] bg-[#E5656F]/10 border-[#E5656F]/30' :
            r.action === 'WARN' ? 'text-[#D9A441] bg-[#D9A441]/10 border-[#D9A441]/30' :
            'text-[#3FB68B] bg-[#3FB68B]/10 border-[#3FB68B]/30';

          return (
            <GlassCard key={r.id} className="p-4" glow={r.enabled ? 'default' : 'none'}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--surface-solid)] border border-[var(--border)] text-[var(--muted)]">
                      Priority {r.priority}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${actionBadge}`}>
                      {r.action}
                    </span>
                    <h4 className="text-sm font-semibold text-[var(--text)]">{r.name}</h4>
                  </div>
                  {r.description && <p className="text-xs text-[var(--muted)]">{r.description}</p>}

                  {/* Conditions Preview */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {r.conditions?.items?.map((c, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-[var(--surface-solid)] border border-[var(--border)] text-[11px] font-mono text-[var(--muted)]"
                      >
                        {c.field} {c.operator} <span className="text-[var(--text)]">"{c.value}"</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Hits & Actions */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs font-mono font-semibold text-[var(--text)]">
                      {r.hit_count.toLocaleString()} hits
                    </span>
                    <div className="text-[10px] text-[var(--muted)]">
                      {r.last_triggered ? `Last: ${new Date(r.last_triggered * 1000).toLocaleTimeString()}` : 'Never fired'}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleRule(r.id, r.enabled)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      r.enabled
                        ? 'bg-[#3FB68B]/10 hover:bg-[#3FB68B]/20 text-[#3FB68B] border border-[#3FB68B]/30'
                        : 'bg-white/5 hover:bg-white/10 text-[var(--muted)] border border-[var(--border)]'
                    }`}
                  >
                    {r.enabled ? 'Active' : 'Disabled'}
                  </button>

                  <button
                    onClick={() => handleDeleteRule(r.id)}
                    className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[#E5656F] hover:bg-[#E5656F]/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Sandbox Test Box */}
      <GlassCard className="p-6 space-y-4" glow="none">
        <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          <span>Rule Evaluation Sandbox</span>
        </h3>
        <p className="text-xs text-[var(--muted)]">
          Simulate an incoming HTTP request against the active rule chain to preview matches without affecting live traffic.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] text-[var(--muted)] uppercase font-semibold">Method</label>
            <select
              value={testMethod}
              onChange={(e) => setTestMethod(e.target.value)}
              className="w-full mt-1 bg-[var(--surface-solid)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--text)] font-mono"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-[11px] text-[var(--muted)] uppercase font-semibold">Request Path</label>
            <input
              type="text"
              value={testPath}
              onChange={(e) => setTestPath(e.target.value)}
              className="w-full mt-1 bg-[var(--surface-solid)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--text)] font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] text-[var(--muted)] uppercase font-semibold">Client IP</label>
            <input
              type="text"
              value={testIp}
              onChange={(e) => setTestIp(e.target.value)}
              className="w-full mt-1 bg-[var(--surface-solid)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--text)] font-mono"
            />
          </div>
        </div>

        <button
          onClick={handleRunTest}
          disabled={testLoading}
          className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:brightness-110 text-white text-xs font-medium flex items-center gap-2 transition-all shadow-sm"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Evaluate Rules</span>
        </button>

        {testResult && (
          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-2 mt-4 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text)]">Evaluation Verdict:</span>
              {testResult.matched ? (
                <span className="px-2.5 py-0.5 rounded bg-[#E5656F]/10 text-[#E5656F] border border-[#E5656F]/30 font-bold">
                  Matched: {testResult.matched_rule?.name} ({testResult.matched_rule?.action})
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded bg-[#3FB68B]/10 text-[#3FB68B] border border-[#3FB68B]/30 font-bold">
                  No Rules Matched (Passed)
                </span>
              )}
            </div>
            <div className="text-[11px] text-[var(--muted)]">
              Evaluated {testResult.rules_evaluated} active rules in sequence.
            </div>
          </div>
        )}
      </GlassCard>

      {/* Create Rule Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xl bg-[var(--surface-solid)] border border-[var(--border)] rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-semibold text-base text-[var(--text)] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[var(--accent)]" />
              <span>Create Custom Perimeter Rule</span>
            </h3>

            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="text-xs text-[var(--muted)] font-medium">Rule Name</label>
                <input
                  type="text"
                  required
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g. Block SQL Comments in Search"
                  className="w-full mt-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--text)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--muted)] font-medium">Action</label>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="w-full mt-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--text)]"
                  >
                    <option value="BLOCK">BLOCK</option>
                    <option value="WARN">WARN</option>
                    <option value="ALLOW">ALLOW</option>
                    <option value="RATELIMIT">RATELIMIT</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)] font-medium">Priority (1 = Highest)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full mt-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--text)] font-mono"
                  />
                </div>
              </div>

              {/* Conditions List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-[var(--muted)] font-medium">Conditions (Logic: {logic})</label>
                  <button
                    type="button"
                    onClick={addCondition}
                    className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Condition</span>
                  </button>
                </div>

                {conditions.map((c, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select
                      value={c.field}
                      onChange={(e) => {
                        const copy = [...conditions];
                        copy[i].field = e.target.value;
                        setConditions(copy);
                      }}
                      className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2 text-xs text-[var(--text)] font-mono"
                    >
                      <option value="path">path</option>
                      <option value="method">method</option>
                      <option value="query">query</option>
                      <option value="ip">client_ip</option>
                      <option value="risk_score">risk_score</option>
                    </select>

                    <select
                      value={c.operator}
                      onChange={(e) => {
                        const copy = [...conditions];
                        copy[i].operator = e.target.value;
                        setConditions(copy);
                      }}
                      className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2 text-xs text-[var(--text)] font-mono"
                    >
                      <option value="equals">equals</option>
                      <option value="contains">contains</option>
                      <option value="startswith">startswith</option>
                      <option value="regex">regex</option>
                      <option value="in_cidr">in_cidr</option>
                    </select>

                    <input
                      type="text"
                      required
                      value={c.value}
                      onChange={(e) => {
                        const copy = [...conditions];
                        copy[i].value = e.target.value;
                        setConditions(copy);
                      }}
                      placeholder="value"
                      className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2 text-xs text-[var(--text)] font-mono"
                    />

                    {conditions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCondition(i)}
                        className="p-2 text-[var(--muted)] hover:text-[#E5656F]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--muted)] hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-medium hover:brightness-110"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
