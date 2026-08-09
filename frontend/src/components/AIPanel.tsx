import { useState } from 'react';
import {
  X, Sparkles, Wand2, TestTube2, Bug, Loader2,
  AlertCircle, CheckCircle2, ChevronRight,
  Info, AlertTriangle, XCircle, ArrowRight,
  Clock, RefreshCw, Save, Trash2, TriangleAlert,
} from 'lucide-react';
import { useAI, type AIAction, type AIIssue, type CachedResult } from '../hooks/useAI';
import { useCanvasStore } from '../stores/canvasStore';

/* ─── Action config ─── */

const AI_ACTIONS: Array<{
  id: AIAction;
  label: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
}> = [
  {
    id: 'describe',
    label: 'Generate Descriptions',
    description: 'Auto-write professional summaries for all endpoints',
    icon: <Wand2 className="w-4 h-4" />,
    gradient: 'from-[#6c63ff] to-[#a78bfa]',
  },
  {
    id: 'suggest-body',
    label: 'Suggest Request Body',
    description: 'AI-suggested request body fields for selected endpoint',
    icon: <Sparkles className="w-4 h-4" />,
    gradient: 'from-blue-500 to-cyan-400',
  },
  {
    id: 'generate-tests',
    label: 'Generate Test Suite',
    description: 'Create test scenarios for every endpoint and status code',
    icon: <TestTube2 className="w-4 h-4" />,
    gradient: 'from-emerald-500 to-teal-400',
  },
  {
    id: 'detect-issues',
    label: 'Detect API Issues',
    description: 'Scan your API design for inconsistencies and gaps',
    icon: <Bug className="w-4 h-4" />,
    gradient: 'from-amber-500 to-orange-400',
  },
];

/* ─── Cache status banner ─── */

