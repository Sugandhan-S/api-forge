import { useState, useCallback, useEffect } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { buildAST } from '../generators/astBuilder';
import { computeCanvasHash } from '../utils/canvasHash';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/* ─── Types ─── */

export type AIAction = 'describe' | 'suggest-body' | 'generate-tests' | 'detect-issues';
export type AIStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AIIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  endpointId?: string;
}

export interface AIResult {
  action: AIAction;
  result: unknown;
  usedAI: boolean;
  model?: string;
}

/** What we persist to sessionStorage per action */
export interface CachedAIEntry {
  result: AIResult;
  canvasHash: string;       // hash at time of run
  timestamp: number;        // ms since epoch
  savedToProject: boolean;  // user explicitly saved this
}

export type CacheState = 'fresh' | 'stale' | 'none';

export interface CachedResult {
  entry: CachedAIEntry;
  cacheState: CacheState;   // fresh = canvas unchanged, stale = canvas changed
}

export interface UseAIReturn {
  status: AIStatus;
  result: AIResult | null;
  cached: CachedResult | null;
  activeAction: AIAction | null;
  error: string | null;
  aiConfigured: boolean;
  selectAction: (action: AIAction, forceRerun?: boolean, targetEndpointId?: string) => Promise<void>;
  run: (action: AIAction, targetEndpointId?: string) => Promise<void>;
  applyDescriptions: (descriptions: Record<string, string>) => void;
  clear: () => void;
  clearCache: (action: AIAction) => void;
  saveToProject: (action: AIAction) => Promise<void>;
  isSaving: boolean;
  hasAnyCache: boolean;
}

/* ─── sessionStorage key helpers ─── */

const ALL_ACTIONS: AIAction[] = ['describe', 'suggest-body', 'generate-tests', 'detect-issues'];

const SESSION_KEY = (projectId: string, action: AIAction) =>
  `apiforge:ai:${projectId}:${action}`;

function loadCached(projectId: string, action: AIAction): CachedAIEntry | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY(projectId, action));
    if (!raw) return null;
    return JSON.parse(raw) as CachedAIEntry;
  } catch {
    return null;
  }
}

function saveCached(projectId: string, action: AIAction, entry: CachedAIEntry): void {
  try {
    sessionStorage.setItem(SESSION_KEY(projectId, action), JSON.stringify(entry));
  } catch {
    // sessionStorage full or unavailable — fail silently
  }
}

function deleteCached(projectId: string, action: AIAction): void {
  sessionStorage.removeItem(SESSION_KEY(projectId, action));
}

function findLatestCachedAction(projectId: string): { action: AIAction; entry: CachedAIEntry } | null {
  let latest: { action: AIAction; entry: CachedAIEntry } | null = null;

  for (const action of ALL_ACTIONS) {
    const entry = loadCached(projectId, action);
    if (entry && (!latest || entry.timestamp > latest.entry.timestamp)) {
      latest = { action, entry };
    }
  }

  return latest;
}

/* ─── Hook ─── */

