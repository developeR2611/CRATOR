import { supabase } from './supabase';
import type {
  AuthorizedCatalogPreview,
  DownloadJob,
  DownloadListResponse,
  DownloadMediaType,
  DownloadSourcesResponse,
} from '../types/downloads';

const TOKEN_STORAGE_KEY = 'crator_download_session_token';

let cachedToken: string | null = null;
let sessionBootstrapPromise: Promise<string> | null = null;

export interface DownloadHealthResponse {
  status: string;
  engine: 'aria2' | 'native';
  aria2Connected: boolean;
  aria2Version?: string;
  ffmpegAvailable: boolean;
  ffprobeAvailable: boolean;
  storageDir: string;
  storageMode: 'local-disk' | 'remote-service' | 'serverless-unconfigured';
  maxConcurrent: number;
  usedBytes: number;
  maxBytes: number;
}

export interface CreateDownloadPayload {
  tmdbId: string;
  mediaType: DownloadMediaType;
  title: string;
  releaseYear?: number;
  posterUrl?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  quality: string;
  remuxToMkv?: boolean;
}

export interface CreateDownloadResult {
  job: DownloadJob;
  duplicate: boolean;
}

export interface BatchDownloadResult {
  created: DownloadJob[];
  skippedDuplicates: number;
  errors: string[];
}

function readStoredToken(): string | null {
  if (cachedToken) return cachedToken;
  try {
    const val = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (val) cachedToken = val;
    return val;
  } catch {
    return null;
  }
}

function saveStoredToken(token: string | null): void {
  cachedToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {}
}

async function getSupabaseAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch {
    return null;
  }
}

export async function ensureDownloadSession(forceRefresh: boolean = false): Promise<string> {
  const supabaseToken = await getSupabaseAccessToken();
  if (supabaseToken) {
    return supabaseToken;
  }

  if (!forceRefresh) {
    const existing = readStoredToken();
    if (existing) return existing;
  }

  if (sessionBootstrapPromise) return sessionBootstrapPromise;

  sessionBootstrapPromise = (async () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const existing = !forceRefresh ? readStoredToken() : null;
    if (existing) {
      headers['Authorization'] = `Bearer ${existing}`;
    }

    const res = await fetch('/api/downloads/session', {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      throw new Error('Unable to initialize authenticated download session.');
    }

    const data = await res.json();
    const token = String(data.token || '');
    if (!token) {
      throw new Error('Download session token was not returned by server.');
    }
    saveStoredToken(token);
    return token;
  })().finally(() => {
    sessionBootstrapPromise = null;
  });

  return sessionBootstrapPromise;
}

async function downloadFetch<T>(
  path: string,
  options: RequestInit = {},
  retryOnAuth: boolean = true
): Promise<T> {
  const token = await ensureDownloadSession(false);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers,
  });

  if (res.status === 401 && retryOnAuth) {
    saveStoredToken(null);
    await ensureDownloadSession(true);
    return downloadFetch<T>(path, options, false);
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(payload?.error || `Request failed with status ${res.status}`) as Error & {
      status?: number;
      code?: string;
    };
    err.status = res.status;
    err.code = payload?.code;
    throw err;
  }

  return payload as T;
}

