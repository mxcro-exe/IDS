import React, { useState, useEffect } from 'react';
import {
  Network,
  Shield,
  ShieldAlert,
  ShieldOff,
  Upload,
  Search,
  CheckCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Ghost,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface EndpointItem {
  id: number;
  method: string;
  path: string;
  normalized_path: string;
  request_count: number;
  attack_count: number;
  attack_rate: number;
  avg_latency: number;
  risk_score: number;
  auth_required: boolean;
  is_shadow: boolean;
  is_protected: boolean;
}

export function EndpointsView({ lang = 'en' }: { lang?: 'en' | 'ta' }) {
  const [endpoints, setEndpoints] = useState<EndpointItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [specInput, setSpecInput] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const fetchEndpoints = async () => {
    try {
      const res = await fetch('/api/endpoints');
      if (res.ok) {
        const json = await res.json();
        setEndpoints(json.endpoints || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEndpoints();
  }, []);

  const handleToggleProtection = async (id: number, currentProtected: boolean) => {
    try {
      const res = await fetch(`/api/endpoints/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_protected: !currentProtected }),
      });
      if (res.ok) {
        setEndpoints(
          endpoints.map((ep) => (ep.id === id ? { ...ep, is_protected: !currentProtected } : ep))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportOpenAPI = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(specInput);
      const res = await fetch('/api/endpoints/import-openapi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      if (res.ok) {
        const json = await res.json();
        setImportStatus(`Imported ${json.imported_routes} routes. Shadow endpoints flagged: ${json.shadow_endpoints_flagged}`);
        fetchEndpoints();
        setTimeout(() => {
          setImportModalOpen(false);
          setImportStatus(null);
          setSpecInput('');
        }, 2000);
      }
    } catch (err: any) {
      setImportStatus(`Invalid OpenAPI JSON spec: ${err.message}`);
    }
  };

  const filtered = endpoints.filter(
    (ep) =>
      ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.method.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const methodColors: Record<string, string> = {
    GET: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    POST: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    PUT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    DELETE: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  return (
    <div className="space-y-6">
      {/* Header & OpenAPI Import */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">
            <Network className="w-5 h-5 text-[var(--accent)]" />
            <span>{lang === 'ta' ? 'API பாதைகள் மற்றும் ஆபத்து வரைபடம்' : 'API Discovery & Endpoint Risk Map'}</span>
          </h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            {lang === 'ta'
              ? 'நிகழ்நேர போக்குவரத்து மூலம் தானாக கண்டறியப்பட்ட API பாதைகள்'
              : 'Auto-discovered routes from live traffic, shadow APIs detection, and per-endpoint protection status.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search route or method..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-[var(--surface-solid)] border border-[var(--border)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)] w-56"
            />
          </div>

          <button
            onClick={() => setImportModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-[var(--accent)] hover:brightness-110 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import OpenAPI</span>
          </button>
        </div>
      </div>

      {/* Risk Heatmap Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard className="p-4" glow="none">
          <div className="text-[11px] font-semibold text-[var(--muted)] uppercase">Discovered Endpoints</div>
          <div className="text-2xl font-bold font-mono text-[var(--text)] mt-1">{endpoints.length}</div>
        </GlassCard>

        <GlassCard className="p-4" glow="none">
          <div className="text-[11px] font-semibold text-[var(--muted)] uppercase">Shadow APIs</div>
          <div className="text-2xl font-bold font-mono text-[#D9A441] mt-1">
            {endpoints.filter((e) => e.is_shadow).length}
          </div>
        </GlassCard>

        <GlassCard className="p-4" glow="none">
          <div className="text-[11px] font-semibold text-[var(--muted)] uppercase">Unprotected Routes</div>
          <div className="text-2xl font-bold font-mono text-[#E5656F] mt-1">
            {endpoints.filter((e) => !e.is_protected).length}
          </div>
        </GlassCard>

        <GlassCard className="p-4" glow="none">
          <div className="text-[11px] font-semibold text-[var(--muted)] uppercase">Authenticated Routes</div>
          <div className="text-2xl font-bold font-mono text-[#3FB68B] mt-1">
            {endpoints.filter((e) => e.auth_required).length}
          </div>
        </GlassCard>
      </div>

      {/* Endpoints Table */}
      <GlassCard className="overflow-hidden p-0" glow="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] uppercase font-semibold">
                <th className="p-3.5">Method</th>
                <th className="p-3.5">Normalized Path</th>
                <th className="p-3.5">Requests</th>
                <th className="p-3.5">Attack Rate</th>
                <th className="p-3.5">Avg Latency</th>
                <th className="p-3.5">Attributes</th>
                <th className="p-3.5 text-right">Protection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((ep) => {
                const methodBadge = methodColors[ep.method] || 'bg-white/5 text-[var(--muted)]';
                const riskColor =
                  ep.risk_score > 60 ? 'text-[#E5656F]' :
                  ep.risk_score > 30 ? 'text-[#D9A441]' : 'text-[#3FB68B]';

                return (
                  <tr key={ep.id} className="hover:bg-white/[0.02] transition-colors font-mono">
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${methodBadge}`}>
                        {ep.method}
                      </span>
                    </td>
                    <td className="p-3.5 text-[var(--text)] font-semibold">{ep.normalized_path}</td>
                    <td className="p-3.5 text-[var(--muted)]">{ep.request_count.toLocaleString()}</td>
                    <td className="p-3.5">
                      <span className={`font-semibold ${riskColor}`}>{ep.attack_rate}%</span>
                    </td>
                    <td className="p-3.5 text-[var(--muted)]">{ep.avg_latency} ms</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        {ep.is_shadow && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 flex items-center gap-1">
                            <Ghost className="w-2.5 h-2.5" />
                            <span>Shadow</span>
                          </span>
                        )}
                        {ep.auth_required ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Auth</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-[var(--muted)] border border-[var(--border)] flex items-center gap-1">
                            <Unlock className="w-2.5 h-2.5" />
                            <span>Public</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleToggleProtection(ep.id, ep.is_protected)}
                        className={`px-3 py-1 rounded-lg text-xs font-sans font-medium transition-all ${
                          ep.is_protected
                            ? 'bg-[#3FB68B]/10 hover:bg-[#3FB68B]/20 text-[#3FB68B] border border-[#3FB68B]/30'
                            : 'bg-[#E5656F]/10 hover:bg-[#E5656F]/20 text-[#E5656F] border border-[#E5656F]/30'
                        }`}
                      >
                        {ep.is_protected ? 'Protected' : 'Disabled'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* OpenAPI Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xl bg-[var(--surface-solid)] border border-[var(--border)] rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-semibold text-base text-[var(--text)] flex items-center gap-2">
              <Upload className="w-4 h-4 text-[var(--accent)]" />
              <span>Import OpenAPI / Swagger Schema</span>
            </h3>
            <p className="text-xs text-[var(--muted)]">
              Paste your OpenAPI JSON specification to register verified endpoints and automatically flag shadow APIs.
            </p>
            <form onSubmit={handleImportOpenAPI} className="space-y-4">
              <textarea
                rows={8}
                value={specInput}
                onChange={(e) => setSpecInput(e.target.value)}
                placeholder='{"openapi": "3.0.0", "paths": { "/api/users": { "get": {} } }}'
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl p-3 font-mono text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
              />
              {importStatus && (
                <div className="p-3 rounded-lg bg-[var(--surface)] text-xs text-[var(--text)] font-mono">
                  {importStatus}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--muted)] hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-medium hover:brightness-110"
                >
                  Verify & Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