export function useAI(): UseAIReturn {
  const [status, setStatus] = useState<AIStatus>('idle');
  const [result, setResult] = useState<AIResult | null>(null);
  const [cached, setCached] = useState<CachedResult | null>(null);
  const [activeAction, setActiveAction] = useState<AIAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { nodes, edges, projectId, updateNodeData } = useCanvasStore();
  const currentHash = computeCanvasHash(nodes, edges);

  /* ── Helper to update cached state for an action ── */
  const loadCachedForAction = useCallback(
    (action: AIAction) => {
      const entry = loadCached(projectId, action);
      if (!entry) {
        setCached(null);
        return null;
      }
      const cacheState: CacheState =
        entry.canvasHash === currentHash ? 'fresh' : 'stale';
      const cacheObj = { entry, cacheState };
      setCached(cacheObj);
      return cacheObj;
    },
    [projectId, currentHash]
  );

  /* ── Check AI status on mount & auto-load latest cached action ── */
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/ai/status`)
      .then((r) => r.json())
      .then((d) => setAiConfigured(d.configured))
      .catch(() => setAiConfigured(false));

    // Auto-select latest cached action on mount/panel load if nothing active yet
    const latest = findLatestCachedAction(projectId);
    if (latest) {
      setActiveAction(latest.action);
      const cacheState: CacheState =
        latest.entry.canvasHash === currentHash ? 'fresh' : 'stale';
      setCached({ entry: latest.entry, cacheState });
      setResult(latest.entry.result);
    }
  }, [projectId, currentHash]);

  /* ── Re-evaluate staleness whenever canvas changes ── */
  useEffect(() => {
    if (!activeAction) return;
    loadCachedForAction(activeAction);
  }, [currentHash, activeAction, loadCachedForAction]);

  /* ── Force run network call ── */
  const run = useCallback(
    async (action: AIAction, targetEndpointId?: string) => {
      setActiveAction(action);
      setStatus('loading');
      setError(null);

      try {
        const ast = buildAST(nodes, edges, 'User Service API', '1.0.0');

        const res = await fetch(`${BACKEND_URL}/api/ai/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ast, targetEndpointId }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error || `Server error ${res.status}`);
        }

        const data: AIResult = await res.json();
        setResult(data);
        setStatus('success');

        // Persist to sessionStorage
        const entry: CachedAIEntry = {
          result: data,
          canvasHash: currentHash,
          timestamp: Date.now(),
          savedToProject: false,
        };
        saveCached(projectId, action, entry);
        setCached({ entry, cacheState: 'fresh' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'AI request failed';
        setError(message);
        setStatus('error');
      }
    },
    [nodes, edges, projectId, currentHash]
  );

  /* ── Smart Select Action: Uses cache if present, fetches ONLY if forceRerun or no cache ── */
  const selectAction = useCallback(
    async (action: AIAction, forceRerun = false, targetEndpointId?: string) => {
      setActiveAction(action);
      setError(null);

      const existingCache = loadCachedForAction(action);

      if (!forceRerun && existingCache) {
        // Cache hit! Display cached result immediately without network fetch
        setResult(existingCache.entry.result);
        setStatus('idle');
        return;
      }

      // No cache OR user explicitly requested re-run -> fetch from network
      await run(action, targetEndpointId);
    },
    [loadCachedForAction, run]
  );

  /* ── Apply AI descriptions back to canvas nodes ── */
  const applyDescriptions = useCallback(
    (descriptions: Record<string, string>) => {
      for (const [endpointId, description] of Object.entries(descriptions)) {
        updateNodeData(endpointId, { description } as never);
      }
    },
    [updateNodeData]
  );

  /* ── Clear active result (not cache) ── */
  const clear = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
    setActiveAction(null);
    setCached(null);
  }, []);

  /* ── Clear cached result for a specific action ── */
  const clearCache = useCallback(
    (action: AIAction) => {
      deleteCached(projectId, action);
      setCached(null);
      setResult(null);
      setStatus('idle');
      setActiveAction(null);
    },
    [projectId]
  );

  /* ── Save result to project database ── */
  const saveToProject = useCallback(
    async (action: AIAction) => {
      const entry = loadCached(projectId, action);
      if (!entry) return;

      setIsSaving(true);
      try {
        const updated: CachedAIEntry = { ...entry, savedToProject: true };
        saveCached(projectId, action, updated);
        setCached((prev) => (prev ? { ...prev, entry: updated } : prev));

        await fetch(`${BACKEND_URL}/api/ai/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            action,
            result: entry.result,
            canvasHash: entry.canvasHash,
          }),
        }).catch(() => {
          // Supabase not configured — saved locally only, that's fine
        });
      } finally {
        setIsSaving(false);
      }
    },
    [projectId]
  );

  const hasAnyCache = ALL_ACTIONS.some((a) => loadCached(projectId, a) !== null);

  return {
    status,
    result,
    cached,
    activeAction,
    error,
    aiConfigured,
    selectAction,
    run,
    applyDescriptions,
    clear,
    clearCache,
    saveToProject,
    isSaving,
    hasAnyCache,
  };
}