export async function getDownloadHealth(): Promise<DownloadHealthResponse> {
  const res = await fetch('/api/downloads/health', {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error('Download service health check failed.');
  }
  return res.json();
}

export async function getAuthorizedCatalog(): Promise<AuthorizedCatalogPreview[]> {
  const data = await downloadFetch<{ items: AuthorizedCatalogPreview[] }>('/api/downloads/catalog');
  return Array.isArray(data.items) ? data.items : [];
}

export async function getDownloadSources(params: {
  mediaType: DownloadMediaType;
  tmdbId: string | number;
  seasonNumber?: number;
  episodeNumber?: number;
}): Promise<DownloadSourcesResponse> {
  const qs = new URLSearchParams({
    mediaType: params.mediaType,
    tmdbId: String(params.tmdbId),
  });
  if (typeof params.seasonNumber === 'number') {
    qs.set('season', String(params.seasonNumber));
  }
  if (typeof params.episodeNumber === 'number') {
    qs.set('episode', String(params.episodeNumber));
  }
  return downloadFetch<DownloadSourcesResponse>(`/api/downloads/sources?${qs.toString()}`);
}

export async function listDownloads(): Promise<DownloadListResponse> {
  return downloadFetch<DownloadListResponse>('/api/downloads');
}

export async function getDownloadJob(id: string): Promise<DownloadJob> {
  const data = await downloadFetch<{ job: DownloadJob }>(
    `/api/downloads/${encodeURIComponent(id)}`
  );
  return data.job;
}

export async function createDownloadJob(
  payload: CreateDownloadPayload
): Promise<CreateDownloadResult> {
  return downloadFetch<CreateDownloadResult>('/api/downloads', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createBatchDownloadJobs(
  items: CreateDownloadPayload[]
): Promise<BatchDownloadResult> {
  return downloadFetch<BatchDownloadResult>('/api/downloads', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export async function pauseDownloadJob(id: string): Promise<DownloadJob> {
  const data = await downloadFetch<{ job: DownloadJob }>(
    `/api/downloads/${encodeURIComponent(id)}/pause`,
    { method: 'POST', body: JSON.stringify({}) }
  );
  return data.job;
}

export async function resumeDownloadJob(id: string): Promise<DownloadJob> {
  const data = await downloadFetch<{ job: DownloadJob }>(
    `/api/downloads/${encodeURIComponent(id)}/resume`,
    { method: 'POST', body: JSON.stringify({}) }
  );
  return data.job;
}

export async function cancelDownloadJob(id: string): Promise<DownloadJob> {
  const data = await downloadFetch<{ job: DownloadJob }>(
    `/api/downloads/${encodeURIComponent(id)}/cancel`,
    { method: 'POST', body: JSON.stringify({}) }
  );
  return data.job;
}

export async function retryDownloadJob(id: string): Promise<DownloadJob> {
  const data = await downloadFetch<{ job: DownloadJob }>(
    `/api/downloads/${encodeURIComponent(id)}/retry`,
    { method: 'POST', body: JSON.stringify({}) }
  );
  return data.job;
}

export async function deleteDownloadJob(id: string): Promise<void> {
  await downloadFetch(`/api/downloads/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function reorderDownloadQueue(orderedJobIds: string[]): Promise<DownloadJob[]> {
  const data = await downloadFetch<{ queue: DownloadJob[] }>('/api/downloads/queue/reorder', {
    method: 'POST',
    body: JSON.stringify({ orderedJobIds }),
  });
  return data.queue;
}

export function getDownloadFileUrl(id: string, inline: boolean = false): string {
  return `/api/downloads/${encodeURIComponent(id)}/file${inline ? '?disposition=inline' : ''}`;
}

export async function triggerBrowserFileDownload(job: DownloadJob): Promise<void> {
  await ensureDownloadSession(false);
  const supabaseToken = await getSupabaseAccessToken();

  // When using signed HttpOnly cookie session, stream directly via native browser download
  if (!supabaseToken) {
    const link = document.createElement('a');
    link.href = getDownloadFileUrl(job.id, false);
    link.download = job.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // When authenticated with a Supabase Bearer JWT, fetch with Authorization header
  const res = await fetch(getDownloadFileUrl(job.id, false), {
    headers: { Authorization: `Bearer ${supabaseToken}` },
  });
  if (!res.ok) {
    throw new Error('Unable to save downloaded file.');
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = job.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 15_000);
}

// ==================== DISPLAY FORMATTERS ====================

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) {
    return 'Size unknown';
  }
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let val = bytes;
  let idx = 0;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx += 1;
  }
  return `${val >= 100 || idx === 0 ? val.toFixed(0) : val >= 10 ? val.toFixed(1) : val.toFixed(2)} ${units[idx]}`;
}

export function formatSpeed(bytesPerSec: number | null | undefined): string {
  if (!bytesPerSec || !Number.isFinite(bytesPerSec) || bytesPerSec <= 0) {
    return '0 B/s';
  }
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatEta(etaSeconds: number | null | undefined): string {
  if (etaSeconds === null || etaSeconds === undefined || !Number.isFinite(etaSeconds) || etaSeconds < 0) {
    return 'Calculating...';
  }
  const sec = Math.ceil(etaSeconds);
  if (sec < 60) return `${sec}s`;
  const mins = Math.floor(sec / 60);
  const remSec = sec % 60;
  if (mins < 60) return `${mins}m ${remSec}s`;
  const hours = Math.floor(mins / 60);
  const remMin = mins % 60;
  return `${hours}h ${remMin}m`;
}

export function formatCompletedDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatEpisodeCode(seasonNumber?: number, episodeNumber?: number): string {
  if (!seasonNumber && !episodeNumber) return '';
  const s = String(seasonNumber || 1).padStart(2, '0');
  const e = String(episodeNumber || 1).padStart(2, '0');
  return `S${s}E${e}`;
}
