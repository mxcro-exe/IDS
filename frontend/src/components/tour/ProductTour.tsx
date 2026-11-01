import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, Check } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  targetTab: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Security Health Score',
    description: 'Real-time 0-100 posture rating with 7-day sparkline and actionable deduction links to harden your gateway.',
    targetTab: 'overview',
  },
  {
    title: 'AI Threat Explainer',
    description: 'Every alert features dual-language human explanations (EN/TA) and one-click remediation actions to ban IPs or allowlist.',
    targetTab: 'alerts',
  },
  {
    title: 'Kill-Chain Incident Management',
    description: 'Threats automatically group into campaigns with animated replay across Recon, Probing, Exploit, and Block stages.',
    targetTab: 'incidents',
  },
  {
    title: 'API Discovery & Shadow Routes',
    description: 'Auto-discovers endpoints from live traffic, computes risk heatmaps, and imports OpenAPI schemas.',
    targetTab: 'endpoints',
  },
  {
    title: 'Custom Rule Builder',
    description: 'No-code visual rule builder with safe ReDoS regex protection, priority ordering, and live sandbox evaluation.',
    targetTab: 'rules',
  },
  {
    title: 'Attack Simulator & Evasion Lab',
    description: 'Test harmless attacks, run Red vs Blue benchmarks, and verify evasion techniques in a sandboxed local environment.',
    targetTab: 'simulator',
  },
];

interface ProductTourProps {
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  lang?: 'en' | 'ta';
}

export function ProductTour({ onClose, onNavigateTab, lang = 'en' }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && currentStep < TOUR_STEPS.length - 1) {
        goToStep(currentStep + 1);
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        goToStep(currentStep - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);

  const goToStep = (index: number) => {
    setCurrentStep(index);
    onNavigateTab(TOUR_STEPS[index].targetTab);
  };

  const stepData = TOUR_STEPS[currentStep];

  return (
    <div className="fixed bottom-6 right-6 z-[9999999] w-96 bg-[var(--surface-solid)] border border-[var(--border)] rounded-2xl shadow-2xl p-5 space-y-3 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
            Tour: Step {currentStep + 1} of {TOUR_STEPS.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-[var(--text)]">{stepData.title}</h4>
        <p className="text-xs text-[var(--muted)] leading-relaxed">{stepData.description}</p>
      </div>

      {/* Progress Dots & Buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
        <div className="flex gap-1.5">
          {TOUR_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => goToStep(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentStep ? 'w-5 bg-[var(--accent)]' : 'bg-white/10 hover:bg-white/30'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {currentStep > 0 && (
            <button
              onClick={() => goToStep(currentStep - 1)}
              className="p-1.5 rounded-lg text-xs font-medium text-[var(--muted)] hover:text-[var(--text)]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {currentStep < TOUR_STEPS.length - 1 ? (
            <button
              onClick={() => goToStep(currentStep + 1)}
              className="px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:brightness-110 text-white text-xs font-medium flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-[#3FB68B] text-white text-xs font-medium hover:brightness-110 flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Got it</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
