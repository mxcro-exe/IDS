import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Bot,
  Sparkles,
  Zap,
  Cpu,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  Globe,
  Radio,
  ArrowUpRight,
  Shield,
} from 'lucide-react';
import { sound } from '../../utils/soundFx';

interface SecurityAssistantProps {
  currentLang?: string;
  onNavigateTab?: (tab: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
  badge?: 'Instant' | 'Gemini' | 'Offline';
  latency_ms?: number;
  step?: string;
  chips?: string[];
  action?: { open?: string } | null;
  feedback?: 'up' | 'down' | null;
}

export const SecurityAssistant: React.FC<SecurityAssistantProps> = ({
  currentLang = 'en',
  onNavigateTab,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // In-panel user settings
  const [allowCloudAi, setAllowCloudAi] = useState<boolean>(true);
  const [copilotLang, setCopilotLang] = useState<'auto' | 'en' | 'ta'>('auto');
  const [tone, setTone] = useState<'simple' | 'technical'>('technical');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initialGreeting =
    currentLang === 'ta'
      ? 'வணக்கம்! நான் உங்கள் AegisGate AI பாதுகாப்பு Copilot. அச்சுறுத்தல்கள், TreeSHAP விளக்கங்கள், நேரலை அளவீடுகள் அல்லது API விதிகள் பற்றி என்னிடம் கேளுங்கள்.'
      : 'Greetings! I am your AegisGate AI Security Copilot. Ask me about blocked threats, TreeSHAP attributions, live metrics, or custom mitigation rules.';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text: initialGreeting,
      time: 'Just now',
      badge: 'Instant',
      latency_ms: 0.1,
      chips: [
        '/status',
        'How many attacks blocked today?',
        'What is SQL injection?',
        'Explain 23 security features',
      ],
    },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendQuery = async (queryText: string) => {
    const text = queryText.trim();
    if (!text || isLoading) return;

    sound.playClick();
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const effectiveLang = copilotLang === 'auto' ? (currentLang === 'ta' ? 'ta' : undefined) : copilotLang;

    try {
      const res = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          lang: effectiveLang,
          allow_cloud_ai: allowCloudAi,
          session_id: 'soc_analyst_session',
        }),
      });

      if (!res.ok) throw new Error('API request failed');
      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: data.response || 'No response available.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        badge: data.badge || 'Instant',
        latency_ms: data.latency_ms || 1.2,
        step: data.step,
        chips: data.chips || [],
        action: data.action,
        feedback: null,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      sound.playAlert();
    } catch (err) {
      // Offline fallback when fetch fails
      const fallbackMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text:
          currentLang === 'ta'
            ? 'மன்னிக்கவும், தகவல் தொடர்பு பிழை. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.'
            : 'Connection anomaly detected. AegisGate local engine is active. Please retry with standard queries.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        badge: 'Offline',
        latency_ms: 0.0,
        chips: ['/status', 'How many attacks blocked today?'],
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    sound.playClick();
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleFeedback = (msgId: string, type: 'up' | 'down') => {
    sound.playClick();
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, feedback: m.feedback === type ? null : type } : m))
    );
  };

  const handleClearChat = () => {
    sound.playClick();
    setMessages([
      {
        id: `reset-${Date.now()}`,
        sender: 'assistant',
        text: currentLang === 'ta' ? 'அரட்டை வரலாறு அழிக்கப்பட்டது. நான் எவ்வாறு உதவட்டும்?' : 'Chat history cleared. How may I assist your telemetry inspection?',
        time: 'Just now',
        badge: 'Instant',
        chips: ['/status', 'Check health score', 'Show top attackers'],
      },
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[999998] font-sans">
      {/* Floating Action Trigger Button */}
      {!isOpen && (
        <motion.button
          onClick={() => {
            setIsOpen(true);
            sound.playClick();
          }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="px-4 py-2.5 rounded-full bg-[var(--accent)] text-white font-medium text-xs shadow-xl flex items-center gap-2 focus:outline-none border border-white/10 hover:brightness-110 transition-all"
        >
          <div className="relative">
            <Bot className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--status-allow)] animate-pulse" />
          </div>
          <span>AegisGate Copilot</span>
        </motion.button>
      )}

      {/* Slide-Up / Bottom-Sheet Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              backdropFilter: 'blur(36px)',
              WebkitBackdropFilter: 'blur(36px)',
            }}
            className="fixed inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t border-[var(--border)] lg:inset-auto lg:bottom-6 lg:right-6 lg:w-[420px] lg:h-[540px] lg:rounded-2xl lg:border border-[var(--border)] bg-[var(--surface-solid)]/98 shadow-2xl p-4 flex flex-col z-[999999]"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center border border-[var(--accent)]/20 shadow-inner">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-sans font-bold text-[var(--text)] leading-tight">
                      AegisGate Copilot
                    </h4>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold uppercase bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                      v2.0 AI
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--muted)] flex items-center gap-1.5 mt-0.5 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-allow)]" />
                    <span>3,000 Intents + Gemini</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Settings Toggle */}
                <button
                  onClick={() => setShowSettings((p) => !p)}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    showSettings
                      ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                      : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                  title="Copilot Settings"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* In-Panel Settings Drawer */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-[var(--border)] bg-[var(--surface)] p-3 space-y-2.5 text-xs font-sans"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--text)] font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      Allow Cloud AI (Gemini Fallback)
                    </span>
                    <input
                      type="checkbox"
                      checked={allowCloudAi}
                      onChange={(e) => setAllowCloudAi(e.target.checked)}
                      className="cursor-pointer accent-[var(--accent)]"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--muted)] flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      Copilot Language
                    </span>
                    <div className="flex items-center gap-1">
                      {(['auto', 'en', 'ta'] as const).map((l) => (
                        <button
                          key={l}
                          onClick={() => setCopilotLang(l)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${
                            copilotLang === l
                              ? 'bg-[var(--accent)] text-white border-transparent'
                              : 'border-[var(--border)] text-[var(--muted)]'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]/50">
                    <button
                      onClick={handleClearChat}
                      className="text-[10px] text-[var(--status-block)] hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Clear Chat History
                    </button>
                    <span className="text-[10px] font-mono text-[var(--muted)]">Privacy: Zero Payload Retention</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3.5 text-xs pr-1">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`p-3.5 rounded-2xl max-w-[88%] leading-relaxed shadow-sm transition-all ${
                      m.sender === 'user'
                        ? 'bg-[var(--accent)] text-white rounded-br-sm'
                        : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] rounded-bl-sm'
                    }`}
                  >
                    {/* Header Badge for Assistant Replies */}
                    {m.sender === 'assistant' && m.badge && (
                      <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-[var(--border)]/40 text-[9px] font-mono">
                        <span
                          className={`px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider flex items-center gap-1 ${
                            m.badge === 'Instant'
                              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                              : m.badge === 'Gemini'
                              ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {m.badge === 'Instant' && <Zap className="w-2.5 h-2.5" />}
                          {m.badge === 'Gemini' && <Sparkles className="w-2.5 h-2.5" />}
                          {m.badge === 'Offline' && <Radio className="w-2.5 h-2.5" />}
                          <span>{m.badge}</span>
                        </span>
                        {m.latency_ms !== undefined && (
                          <span className="text-[var(--muted)]">{m.latency_ms} ms</span>
                        )}
                      </div>
                    )}

                    {/* Text Message with markdown newlines */}
                    <p className="whitespace-pre-line leading-relaxed">{m.text}</p>

                    {/* Action Button if specified */}
                    {m.action?.open && (
                      <button
                        onClick={() => {
                          if (onNavigateTab) {
                            const tab = m.action?.open?.replace('/', '') || 'overview';
                            onNavigateTab(tab);
                          }
                          sound.playClick();
                        }}
                        className="mt-2.5 px-3 py-1.5 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all text-[11px] font-sans font-medium flex items-center gap-1.5"
                      >
                        <span>Open Section ({m.action.open})</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}

                    {/* Assistant Feedback & Copy Controls */}
                    {m.sender === 'assistant' && (
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[var(--border)]/30 text-[10px] text-[var(--muted)]">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleFeedback(m.id, 'up')}
                            className={`p-1 rounded hover:text-[var(--text)] transition-colors ${
                              m.feedback === 'up' ? 'text-[var(--status-allow)]' : ''
                            }`}
                            title="Helpful"
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleFeedback(m.id, 'down')}
                            className={`p-1 rounded hover:text-[var(--text)] transition-colors ${
                              m.feedback === 'down' ? 'text-[var(--status-block)]' : ''
                            }`}
                            title="Not helpful"
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleCopy(m.id, m.text)}
                            className="p-1 rounded hover:text-[var(--text)] transition-colors ml-1"
                            title="Copy reply"
                          >
                            {copiedId === m.id ? (
                              <Check className="w-3 h-3 text-[var(--status-allow)]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <span className="font-mono">{m.time}</span>
                      </div>
                    )}

                    {/* User Message Timestamp */}
                    {m.sender === 'user' && (
                      <div className="text-[9px] font-mono mt-1 text-right text-white/75">
                        {m.time}
                      </div>
                    )}
                  </div>

                  {/* Suggestion Chips */}
                  {m.chips && m.chips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 max-w-[95%]">
                      {m.chips.map((chip, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendQuery(chip)}
                          className="px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-solid)] hover:border-[var(--accent)] hover:text-[var(--text)] text-[10px] font-sans text-[var(--muted)] transition-all shadow-xs"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing / Processing Shimmer */}
              {isLoading && (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] w-fit text-xs font-mono">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:0.3s]" />
                  </div>
                  <span className="text-[11px]">Evaluating intent & telemetry...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuery(input);
              }}
              className="pt-2 border-t border-[var(--border)] flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  currentLang === 'ta'
                    ? 'கேளுங்கள்: /status, SQLi, SHAP, விதிகள்...'
                    : 'Ask about threats, SHAP, /status, math...'
                }
                className="flex-1 bg-[var(--surface)] text-xs text-[var(--text)] px-3 py-2 rounded-xl border border-[var(--border)] focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--muted)] shadow-inner"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
