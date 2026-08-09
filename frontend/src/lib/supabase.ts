import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Supabase client — only functional when VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY are set. Falls back gracefully to localStorage.
 */
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/* ─── Database types ─── */

export interface ProjectRecord {
  id: string;
  user_id: string;
  title: string;
  canvas_state: {
    nodes: unknown[];
    edges: unknown[];
  };
  created_at: string;
  updated_at: string;
  is_public: boolean;
  share_token?: string;
}
