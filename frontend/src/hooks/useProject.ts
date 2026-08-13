import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useCanvasStore, defaultNodes, defaultEdges } from '../stores/canvasStore';
import type { User } from '@supabase/supabase-js';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseProjectReturn {
  isHydrating: boolean;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  saveProject: () => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
}

const LS_KEY = (projectId: string) => `apiforge:project:${projectId}`;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_UUID = '00000000-0000-0000-0000-000000000001';

function ensureUUID(id: string, userId?: string): string {
  if (UUID_REGEX.test(id) && id !== DEFAULT_UUID) return id;
  // If it's the default UUID or invalid, and we have a user, use the user's ID as their default project ID
  if (userId && UUID_REGEX.test(userId)) return userId;
  return DEFAULT_UUID;
}

/* ─── localStorage fallback ─── */

function saveToLocalStorage(projectId: string, title: string, nodes: unknown[], edges: unknown[]) {
  const data = { id: projectId, title, nodes, edges, savedAt: new Date().toISOString() };
  localStorage.setItem(LS_KEY(projectId), JSON.stringify(data));
}

function loadFromLocalStorage(projectId: string) {
  const raw = localStorage.getItem(LS_KEY(projectId));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/* ─── Hook ─── */

export function useProject(user: User | null, authLoading: boolean = false): UseProjectReturn {
  const [isHydrating, setIsHydrating] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const isHydrated = useRef(false);
  const lastSavedState = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { nodes, edges, projectTitle, projectId, loadCanvasState } = useCanvasStore();

  /* ── 1. Initial Hydration (load saved project on mount/login) ── */
  useEffect(() => {
    if (authLoading) {
      setIsHydrating(true);
      return;
    }

    let isMounted = true;
    isHydrated.current = false;
    setIsHydrating(true);

    async function hydrate() {
      const targetUUID = ensureUUID(projectId, user?.id);
      let loaded = false;

      // Try Supabase first if authenticated
      if (isSupabaseConfigured && supabase && user) {
        try {
          const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', targetUUID)
            .maybeSingle();

          if (!error && data && data.canvas_state?.nodes) {
            if (isMounted) {
              loadCanvasState(
                data.title || 'User Service API',
                data.canvas_state.nodes,
                data.canvas_state.edges || []
              );
              setLastSavedAt(data.updated_at || new Date().toISOString());
              lastSavedState.current = JSON.stringify({
                nodes: data.canvas_state.nodes,
                edges: data.canvas_state.edges || [],
                projectTitle: data.title || 'User Service API'
              });
              loaded = true;
              console.log('[Project] Successfully loaded project from Supabase:', data.title);
            }
          }
        } catch (err) {
          console.warn('[Project] Supabase load error, checking localStorage:', err);
        }
      }

      // Fallback to localStorage if not loaded from Supabase
      if (!loaded) {
        const local = loadFromLocalStorage(projectId) || loadFromLocalStorage(targetUUID);
        if (local && local.nodes && isMounted) {
          loadCanvasState(local.title || 'User Service API', local.nodes, local.edges || []);
          setLastSavedAt(local.savedAt || new Date().toISOString());
          lastSavedState.current = JSON.stringify({
            nodes: local.nodes,
            edges: local.edges || [],
            projectTitle: local.title || 'User Service API'
          });
          console.log('[Project] Successfully loaded project from localStorage:', local.title);
          loaded = true;
        }
      }

      // Last resort: seed with demo canvas for new / guest users
      if (!loaded && isMounted) {
        loadCanvasState('User Service API', defaultNodes as any, defaultEdges);
        lastSavedState.current = JSON.stringify({
          nodes: defaultNodes,
          edges: defaultEdges,
          projectTitle: 'User Service API'
        });
        console.log('[Project] No saved data found — seeding with default demo canvas');
      }

      if (isMounted) {
        isHydrated.current = true;
        setIsHydrating(false);
      }
    }

    void hydrate();

    return () => {
      isMounted = false;
    };
  }, [projectId, user, authLoading, loadCanvasState]);

  /* ── 2. Auto-save on canvas changes (2s debounce) — ONLY after hydrated ── */
  useEffect(() => {
    if (!isHydrated.current) return;

    const currentStateStr = JSON.stringify({ nodes, edges, projectTitle });
    
    // Skip if nothing actually changed
    if (currentStateStr === lastSavedState.current) {
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        setSaveStatus('saving');
        try {
          if (isSupabaseConfigured && supabase && user) {
            const { error } = await supabase
              .from('projects')
              .upsert({
                id: ensureUUID(projectId, user.id),
                user_id: user.id,
                title: projectTitle,
                canvas_state: { nodes, edges },
                updated_at: new Date().toISOString(),
              });
            if (error) throw new Error(error.message);
          } else {
            saveToLocalStorage(projectId, projectTitle, nodes, edges);
          }
          setLastSavedAt(new Date().toISOString());
          lastSavedState.current = currentStateStr; // Update tracked state after successful save
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (err) {
          console.error('[Project] Auto-save failed:', err);
          setSaveStatus('error');
          // Save locally as backup
          saveToLocalStorage(projectId, projectTitle, nodes, edges);
          lastSavedState.current = currentStateStr; // Update even on fallback save
        }
      })();
    }, 2000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [nodes, edges, projectTitle, projectId, user]);

  /* ── 3. Manual Save ── */
  const saveProject = useCallback(async () => {
    const currentStateStr = JSON.stringify({ nodes, edges, projectTitle });
    
    setSaveStatus('saving');
    try {
      if (isSupabaseConfigured && supabase && user) {
        const { error } = await supabase
          .from('projects')
          .upsert({
            id: ensureUUID(projectId, user.id),
            user_id: user.id,
            title: projectTitle,
            canvas_state: { nodes, edges },
            updated_at: new Date().toISOString(),
          });
        if (error) throw new Error(error.message);
      } else {
        saveToLocalStorage(projectId, projectTitle, nodes, edges);
      }
      setLastSavedAt(new Date().toISOString());
      lastSavedState.current = currentStateStr;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('[Project] Manual save failed:', err);
      setSaveStatus('error');
      saveToLocalStorage(projectId, projectTitle, nodes, edges);
      lastSavedState.current = currentStateStr;
    }
  }, [nodes, edges, projectTitle, projectId, user]);

  /* ── 4. Manual Load ── */
  const loadProject = useCallback(
    async (targetProjectId: string) => {
      const targetUUID = ensureUUID(targetProjectId, user?.id);
      try {
        if (isSupabaseConfigured && supabase && user) {
          const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', targetUUID)
            .maybeSingle();
          if (error) throw new Error(error.message);
          if (data?.canvas_state) {
            loadCanvasState(data.title, data.canvas_state.nodes, data.canvas_state.edges || []);
            lastSavedState.current = JSON.stringify({
              nodes: data.canvas_state.nodes,
              edges: data.canvas_state.edges || [],
              projectTitle: data.title
            });
          }
        } else {
          const data = loadFromLocalStorage(targetProjectId) || loadFromLocalStorage(targetUUID);
          if (data) {
            loadCanvasState(data.title, data.nodes, data.edges || []);
            lastSavedState.current = JSON.stringify({
              nodes: data.nodes,
              edges: data.edges || [],
              projectTitle: data.title
            });
          }
        }
      } catch (err) {
        console.error('[Project] Load failed:', err);
      }
    },
    [user, loadCanvasState]
  );

  return { isHydrating, saveStatus, lastSavedAt, saveProject, loadProject };
}
