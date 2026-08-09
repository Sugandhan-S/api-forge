import { useState, useMemo, useCallback } from 'react';
import {
  X,
  Play,
  Square,
  Zap,
  Globe,
  ExternalLink,
  ChevronRight,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Clock,
  Trash2,
  Send,
  Terminal,
} from 'lucide-react';
import { useCanvasStore } from '../stores/canvasStore';
import { buildAST } from '../generators/astBuilder';
import { generateOpenAPISpec, specToJSON } from '../generators/openApiGenerator';
import { useMockServer, type MockRoute, type RequestLog } from '../hooks/useMockServer';

/* ─── Helpers ─── */

const METHOD_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  GET:    { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  POST:   { text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'    },
  PUT:    { text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  PATCH:  { text: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20'  },
  DELETE: { text: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'     },
};

function MethodBadge({ method }: { method: string }) {
  const colors = METHOD_COLORS[method] || { text: 'text-[#6e7191]', bg: 'bg-[#1a1b25]', border: 'border-[#1e2030]' };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono
                      border ${colors.text} ${colors.bg} ${colors.border}`}>
      {method}
    </span>
  );
}

function StatusBadge({ status }: { status: number }) {
  const isSuccess = status >= 200 && status < 300;
  const isError = status >= 400 || status === 0;
  const color = status === 0
    ? 'text-red-400 bg-red-500/10 border-red-500/20'
    : isSuccess
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      : isError
        ? 'text-red-400 bg-red-500/10 border-red-500/20'
        : 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono border ${color}`}>
      {status === 0 ? 'ERR' : status}
    </span>
  );
}

/* ─── Route Row ─── */

function RouteRow({
  route,
  onTry,
  isLoading,
}: {
  route: MockRoute;
  onTry: (route: MockRoute) => void;
  isLoading: boolean;
}) {
  return (
    <div className="group flex items-center gap-2 px-3 py-2 rounded-lg
                    hover:bg-[#1a1b25] transition-colors border border-transparent
                    hover:border-[#1e2030]">
      <MethodBadge method={route.method} />

      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-mono text-[#e4e5f1] truncate">{route.path}</p>
        {route.summary && (
          <p className="text-[10px] text-[#6e7191] truncate mt-0.5">{route.summary}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[9px] text-[#2a2d45] font-mono">{route.statusCode}</span>
        <button
          type="button"
          onClick={() => onTry(route)}
          disabled={isLoading}
          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1
                     rounded-md bg-[#6c63ff]/15 text-[#6c63ff] border border-[#6c63ff]/30
                     text-[10px] font-medium transition-all hover:bg-[#6c63ff]/25
                     disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Send className="w-2.5 h-2.5" />
          Try
        </button>
      </div>
    </div>
  );
}

/* ─── Request Log Entry ─── */

function LogEntry({ log }: { log: RequestLog }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = JSON.stringify(log.responseBody, null, 2);
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [log.responseBody]);

  const timeStr = new Date(log.timestamp).toLocaleTimeString();

  return (
    <div className="border border-[#1e2030] rounded-lg overflow-hidden">
      {/* Log header row */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#1a1b25]
                   transition-colors text-left cursor-pointer"
      >
        <ChevronRight
          className={`w-3 h-3 text-[#6e7191] transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`}
        />
        <MethodBadge method={log.method} />
        <span className="text-[10px] font-mono text-[#e4e5f1] flex-1 truncate min-w-0">
          {log.url.replace(/^https?:\/\/[^/]+/, '')}
        </span>
        <StatusBadge status={log.status} />
        <span className="text-[9px] text-[#6e7191] flex items-center gap-1 shrink-0">
          <Clock className="w-2.5 h-2.5" />
          {log.latency}ms
        </span>
        <span className="text-[9px] text-[#2a2d45] shrink-0">{timeStr}</span>
      </button>

      {/* Expanded response body */}
      {expanded && (
        <div className="border-t border-[#1e2030]">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#0a0b0f]">
            <span className="text-[9px] text-[#6e7191] uppercase tracking-wider">Response Body</span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 text-[9px] text-[#6e7191] hover:text-[#e4e5f1]
                         transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          {log.error ? (
            <div className="px-3 py-2 flex items-center gap-2 bg-red-500/5">
              <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
              <span className="text-[10px] text-red-400 font-mono">{log.error}</span>
            </div>
          ) : (
            <pre className="px-3 py-2 text-[10px] font-mono text-[#e4e5f1] overflow-x-auto
                           bg-[#0a0b0f] max-h-48 leading-relaxed">
              {JSON.stringify(log.responseBody, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Status Indicator ─── */

function StatusIndicator({ status }: { status: string }) {
  const configs: Record<string, { dot: string; text: string; label: string }> = {
    idle:     { dot: 'bg-[#2a2d45]',          text: 'text-[#6e7191]',    label: 'Idle'     },
    starting: { dot: 'bg-amber-400 animate-pulse', text: 'text-amber-400', label: 'Starting' },
    running:  { dot: 'bg-emerald-400 animate-pulse', text: 'text-emerald-400', label: 'Running' },
    stopping: { dot: 'bg-orange-400 animate-pulse', text: 'text-orange-400', label: 'Stopping' },
    error:    { dot: 'bg-red-400',             text: 'text-red-400',      label: 'Error'    },
  };

  const cfg = configs[status] || configs.idle;

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <span className={`text-[10px] font-medium ${cfg.text}`}>{cfg.label}</span>
    </div>
  );
}

/* ─── Main MockPanel ─── */

type PanelTab = 'routes' | 'logs';

interface MockPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MockPanel({ isOpen, onClose }: MockPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('routes');
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());

  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);

  const { status, session, logs, error, startMock, stopMock, tryRequest, clearLogs } =
    useMockServer();

  /* Build the spec from current canvas state */
  const spec = useMemo(() => {
    try {
      const ast = buildAST(nodes, edges, 'User Service API', '1.0.0');
      return generateOpenAPISpec(ast);
    } catch {
      return null;
    }
  }, [nodes, edges]);

  const specJson = useMemo(() => (spec ? JSON.parse(specToJSON(spec)) : null), [spec]);

  const handleStart = useCallback(async () => {
    if (!specJson) return;
    await startMock(specJson);
    setActiveTab('routes');
  }, [specJson, startMock]);

  const handleTry = useCallback(
    async (route: MockRoute) => {
      const key = `${route.method}:${route.path}`;
      setActiveRouteId(key);
      setPendingRequests((prev) => new Set(prev).add(key));

      await tryRequest(route);

      setPendingRequests((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setActiveRouteId(null);
      setActiveTab('logs');
    },
    [tryRequest]
  );

  if (!isOpen) return null;

  const isRunning = status === 'running';
  const canStart = status === 'idle' || status === 'error' || status === 'starting';
  const endpointCount = spec ? Object.values(spec.paths).reduce(
    (sum, methods) => sum + Object.keys(methods).length, 0
  ) : 0;

  return (
    <div className="fixed inset-0 z-[90] flex">
      {/* Dim backdrop (click outside to close) */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel — slides in from right */}
      <div
        className="absolute top-0 right-0 h-full w-[420px] flex flex-col
                   bg-[#12131a] border-l border-[#1e2030]
                   shadow-[-12px_0_40px_rgba(0,0,0,0.5)]
                   animate-slide-in"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2030] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#6c63ff] to-[#a78bfa]
                            shadow-[0_0_12px_rgba(108,99,255,0.25)]">
              <Terminal className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Mock Server</h2>
              <StatusIndicator status={status} />
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6e7191] hover:text-[#e4e5f1]
                       hover:bg-[#1a1b25] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Mock URL bar (when running) ── */}
        {isRunning && session && (
          <div className="px-4 py-2.5 border-b border-[#1e2030] bg-[#0a0b0f]/60 shrink-0">
            <p className="text-[9px] uppercase tracking-widest text-[#6e7191] mb-1">Base URL</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#1a1b25] border border-[#1e2030]
                              font-mono text-[11px] text-emerald-400 truncate">
                {session.mockBaseUrl}
              </div>
              <a
                href={session.mockBaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-[#1a1b25] border border-[#1e2030]
                           text-[#6e7191] hover:text-[#e4e5f1] hover:border-[#2a2d45]
                           transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* ── Spec summary bar ── */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e2030] shrink-0">
          <div className="flex gap-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#6c63ff]/10">
              <Globe className="w-3 h-3 text-[#6c63ff]" />
              <span className="text-[10px] font-medium text-[#6c63ff]">
                {endpointCount} endpoint{endpointCount !== 1 ? 's' : ''}
              </span>
            </div>
            {isRunning && session && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-medium text-emerald-400">
                  {session.routes.length} routes active
                </span>
              </div>
            )}
          </div>

          {/* Start / Stop */}
          {canStart ? (
            <button
              type="button"
              onClick={handleStart}
              disabled={!specJson || status === 'starting'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                         bg-gradient-to-r from-[#6c63ff] to-[#a78bfa]
                         text-xs font-semibold text-white
                         hover:shadow-[0_0_16px_rgba(108,99,255,0.35)]
                         active:scale-[0.97] transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {status === 'starting' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              {status === 'starting' ? 'Starting...' : 'Start Mock'}
            </button>
          ) : isRunning ? (
            <button
              type="button"
              onClick={stopMock}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                         bg-red-500/15 border border-red-500/30 text-red-400
                         text-xs font-semibold
                         hover:bg-red-500/25 active:scale-[0.97]
                         transition-all cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              Stop
            </button>
          ) : null}
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="mx-4 mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg
                          bg-red-500/10 border border-red-500/20 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-400">{error}</p>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 px-4 pt-3 pb-0 shrink-0">
          {(['routes', 'logs'] as PanelTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg
                         text-xs font-medium transition-all duration-150 cursor-pointer
                         ${activeTab === tab
                           ? 'bg-[#1a1b25] text-[#e4e5f1] border border-[#1e2030] border-b-[#1a1b25]'
                           : 'text-[#6e7191] hover:text-[#e4e5f1]'
                         }`}
            >
              {tab === 'routes' ? <Globe className="w-3 h-3" /> : <Terminal className="w-3 h-3" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'logs' && logs.length > 0 && (
                <span className="px-1 py-0.5 rounded text-[9px] bg-[#6c63ff]/20
                                 text-[#6c63ff] font-bold">
                  {logs.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 overflow-y-auto border-t border-[#1e2030]">
          {/* Routes tab */}
          {activeTab === 'routes' && (
            <div className="p-3 space-y-1">
              {!isRunning ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-3 rounded-full bg-[#1a1b25] mb-3">
                    <Terminal className="w-6 h-6 text-[#2a2d45]" />
                  </div>
                  <p className="text-sm text-[#6e7191] font-medium">Mock server not running</p>
                  <p className="text-[11px] text-[#2a2d45] mt-1 max-w-[240px]">
                    Click "Start Mock" above to spin up an instant fake API from your canvas
                  </p>
                </div>
              ) : session?.routes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="w-6 h-6 text-amber-400 mb-2" />
                  <p className="text-sm text-[#6e7191]">No routes registered</p>
                  <p className="text-[11px] text-[#2a2d45] mt-1">Add endpoint nodes to the canvas</p>
                </div>
              ) : (
                session.routes.map((route) => {
                  const key = `${route.method}:${route.path}`;
                  return (
                    <RouteRow
                      key={key}
                      route={route}
                      onTry={handleTry}
                      isLoading={pendingRequests.has(key)}
                    />
                  );
                })
              )}
            </div>
          )}

          {/* Logs tab */}
          {activeTab === 'logs' && (
            <div className="p-3">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-3 rounded-full bg-[#1a1b25] mb-3">
                    <Clock className="w-6 h-6 text-[#2a2d45]" />
                  </div>
                  <p className="text-sm text-[#6e7191] font-medium">No requests yet</p>
                  <p className="text-[11px] text-[#2a2d45] mt-1">
                    Hit "Try" on any route to see live responses here
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-[#6e7191]">{logs.length} request{logs.length !== 1 ? 's' : ''}</span>
                    <button
                      type="button"
                      onClick={clearLogs}
                      className="flex items-center gap-1 text-[10px] text-[#6e7191]
                                 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {logs.map((log) => (
                      <LogEntry key={log.id} log={log} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-4 py-2.5 border-t border-[#1e2030] shrink-0
                        flex items-center justify-between text-[10px] text-[#2a2d45]">
          <span>Phase 4 — Mock Server</span>
          {activeRouteId && (
            <span className="flex items-center gap-1 text-[#6c63ff]">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              Fetching...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
