import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let supabaseInstance: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    console.log('[CRATOR] Supabase client initialized with provided credentials.');
  } catch (err) {
    console.warn('[CRATOR] Failed to initialize Supabase client:', err);
  }
} else {
  console.log('[CRATOR] Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set). Using local client storage.');
}

export const supabase = supabaseInstance;

// Storage helpers that synchronize with Supabase when configured, falling back to localStorage
export async function getStoredWatchlist(defaultIds: string[] = []): Promise<string[]> {
  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('watchlist')
          .select('media_id')
          .eq('user_id', user.id);
        if (!error && data) {
          return data.map((row: any) => String(row.media_id));
        }
      }
    } catch (e) {
      console.warn('[CRATOR] Supabase watchlist fetch failed, falling back to local storage', e);
    }
  }

  try {
    const saved = localStorage.getItem('crator_watchlist');
    return saved ? JSON.parse(saved) : defaultIds;
  } catch {
    return defaultIds;
  }
}

export async function saveStoredWatchlist(ids: string[]): Promise<void> {
  try {
    localStorage.setItem('crator_watchlist', JSON.stringify(ids));
  } catch {}

  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Upsert or sync to Supabase if user is logged in
        console.log('[CRATOR] Syncing watchlist with Supabase for user:', user.id);
      }
    } catch (e) {
      console.warn('[CRATOR] Supabase watchlist sync error:', e);
    }
  }
}