function CacheBanner({
  cached,
  onRerun,
  onClear,
  onSave,
  isSaving,
  isLoading,
}: {
  cached: CachedResult;
  onRerun: () => void;
  onClear: () => void;
  onSave: () => void;
  isSaving: boolean;
  isLoading: boolean;
}) {
  const { entry, cacheState } = cached;
  const age = Math.round((Date.now() - entry.timestamp) / 1000);
  const ageLabel = age < 60 ? `${age}s ago` : age < 3600 ? `${Math.round(age / 60)}m ago` : `${Math.round(age / 3600)}h ago`;

  const isStale = cacheState === 'stale';

  return (
    <div className={`flex flex-col gap-1.5 px-3 py-2 rounded-lg border text-[10px] mb-2 ${
      isStale
        ? 'bg-amber-500/8 border-amber-500/20'
        : 'bg-[#1a1b25] border-[#1e2030]'
    }`}>
      <div className="flex items-center gap-1.5">
        {isStale ? (
          <TriangleAlert className="w-3 h-3 text-amber-400 shrink-0" />
        ) : (
          <Clock className="w-3 h-3 text-[#6e7191] shrink-0" />
        )}
        <span className={isStale ? 'text-amber-400 font-medium' : 'text-[#6e7191]'}>
          {isStale
            ? 'Canvas changed since last run — results may be outdated'
            : `Cached result · ${ageLabel}`}
        </span>
        {entry.savedToProject && (
          <span className="ml-auto flex items-center gap-0.5 text-emerald-400">
            <Save className="w-2.5 h-2.5" /> Saved
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={onRerun}
          disabled={isLoading}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#6c63ff]/15
                     border border-[#6c63ff]/30 text-[#6c63ff] hover:bg-[#6c63ff]/25
                     transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-2.5 h-2.5 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Running…' : 'Re-run'}
        </button>

        {!entry.savedToProject && (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10
                       border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20
                       transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Save className="w-2.5 h-2.5" />}
            {isSaving ? 'Saving…' : 'Save to Project'}
          </button>
        )}

        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/8
                     border border-red-500/15 text-red-400/70 hover:text-red-400
                     hover:bg-red-500/15 transition-colors ml-auto cursor-pointer"
        >
          <Trash2 className="w-2.5 h-2.5" />
          Clear
        </button>
      </div>
    </div>
  );
}

/* ─── Severity icon ─── */

function SeverityIcon({ severity }: { severity: AIIssue['severity'] }) {
  switch (severity) {
    case 'error':   return <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
    case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    case 'info':    return <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
  }
}

/* ─── Result renderers ─── */

function DescribeResult({ result, onApply }: { result: Record<string, string>; onApply: () => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-[#6e7191]">{Object.keys(result).length} descriptions generated</span>
        <button
          type="button"
          onClick={onApply}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#6c63ff]/15
                     border border-[#6c63ff]/30 text-[#6c63ff] text-[11px] font-medium
                     hover:bg-[#6c63ff]/25 transition-colors cursor-pointer"
        >
          <ArrowRight className="w-3 h-3" />
          Apply All to Canvas
        </button>
      </div>
      {Object.entries(result).map(([id, desc]) => (
        <div key={id} className="px-3 py-2 rounded-lg bg-[#1a1b25] border border-[#1e2030]">
          <p className="text-[10px] text-[#2a2d45] font-mono mb-1">{id}</p>
          <p className="text-[11px] text-[#e4e5f1] leading-relaxed">{desc}</p>
        </div>
      ))}
    </div>
  );
}

function TestResult({ result }: {
  result: Array<{
    name: string;
    scenarios: Array<{ name: string; statusCode: number; assertions: string[] }>;
  }>;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      {result.map((suite) => (
        <div key={suite.name} className="rounded-lg border border-[#1e2030] overflow-hidden">
          <button
            type="button"
            onClick={() => setExpanded(expanded === suite.name ? null : suite.name)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#1a1b25]
                       transition-colors text-left cursor-pointer"
          >
            <ChevronRight className={`w-3 h-3 text-[#6e7191] transition-transform ${expanded === suite.name ? 'rotate-90' : ''}`} />
            <span className="text-[11px] font-mono text-[#e4e5f1] flex-1">{suite.name}</span>
            <span className="text-[10px] text-[#6e7191]">{suite.scenarios.length} scenarios</span>
          </button>
          {expanded === suite.name && (
            <div className="border-t border-[#1e2030] bg-[#0a0b0f] px-3 py-2 space-y-2">
              {suite.scenarios.map((sc) => (
                <div key={sc.name}>
                  <p className="text-[10px] font-medium text-[#e4e5f1] mb-1">
                    {sc.name} <span className="text-[#6e7191]">→ {sc.statusCode}</span>
                  </p>
                  <ul className="space-y-0.5">
                    {sc.assertions.map((a, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-[10px] text-[#6e7191]">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500/60 shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function IssuesResult({ result }: {
  result: { staticIssues: AIIssue[]; aiSuggestions: unknown[] };
}) {
  const errors   = result.staticIssues.filter((i) => i.severity === 'error');
  const warnings = result.staticIssues.filter((i) => i.severity === 'warning');
  const infos    = result.staticIssues.filter((i) => i.severity === 'info');

  if (result.staticIssues.length === 0) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
        <p className="text-sm font-medium text-emerald-400">No issues detected</p>
        <p className="text-[11px] text-[#6e7191] mt-1">Your API design looks clean!</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2 mb-2">
        {errors.length   > 0 && <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 border border-red-500/20 text-red-400">{errors.length} errors</span>}
        {warnings.length > 0 && <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400">{warnings.length} warnings</span>}
        {infos.length    > 0 && <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400">{infos.length} info</span>}
      </div>
      {result.staticIssues.map((issue, i) => (
        <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[#1a1b25] border border-[#1e2030]">
          <SeverityIcon severity={issue.severity} />
          <p className="text-[11px] text-[#e4e5f1] leading-relaxed">{issue.message}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Main AI Panel ─── */

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIPanel({ isOpen, onClose }: AIPanelProps) {
  const {
    status, result, cached, activeAction, error,
    aiConfigured, selectAction, applyDescriptions,
    clear, clearCache, saveToProject, isSaving,
  } = useAI();

  const { selectedNodeId } = useCanvasStore();

  if (!isOpen) return null;

  const isLoading = status === 'loading';

  /** Determine what to display: live result > cached result */
  const displayResult = result ?? cached?.entry.result ?? null;
  const displayAction = displayResult?.action ?? null;

  function handleActionClick(actionId: AIAction) {
    void selectAction(actionId, false, actionId === 'suggest-body' ? selectedNodeId ?? undefined : undefined);
  }

  function handleReRun() {
    if (!activeAction) return;
    void selectAction(activeAction, true, activeAction === 'suggest-body' ? selectedNodeId ?? undefined : undefined);
  }

  function renderResult(r: typeof displayResult) {
    if (!r) return null;
    switch (r.action) {
      case 'describe':
        return (
          <DescribeResult
            result={r.result as Record<string, string>}
            onApply={() => applyDescriptions(r.result as Record<string, string>)}
          />
        );
      case 'generate-tests':
        return <TestResult result={r.result as never} />;
      case 'detect-issues':
        return <IssuesResult result={r.result as never} />;
      case 'suggest-body':
        return (
          <div className="space-y-2">
            {(r.result as Array<{ name: string; type: string; required: boolean; description: string }>)
              .map((field) => (
                <div key={field.name} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1b25] border border-[#1e2030]">
                  <span className="text-[11px] font-mono text-[#e4e5f1]">{field.name}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">{field.type}</span>
                  {field.required && <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-500/10 border border-red-500/20 text-red-400">required</span>}
                  <span className="text-[10px] text-[#6e7191] ml-auto">{field.description}</span>
                </div>
              ))}
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      <div className="absolute top-0 right-0 h-full w-[420px] flex flex-col
                      bg-[#12131a] border-l border-[#1e2030]
                      shadow-[-12px_0_40px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2030] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#6c63ff] to-[#a78bfa]
                            shadow-[0_0_12px_rgba(108,99,255,0.25)]">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">AI Assistant</h2>
              <p className="text-[10px] text-[#6e7191]">
                {aiConfigured ? '✦ AI connected' : '✦ Template mode'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg text-[#6e7191] hover:text-[#e4e5f1] hover:bg-[#1a1b25]
                       transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action grid */}
        <div className="px-3 py-3 border-b border-[#1e2030] shrink-0">
          <p className="text-[9px] uppercase tracking-widest text-[#6e7191] font-semibold mb-2 px-1">
            Run Analysis
          </p>
          <div className="grid grid-cols-2 gap-2">
            {AI_ACTIONS.map((action) => {
              const isSelected = activeAction === action.id;

              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleActionClick(action.id)}
                  disabled={isLoading}
                  className={`flex flex-col items-start gap-1.5 p-3 rounded-xl
                             border transition-all text-left cursor-pointer
                             disabled:opacity-50 disabled:cursor-not-allowed
                             ${isSelected
                               ? 'bg-[#6c63ff]/10 border-[#6c63ff]/50 shadow-[0_0_15px_rgba(108,99,255,0.15)]'
                               : 'bg-[#1a1b25] border-[#1e2030] hover:border-[#2a2d45]'
                             }`}
                >
                  <div className={`p-1.5 rounded-lg bg-gradient-to-br ${action.gradient}`}>
                    {isSelected && isLoading
                      ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                      : action.icon}
                  </div>
                  <div className="flex items-start justify-between w-full gap-1">
                    <p className="text-[11px] font-medium text-[#e4e5f1] leading-snug">{action.label}</p>
                  </div>
                  <p className="text-[9px] text-[#6e7191] leading-snug">{action.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Result area */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* Cache banner — shown when there is a cached result for the active action */}
          {cached && activeAction === cached.entry.result.action && (
            <CacheBanner
              cached={cached}
              onRerun={handleReRun}
              onClear={() => {
                clearCache(cached.entry.result.action);
              }}
              onSave={() => void saveToProject(cached.entry.result.action)}
              isSaving={isSaving}
              isLoading={isLoading}
            />
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="w-8 h-8 text-[#6c63ff] animate-spin mb-3" />
              <p className="text-sm text-[#6e7191]">AI is thinking…</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 mb-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-400">{error}</p>
            </div>
          )}

          {/* Result (live or cached) */}
          {!isLoading && displayResult && displayAction && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-medium text-emerald-400">
                    {displayResult.usedAI
                      ? `Generated by ${displayResult.model}`
                      : 'Generated by template engine'}
                  </span>
                </div>
                <button type="button" onClick={clear}
                  className="text-[10px] text-[#6e7191] hover:text-[#e4e5f1] transition-colors cursor-pointer">
                  ✕ Dismiss
                </button>
              </div>
              {renderResult(displayResult)}
            </div>
          )}

          {!isLoading && status === 'idle' && !displayResult && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-3 rounded-full bg-[#1a1b25] mb-3">
                <Sparkles className="w-6 h-6 text-[#2a2d45]" />
              </div>
              <p className="text-sm text-[#6e7191] font-medium">AI-powered API analysis</p>
              <p className="text-[11px] text-[#2a2d45] mt-1 max-w-[260px]">
                Choose an action above. Results are saved in session cache so you can switch between actions instantly without extra network calls.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#1e2030] shrink-0 flex items-center justify-between text-[10px] text-[#2a2d45]">
          <span>Cached in sessionStorage per action</span>
          <span>{aiConfigured ? 'AI' : 'Template'} mode</span>
        </div>
      </div>
    </div>
  );
}
