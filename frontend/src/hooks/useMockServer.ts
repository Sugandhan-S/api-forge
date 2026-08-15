import { useState, useCallback, useRef } from 'react';
import { apiFetch } from '../utils/apiClient';

/* ─── Types ─── */

export interface MockRoute {
  method: string;
  path: string;
  expressPath: string;
  operationId?: string;
  summary?: string;
  statusCode: number;
}

export type MockStatus = 'idle' | 'starting' | 'running' | 'stopping' | 'error';

export interface MockSession {
  projectId: string;
  mockBaseUrl: string;
  title: string;
  version: string;
  routes: MockRoute[];
  createdAt: string;
}

export interface RequestLog {
  id: string;
  method: string;
  url: string;
  status: number;
  latency: number;
  responseBody: unknown;
  timestamp: string;
  error?: string;
}

export interface UseMockServerReturn {
  status: MockStatus;
  session: MockSession | null;
  logs: RequestLog[];
  error: string | null;
  startMock: (spec: unknown) => Promise<void>;
  stopMock: () => Promise<void>;
  tryRequest: (route: MockRoute) => Promise<void>;
  clearLogs: () => void;
}

/* ─── Hook ─── */

export function useMockServer(): UseMockServerReturn {
  const [status, setStatus] = useState<MockStatus>('idle');
  const [session, setSession] = useState<MockSession | null>(null);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const logIdCounter = useRef(0);

  /* ── Start mock session ── */
  const startMock = useCallback(async (spec: unknown) => {
    setStatus('starting');
    setError(null);

    try {
      const res = await apiFetch('/api/mock/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server returned ${res.status}`);
      }

      const data: MockSession = await res.json();
      setSession(data);
      setStatus('running');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start mock server';
      setError(message);
      setStatus('error');
    }
  }, []);

  /* ── Stop mock session ── */
  const stopMock = useCallback(async () => {
    if (!session) return;

    setStatus('stopping');

    try {
      await apiFetch(`/api/mock/stop/${session.projectId}`, {
        method: 'DELETE',
      });
    } catch {
      // Ignore network errors on stop — session is already local-cleared
    }

    setSession(null);
    setStatus('idle');
    setError(null);
  }, [session]);

  /* ── Fire a test request to a mock route ── */
  const tryRequest = useCallback(
    async (route: MockRoute) => {
      if (!session) return;

      const url = `${session.mockBaseUrl}${route.path.replace(/\{(\w+)\}/g, 'mock-id')}`;
      const startTime = Date.now();
      const logId = String(++logIdCounter.current);

      try {
        const res = await fetch(url, {
          method: route.method,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          // For POST/PUT/PATCH — send an empty body so mock doesn't reject
          ...((['POST', 'PUT', 'PATCH'].includes(route.method))
            ? { body: JSON.stringify({}) }
            : {}),
        });

        const latency = Date.now() - startTime;
        let responseBody: unknown = null;

        try {
          responseBody = await res.json();
        } catch {
          responseBody = { _raw: await res.text() };
        }

        const log: RequestLog = {
          id: logId,
          method: route.method,
          url,
          status: res.status,
          latency,
          responseBody,
          timestamp: new Date().toISOString(),
        };

        setLogs((prev) => [log, ...prev].slice(0, 50)); // keep last 50
      } catch (err) {
        const latency = Date.now() - startTime;
        const message = err instanceof Error ? err.message : 'Network error';

        const log: RequestLog = {
          id: logId,
          method: route.method,
          url,
          status: 0,
          latency,
          responseBody: null,
          timestamp: new Date().toISOString(),
          error: message,
        };

        setLogs((prev) => [log, ...prev].slice(0, 50));
      }
    },
    [session]
  );

  /* ── Clear request log ── */
  const clearLogs = useCallback(() => setLogs([]), []);

  return { status, session, logs, error, startMock, stopMock, tryRequest, clearLogs };
}
