import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Activity,
  Bell,
  Radio,
  Zap,
  Layers,
  FileText,
  Sliders,
  Shield,
  Sun,
  Download,
  Command,
  Network,
  Code,
  Cpu,
  ShieldAlert,
  History,
  Compass,
  PlaySquare,
  Brain,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tabId: string) => void;
  onToggleTheme: () => void;
  onAction?: (actionId: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onToggleTheme,
  onAction,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = [
    { id: 'tab-overview', label: 'Go to Overview Dashboard & Health Score', icon: <Activity className="w-4 h-4 text-[var(--accent)]" />, group: 'Navigation', action: () => onNavigate('overview') },
    { id: 'tab-alerts', label: 'View Incident Alerts Stream', icon: <Bell className="w-4 h-4 text-[var(--status-warn)]" />, group: 'Navigation', action: () => onNavigate('alerts') },
    { id: 'tab-incidents', label: 'Incidents & Attack Kill-Chain Timelines', icon: <ShieldAlert className="w-4 h-4 text-[var(--status-block)]" />, group: 'Navigation', action: () => onNavigate('incidents') },
    { id: 'tab-endpoints', label: 'API Discovery & Endpoint Risk Map', icon: <Network className="w-4 h-4 text-[var(--accent)]" />, group: 'Navigation', action: () => onNavigate('endpoints') },
    { id: 'tab-reports', label: 'Generate IEEE PDF Dossier & Reports', icon: <FileText className="w-4 h-4 text-[var(--muted)]" />, group: 'Navigation', action: () => onNavigate('reports') },
    { id: 'tab-models', label: 'AI Model Performance & Safe Retraining', icon: <Cpu className="w-4 h-4 text-[var(--accent)]" />, group: 'Navigation', action: () => onNavigate('models') },
    { id: 'tab-settings', label: 'Gateway Settings & Configuration', icon: <Sliders className="w-4 h-4 text-[var(--muted)]" />, group: 'Settings', action: () => onNavigate('settings') },
    { id: 'tab-radar', label: 'Settings > Threat Perimeter Radar', icon: <Radio className="w-4 h-4 text-[var(--accent)]" />, group: 'Settings', action: () => onNavigate('radar') },
    { id: 'tab-rules', label: 'Settings > Custom Security Rules', icon: <Code className="w-4 h-4 text-[var(--status-warn)]" />, group: 'Settings', action: () => onNavigate('rules') },
    { id: 'tab-simulator', label: 'Settings > Attack Simulator (Red vs Blue)', icon: <Zap className="w-4 h-4 text-[var(--status-block)]" />, group: 'Settings', action: () => onNavigate('simulator') },
    { id: 'tab-knowledge', label: 'Settings > Copilot Knowledge Base (3,000 Intents)', icon: <Brain className="w-4 h-4 text-purple-400" />, group: 'Settings', action: () => onNavigate('knowledge') },
    { id: 'act-wizard', label: 'Launch Guided Setup Wizard', icon: <Compass className="w-4 h-4 text-[var(--accent)]" />, group: 'Operations', action: () => onAction?.('setup-wizard') },
    { id: 'act-tour', label: 'Start 60-Second Product Spotlight Tour', icon: <Compass className="w-4 h-4 text-[var(--status-warn)]" />, group: 'Operations', action: () => onAction?.('product-tour') },
    { id: 'act-audit', label: 'Inspect Tamper-Evident Audit Ledger', icon: <History className="w-4 h-4 text-[var(--muted)]" />, group: 'Operations', action: () => onAction?.('audit-log') },
    { id: 'act-theme', label: 'Toggle Theme (Light / Dark)', icon: <Sun className="w-4 h-4 text-[var(--status-warn)]" />, group: 'Action', action: onToggleTheme },
    { id: 'act-unban', label: 'Unban Local Client IP (127.0.0.1)', icon: <Shield className="w-4 h-4 text-[var(--status-allow)]" />, group: 'Action', action: () => onAction?.('unban') },
    { id: 'act-pdf', label: 'Download IEEE Academic PDF Report', icon: <Download className="w-4 h-4 text-[var(--accent)]" />, group: 'Action', action: () => window.open('/api/export/pdf', '_blank') },
  ];

  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose();
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(filtered.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(filtered.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filtered, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-[999999] flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm cursor-pointer"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.98, y: -15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] shadow-2xl overflow-hidden font-sans cursor-default"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
              <Search className="w-4 h-4 text-[var(--muted)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Type a command or jump to page... (e.g. radar, unban, pdf)"
                className="w-full bg-transparent text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none font-sans"
              />
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--muted)]">
                ESC
              </span>
            </div>

            {/* List */}
            <div className="max-h-72 overflow-y-auto p-2 space-y-0.5">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-xs font-sans text-[var(--muted)]">
                  No commands matching "{query}"
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        item.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs font-sans transition-colors ${
                        isSelected
                          ? 'bg-[var(--accent)] text-white font-medium'
                          : 'text-[var(--text)] hover:bg-[var(--surface)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      <span className={`text-[10px] font-mono uppercase tracking-wider ${
                        isSelected ? 'text-white/70' : 'text-[var(--muted)]'
                      }`}>
                        {item.group}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-[var(--muted)]">
              <div className="flex items-center gap-2">
                <span>&uarr;&darr; Navigate</span>
                <span>&bull;</span>
                <span>&crarr; Select</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Command className="w-3 h-3" />
                <span>Command Palette</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
