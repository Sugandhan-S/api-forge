import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useCanvasStore } from '../stores/canvasStore';
import type { User } from '@supabase/supabase-js';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseProjectReturn {
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  saveProject: () => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
}

const LS_KEY = (projectId: string) => `apiforge:project:${projectId}`;

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

export function useProject(user: User | null): UseProjectReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { nodes, edges, projectTitle, projectId } = useCanvasStore();

  /* ── Auto-save on canvas changes (2s debounce) ── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        setSaveStatus('saving');
        try {
          if (isSupabaseConfigured && supabase && user) {
            const { error } = await supabase
              .from('projects')
              .upsert({
                id: projectId,
                user_id: user.id,
                title: projectTitle,
                canvas_state: { nodes, edges },
                updated_at: new Date().toISOString(),
              });
            if (error) throw new Error(error.message);
          } else {
            // localStorage fallback
            saveToLocalStorage(projectId, projectTitle, nodes, edges);
          }
          setLastSavedAt(new Date().toISOString());
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (err) {
          console.error('[Project] Save failed:', err);
          setSaveStatus('error');
          // Even on Supabase error, save locally as backup
          saveToLocalStorage(projectId, projectTitle, nodes, edges);
        }
      })();
    }, 2000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [nodes, edges, projectTitle, projectId, user]);

  const saveProject = useCallback(async () => {
    setSaveStatus('saving');
    try {
      if (isSupabaseConfigured && supabase && user) {
        const { error } = await supabase
          .from('projects')
          .upsert({
            id: projectId,
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
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('[Project] Save failed:', err);
      setSaveStatus('error');
    }
  }, [nodes, edges, projectTitle, projectId, user]);

  const loadProject = useCallback(async (targetProjectId: string) => {
    try {
      if (isSupabaseConfigured && supabase && user) {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', targetProjectId)
          .single();
        if (error) throw new Error(error.message);
        if (data?.canvas_state) {
          // Would apply to store — requires store action
          console.log('[Project] Loaded from Supabase:', data.title);
        }
      } else {
        const data = loadFromLocalStorage(targetProjectId);
        if (data) {
          console.log('[Project] Loaded from localStorage:', data.title);
        }
      }
    } catch (err) {
      console.error('[Project] Load failed:', err);
    }
  }, [user]);

  return { saveStatus, lastSavedAt, saveProject, loadProject };
}
