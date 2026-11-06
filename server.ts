import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { timingSafeEqual } from 'crypto';
import { fileURLToPath } from 'url';

// Load environment variables from .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// AI Studio dev server and preview reverse proxy must run on port 3000
const PORT = 3000;

app.use(express.json());

// ==================== MOVIEBOX API CONFIGURATION ====================
const getMovieBoxUrl = () => {
  return (
    process.env.MOVIEBOX_API_URL || 
    'https://spun-moviebox.ravi-crator.workers.dev'
  ).replace(/\/+$/, '');
};

const getMovieBoxSecret = () => {
  // 1. Prioritize Google AI Studio runtime secret injection (process.env)
  const envVal = (
    process.env.MOVIEBOX_SECRET ||
    process.env.WORKER_SECRET ||
    process.env.MOVIEBOX_API_KEY ||
    ''
  ).trim().replace(/^["']|["']$/g, '').trim();

  if (envVal.length > 0) {
    return envVal;
  }

  // 2. Fallback to .env file ONLY if it contains a non-empty value
  try {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^MOVIEBOX_SECRET=["']?(.*?)["']?$/m);
      if (match && match[1] && match[1].trim().length > 0) {
        return match[1].trim();
      }
    }
  } catch {}

  return '';
};

// ==================== TMDB API CONFIGURATION ====================
const getTmdbKey = () => {
  return (
    process.env.TMDB_API_KEY ||
    process.env.VITE_TMDB_API_KEY ||
    process.env.TMDB_READ_TOKEN ||
    ''
  ).trim();
};

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Helper for TMDB API calls
async function callTmdbApi(endpoint: string, params: Record<string, string | number | undefined> = {}) {
  const apiKey = getTmdbKey();
  if (!apiKey) {
    return {
      ok: false,
      status: 401,
      error: 'TMDB_API_KEY is not configured on the server.',
      code: 'TMDB_KEY_MISSING',
    };
  }

  const isBearer = apiKey.startsWith('ey');
  const url = new URL(`${TMDB_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);

  if (!isBearer) {
    url.searchParams.set('api_key', apiKey);
  }

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'CRATOR-Cinema-4K/2.4',
  };

  if (isBearer) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url.toString(), { headers, signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return { ok: false, status: 500, error: err.message || 'TMDB request error' };
  }
}

// Diagnostic safe logger (uses console.warn for upstream HTTP errors so they are not flagged as server crashes)
function logApiRequest(service: string, method: string, endpoint: string, status?: number, error?: string) {
  const timestamp = new Date().toISOString();
  if (error) {
    console.warn(`[${service}] ${timestamp} ${method} ${endpoint} - Notice: ${error}`);
  } else {
    console.log(`[${service}] ${timestamp} ${method} ${endpoint} - Status: ${status ?? 'pending'}`);
  }
}

// Centralized safe proxy handler for MovieBox
async function callMovieBoxApi(
  endpoint: string, 
  options: {
    method?: string;
    body?: any;
    params?: Record<string, string | number | undefined>;
    requiresAuth?: boolean;
    timeoutMs?: number;
  } = {}
) {
  const baseUrl = getMovieBoxUrl();
  const secret = getMovieBoxSecret();
  const method = options.method || 'GET';
  const requiresAuth = options.requiresAuth !== false;
  const timeoutMs = options.timeoutMs || 15000;

  let fullUrl = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  if (options.params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
    }
  }

  if (requiresAuth && !secret) {
    logApiRequest('MovieBox API', method, endpoint, 401, 'MOVIEBOX_SECRET is not configured');
    return {
      ok: false,
      status: 401,
      error: 'MOVIEBOX_SECRET is not configured on the server. Please add MOVIEBOX_SECRET to your .env file or server environment.',
      code: 'SECRET_MISSING'
    };
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 CRATOR/2.4',
  };

  if (requiresAuth && secret) {
    headers['X-Worker-Secret'] = secret;
  }

  let requestBody: string | undefined;
  if (options.body && (method === 'POST' || method === 'PUT')) {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(options.body);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(fullUrl, {
      method,
      headers,
      body: requestBody,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    logApiRequest('MovieBox API', method, endpoint, response.status);

    const contentType = response.headers.get('content-type') || '';
    let data: any;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMsg = response.status === 401
        ? 'Cloudflare Worker rejected X-Worker-Secret (HTTP 401 Unauthorized). Please check your MOVIEBOX_SECRET configuration.'
        : (typeof data === 'object' && data?.error ? data.error : (typeof data === 'string' ? data : `Worker returned HTTP ${response.status}`));
      
      logApiRequest('MovieBox API', method, endpoint, response.status, errorMsg);

      return {
        ok: false,
        status: response.status,
        error: errorMsg,
        code: response.status === 401 ? 'WORKER_AUTH_401' : `HTTP_${response.status}`,
        data,
      };
    }

    return {
      ok: true,
      status: response.status,
      data,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === 'AbortError';
    const message = isTimeout ? 'Request timed out after 15s' : (err.message || 'Network error');
    logApiRequest('MovieBox API', method, endpoint, 500, message);
    return {
      ok: false,
      status: isTimeout ? 504 : 500,
      error: message,
      code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
    };
  }
}

// ==================== TMDB API ROUTES ====================

// 1. Status & Configuration
app.get('/api/tmdb/status', async (_req: Request, res: Response) => {
  const key = getTmdbKey();
  const hasKey = Boolean(key);
  let isVerified = false;

  if (hasKey) {
    try {
      const testRes = await callTmdbApi('/trending/all/day', {});
      isVerified = testRes.ok;
    } catch {
      isVerified = false;
    }
  }

  res.json({
    status: 'ok',
    configured: hasKey,
    hasKey,
    isVerified,
  });
});

app.post('/api/tmdb/set-key', async (req: Request, res: Response) => {
  const { apiKey } = req.body || {};
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ error: 'API Key must be a non-empty string' });
  }

  const cleanKey = apiKey.trim();
  process.env.TMDB_API_KEY = cleanKey;

  // Persist to .env
  try {
    const envPath = path.resolve(__dirname, '.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    if (envContent.includes('TMDB_API_KEY=')) {
      envContent = envContent.replace(/TMDB_API_KEY=.*/g, `TMDB_API_KEY="${cleanKey}"`);
    } else {
      envContent += `\nTMDB_API_KEY="${cleanKey}"`;
    }
    fs.writeFileSync(envPath, envContent, 'utf8');
  } catch (e) {
    console.warn('Could not write TMDB key to .env:', e);
  }

  // Test verify key
  const testRes = await callTmdbApi('/trending/all/day', {});

  res.json({
    success: true,
    verified: testRes.ok,
    status: testRes.status,
    message: testRes.ok 
      ? 'TMDB API key verified successfully! High-res artwork and metadata activated.'
      : 'Key saved, but TMDB returned an error. Please verify your API key.',
  });
});

// 2. Trending on TMDB
app.get('/api/tmdb/trending', async (_req: Request, res: Response) => {
  const result = await callTmdbApi('/trending/all/week', { language: 'en-US' });
  if (!result.ok) {
    return res.status(result.status || 500).json(result);
  }
  res.json(result.data);
});

// 3. Search on TMDB
app.get('/api/tmdb/search', async (req: Request, res: Response) => {
  const query = req.query.query ? String(req.query.query) : '';
  const page = req.query.page ? Number(req.query.page) : 1;

  if (!query.trim()) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  const result = await callTmdbApi('/search/multi', {
    query: query.trim(),
    include_adult: 'false',
    language: 'en-US',
    page,
  });

  if (!result.ok) {
    return res.status(result.status || 500).json(result);
  }
  res.json(result.data);
});

// 4. Movie Details
app.get('/api/tmdb/movie/:id', async (req: Request, res: Response) => {
  const result = await callTmdbApi(`/movie/${req.params.id}`, {
    append_to_response: 'credits,videos,recommendations',
    language: 'en-US',
  });
  if (!result.ok) return res.status(result.status || 500).json(result);
  res.json(result.data);
});

// 5. TV Show Details
app.get('/api/tmdb/tv/:id', async (req: Request, res: Response) => {
  const result = await callTmdbApi(`/tv/${req.params.id}`, {
    append_to_response: 'credits,videos,recommendations',
    language: 'en-US',
  });
  if (!result.ok) return res.status(result.status || 500).json(result);
  res.json(result.data);
});

// 6. TV Season Episodes
app.get('/api/tmdb/tv/:id/season/:season_number', async (req: Request, res: Response) => {
  const result = await callTmdbApi(`/tv/${req.params.id}/season/${req.params.season_number}`, {
    language: 'en-US',
  });
  if (!result.ok) return res.status(result.status || 500).json(result);
  res.json(result.data);
});

// 7. Popular Movies/Series
app.get('/api/tmdb/popular/:type', async (req: Request, res: Response) => {
  const endpoint = req.params.type === 'tv' || req.params.type === 'series' ? '/tv/popular' : '/movie/popular';
  const page = req.query.page ? Number(req.query.page) : 1;
  const result = await callTmdbApi(endpoint, { language: 'en-US', page });
  if (!result.ok) return res.status(result.status || 500).json(result);
  res.json(result.data);
});

// 8. Top Rated Movies/Series
app.get('/api/tmdb/top_rated/:type', async (req: Request, res: Response) => {
  const endpoint = req.params.type === 'tv' || req.params.type === 'series' ? '/tv/top_rated' : '/movie/top_rated';
  const page = req.query.page ? Number(req.query.page) : 1;
  const result = await callTmdbApi(endpoint, { language: 'en-US', page });
  if (!result.ok) return res.status(result.status || 500).json(result);
  res.json(result.data);
});

// 9. Recommendations & Similar Titles
app.get('/api/tmdb/:type/:id/recommendations', async (req: Request, res: Response) => {
  const mediaType = req.params.type === 'tv' || req.params.type === 'series' ? 'tv' : 'movie';
  const cleanId = String(req.params.id).replace(/^tmdb-(movie|tv|series)-/, '');
  const result = await callTmdbApi(`/${mediaType}/${cleanId}/recommendations`, { language: 'en-US', page: 1 });
  if (!result.ok) return res.status(result.status || 500).json(result);
  res.json(result.data);
});

// ==================== SAFE DIAGNOSTIC ROUTE ====================
app.get('/api/debug/secret-diagnostic', (_req: Request, res: Response) => {
  const hasProcessEnv = 'MOVIEBOX_SECRET' in process.env;
  const processEnvLength = (process.env.MOVIEBOX_SECRET || '').trim().length;
  const isProcessEnvNonEmpty = processEnvLength > 0;

  let envFileContains = false;
  let envFileEmpty = true;
  try {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^MOVIEBOX_SECRET=["']?(.*?)["']?$/m);
      if (match) {
        envFileContains = true;
        envFileEmpty = !match[1] || match[1].trim().length === 0;
      }
    }
  } catch {}

  const activeSecret = getMovieBoxSecret();
  const configSource = isProcessEnvNonEmpty 
    ? 'process.env.MOVIEBOX_SECRET' 
    : (!envFileEmpty ? '.env file' : 'none');

  res.json({
    processEnvExists: hasProcessEnv,
    processEnvTrimmedLengthGreaterThanZero: isProcessEnvNonEmpty,
    envFileContainsVariable: envFileContains,
    envFileValueIsEmpty: envFileEmpty,
    configurationSource: configSource,
    secretLoadedInternally: activeSecret.length > 0,
  });
});

app.get('/api/debug/probe-worker-search', async (req: Request, res: Response) => {
  const query = String(req.query.q || 'The Remarried Empress');
  const baseUrl = getMovieBoxUrl();
  const secret = getMovieBoxSecret();

  const tests = [
    {
      label: 'POST JSON { keyword }',
      fn: () => callMovieBoxApi('/search', { method: 'POST', body: { keyword: query, page: 1, perPage: 20 }, requiresAuth: true })
    },
    {
      label: 'POST JSON { keyword, type: 0 }',
      fn: () => callMovieBoxApi('/search', { method: 'POST', body: { keyword: query, type: 0, page: 1, perPage: 20 }, requiresAuth: true })
    },
    {
      label: 'POST JSON { keyword, subjectType: 0 }',
      fn: () => callMovieBoxApi('/search', { method: 'POST', body: { keyword: query, subjectType: 0, page: 1, perPage: 20 }, requiresAuth: true })
    },
    {
      label: 'POST params query { keyword } & empty body',
      fn: () => callMovieBoxApi('/search', { method: 'POST', params: { keyword: query }, body: {}, requiresAuth: true })
    },
    {
      label: 'POST urlencoded body',
      fn: async () => {
        const bodyStr = new URLSearchParams({ keyword: query, page: '1', perPage: '20' }).toString();
        const r = await fetch(`${baseUrl}/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Worker-Secret': secret,
            'User-Agent': 'Mozilla/5.0'
          },
          body: bodyStr
        });
        const text = await r.text();
        return { ok: r.ok, status: r.status, data: text };
      }
    }
  ];

  const results: any[] = [];
  for (const t of tests) {
    try {
      const res = await t.fn();
      results.push({
        label: t.label,
        status: res.status,
        ok: res.ok,
        data: typeof res.data === 'object' ? JSON.stringify(res.data).slice(0, 160) : String(res.data).slice(0, 160)
      });
    } catch (e: any) {
      results.push({ label: t.label, error: e.message });
    }
  }

  res.json({ query, results });
});

app.get('/api/debug/probe-subject/:id', async (req: Request, res: Response) => {
  const subjectId = req.params.id;
  const baseUrl = getMovieBoxUrl();
  const secret = getMovieBoxSecret();

  const paths = [
    `/info/${subjectId}`,
    `/season/${subjectId}`,
    `/stream/${subjectId}?se=0&ep=0`,
    `/stream/${subjectId}?se=1&ep=1`,
    `/stream/${subjectId}/all`,
    `/download/${subjectId}`,
  ];

  const results: any[] = [];
  for (const p of paths) {
    try {
      const resp = await fetch(`${baseUrl}${p}`, {
        headers: {
          'Accept': 'application/json',
          'X-Worker-Secret': secret,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36 CRATOR/2.4',
        }
      });
      const text = await resp.text();
      let parsed: any;
      try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, 200); }
      results.push({
        path: p,
        status: resp.status,
        headers: Object.fromEntries(resp.headers.entries()),
        data: parsed,
      });
    } catch (e: any) {
      results.push({ path: p, error: e.message });
    }
  }

  res.json({ subjectId, results });
});

// ==================== MOVIEBOX API ROUTES ====================

app.get('/api/moviebox/health', async (_req: Request, res: Response) => {
  const result = await callMovieBoxApi('/health', { requiresAuth: false });
  res.status(result.status || (result.ok ? 200 : 500)).json(result.data || result);
});

app.get('/api/moviebox/status', async (_req: Request, res: Response) => {
  const secret = getMovieBoxSecret();
  const hasSecret = Boolean(secret);
  let isVerified = false;

  if (hasSecret) {
    try {
      const testRes = await callMovieBoxApi('/home/rows', { requiresAuth: true, timeoutMs: 5000 });
      isVerified = testRes.ok;
    } catch {
      isVerified = false;
    }
  }

  res.json({
    status: 'ok',
    configured: hasSecret,
    apiUrl: getMovieBoxUrl(),
    hasSecret,
    isVerified,
    hasTmdb: Boolean(getTmdbKey()),
    hasSupabase: Boolean(process.env.VITE_SUPABASE_URL),
  });
});

app.post('/api/moviebox/set-secret', async (req: Request, res: Response) => {
  const configuredAdminToken = process.env.CRATOR_ADMIN_TOKEN || '';
  const suppliedAdminToken = req.get('X-Crator-Admin-Token') || '';
  if (!configuredAdminToken) {
    return res.status(503).json({ success: false, verified: false, error: 'Secret updates are disabled until CRATOR_ADMIN_TOKEN is configured on the server.' });
  }
  const expected = Buffer.from(configuredAdminToken);
  const supplied = Buffer.from(suppliedAdminToken);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return res.status(401).json({ success: false, verified: false, error: 'Admin token is missing or invalid.', code: 'ADMIN_AUTH_REQUIRED' });
  }

  const { secret, apiUrl } = req.body || {};

  if (!secret || typeof secret !== 'string') {
    return res.status(400).json({ error: 'Secret must be a non-empty string', code: 'INVALID_SECRET' });
  }

  const cleanSecret = secret.trim();
  process.env.MOVIEBOX_SECRET = cleanSecret;

  if (apiUrl && typeof apiUrl === 'string') {
    process.env.MOVIEBOX_API_URL = apiUrl.trim();
  }

  try {
    const envPath = path.resolve(__dirname, '.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    if (envContent.includes('MOVIEBOX_SECRET=')) {
      envContent = envContent.replace(/MOVIEBOX_SECRET=.*/g, `MOVIEBOX_SECRET="${cleanSecret}"`);
    } else {
      envContent += `\nMOVIEBOX_SECRET="${cleanSecret}"`;
    }

    if (apiUrl) {
      if (envContent.includes('MOVIEBOX_API_URL=')) {
        envContent = envContent.replace(/MOVIEBOX_API_URL=.*/g, `MOVIEBOX_API_URL="${apiUrl.trim()}"`);
      } else {
        envContent += `\nMOVIEBOX_API_URL="${apiUrl.trim()}"`;
      }
    }

    fs.writeFileSync(envPath, envContent, 'utf8');
  } catch (e) {
    console.warn('Could not persist secret to .env file:', e);
  }

  const verifyRes = await callMovieBoxApi('/home/rows', { requiresAuth: true, timeoutMs: 5000 });

  res.json({
    success: true,
    verified: verifyRes.ok,
    status: verifyRes.status,
    message: verifyRes.ok 
      ? 'MovieBox API key authenticated and verified successfully!' 
      : 'Key saved, but worker returned 401 Unauthorized. Check your secret.'
  });
});

// ==================== DISCOVERED MOVIEBOX CATALOGUE CACHE ====================
interface DiscoveredSubject {
  subjectId: string;
  title: string;
  type: string;
  subjectType?: number;
  releaseDate?: string;
  genre?: string;
  poster?: string;
  thumbnail?: string;
  country?: string;
  rowTitle?: string;
}

const CACHE_FILE_PATH = path.resolve(__dirname, '.moviebox-cache.json');
const discoveredMovieBoxSubjects = new Map<string, DiscoveredSubject>();
let isIndexingMovieBox = false;
let lastIndexTimestamp = 0;
let totalDiscoveredRowsCount = 0;

function loadDiscoveredCatalogFromDisk() {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const raw = fs.readFileSync(CACHE_FILE_PATH, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item && item.subjectId) {
            discoveredMovieBoxSubjects.set(String(item.subjectId), item);
          }
        }
        lastIndexTimestamp = Date.now();
        console.log(`[MovieBox API] Loaded ${discoveredMovieBoxSubjects.size} verified subjects from disk cache.`);
      }
    }
  } catch (err: any) {
    console.warn('[MovieBox API] Could not load disk cache:', err.message);
  }
}

function saveDiscoveredCatalogToDisk() {
  try {
    const list = Array.from(discoveredMovieBoxSubjects.values());
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(list, null, 2), 'utf8');
  } catch (err: any) {
    console.warn('[MovieBox API] Could not save disk cache:', err.message);
  }
}

// Immediately load disk cache on module evaluation
loadDiscoveredCatalogFromDisk();

async function syncMovieBoxDiscoveredCatalog(force: boolean = false) {
  if (isIndexingMovieBox) return;
  // If indexed recently and has healthy count, skip unless forced
  if (!force && discoveredMovieBoxSubjects.size >= 400 && (Date.now() - lastIndexTimestamp < 60 * 60 * 1000)) {
    return;
  }

  isIndexingMovieBox = true;
  try {
    const rowsRes = await callMovieBoxApi('/home/rows', { requiresAuth: true });
    if (!rowsRes.ok || !rowsRes.data) return;

    const rows = Array.isArray(rowsRes.data) ? rowsRes.data : (rowsRes.data.rows || []);
    if (!rows.length) return;
    totalDiscoveredRowsCount = rows.length;

    // Parallel fetch batches of rows
    const batchSize = 6;
    for (let i = 0; i < rows.length; i += batchSize) {
      const slice = rows.slice(i, i + batchSize);
      await Promise.allSettled(slice.map(async (row: any) => {
        if (!row.opId) return;
        let subRes = await callMovieBoxApi('/home/subjects', {
          params: { opId: String(row.opId) },
          requiresAuth: true,
          timeoutMs: 8000
        });

        // Safe retry once on transient timeout or 502/503/504
        if (!subRes.ok && (!subRes.status || subRes.status >= 500)) {
          await new Promise((r) => setTimeout(r, 600));
          subRes = await callMovieBoxApi('/home/subjects', {
            params: { opId: String(row.opId) },
            requiresAuth: true,
            timeoutMs: 8000
          });
        }

        if (subRes.ok && subRes.data?.subjects) {
          for (const s of subRes.data.subjects) {
            if (s.subjectId && !discoveredMovieBoxSubjects.has(String(s.subjectId))) {
              discoveredMovieBoxSubjects.set(String(s.subjectId), {
                subjectId: String(s.subjectId),
                title: s.title || '',
                type: s.type || (s.subjectType === 2 ? 'tv' : 'movie'),
                subjectType: s.subjectType,
                releaseDate: s.releaseDate,
                genre: s.genre,
                poster: s.poster,
                thumbnail: s.thumbnail,
                country: s.country,
                rowTitle: row.title
              });
            }
          }
        }
      }));
    }

    lastIndexTimestamp = Date.now();
    saveDiscoveredCatalogToDisk();
    console.log(`[MovieBox API] Synchronized discovered catalogue index: ${discoveredMovieBoxSubjects.size} verified titles.`);
  } catch (err: any) {
    console.warn('[MovieBox API] Catalogue sync error:', err.message);
  } finally {
    isIndexingMovieBox = false;
  }
}

app.get('/api/moviebox/catalog/stats', (_req: Request, res: Response) => {
  res.json({
    totalRowsDiscovered: totalDiscoveredRowsCount || 48,
    totalUniqueSubjectsIndexed: discoveredMovieBoxSubjects.size,
    isIndexing: isIndexingMovieBox,
    lastIndexTimestamp,
    persistedOnDisk: fs.existsSync(CACHE_FILE_PATH),
    sample: Array.from(discoveredMovieBoxSubjects.values()).slice(0, 5)
  });
});

app.post('/api/moviebox/catalog/sync', async (req: Request, res: Response) => {
  const force = Boolean(req.body?.force);
  syncMovieBoxDiscoveredCatalog(force).catch(() => {});
  res.json({ message: 'Synchronization triggered', totalIndexed: discoveredMovieBoxSubjects.size });
});

app.post('/api/moviebox/search', async (req: Request, res: Response) => {
  const { keyword, page = 1, perPage = 20 } = req.body || {};

  if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
    return res.status(400).json({ error: 'Search keyword is required', code: 'INVALID_KEYWORD' });
  }

  const cleanKeyword = keyword.trim();

  // Trigger background catalog sync if empty
  if (discoveredMovieBoxSubjects.size === 0) {
    syncMovieBoxDiscoveredCatalog().catch(() => {});
  }

  // 1. Call upstream Cloudflare Worker search
  const result = await callMovieBoxApi('/search', {
    method: 'POST',
    body: {
      keyword: cleanKeyword,
      page: Number(page) || 1,
      perPage: Number(perPage) || 20,
    },
    requiresAuth: true,
  });

  // If worker returned items, return them directly
  if (result.ok && result.data?.items && result.data.items.length > 0) {
    return res.json(result.data);
  }

  // 2. If worker search returns 0 items, search our verified discovered MovieBox catalogue
  const lowerKw = cleanKeyword.toLowerCase().trim();
  const matchedSubjects: any[] = [];
  const kwTokens = lowerKw.split(/[^a-z0-9]+/).filter((t) => t.length >= 3);

  for (const s of discoveredMovieBoxSubjects.values()) {
    const sTitle = s.title.toLowerCase();
    const cleanSTitle = sTitle.replace(/\[.*?\]/g, '').trim();

    // Exact or phrase containment (e.g. "one piece" in "one piece [netflix]")
    const isPhraseMatch = sTitle.includes(lowerKw) || cleanSTitle.includes(lowerKw);

    // Multi-token match: all significant query tokens must exist as whole words
    const sTokens = new Set(cleanSTitle.split(/[^a-z0-9]+/).filter((t) => t.length >= 3));
    const allTokensMatch = kwTokens.length > 0 && kwTokens.every((t) => sTokens.has(t));

    if (isPhraseMatch || allTokensMatch) {
      matchedSubjects.push({
        subjectId: s.subjectId,
        title: s.title,
        type: s.type,
        releaseDate: s.releaseDate,
        genre: s.genre,
        poster: s.poster,
        thumbnail: s.thumbnail,
        source: 'moviebox-homepage-discovery',
      });
    }
  }

  if (matchedSubjects.length > 0) {
    return res.json({
      items: matchedSubjects.slice(0, Number(perPage) || 20),
      total: matchedSubjects.length,
      page: Number(page) || 1,
      perPage: Number(perPage) || 20,
      source: 'moviebox-verified-discovery-index',
    });
  }

  // If upstream was ok (status 200 with items: []) and no matches in discovered index, return upstream response
  if (result.ok) {
    return res.json(result.data || { items: [], pager: null });
  }

  return res.status(result.status || 500).json(result);
});

app.get('/api/moviebox/home', async (_req: Request, res: Response) => {
  const result = await callMovieBoxApi('/home', { requiresAuth: true });
  if (!result.ok) return res.status(result.status || 500).json(result);
  res.json(result.data);
});

app.get('/api/moviebox/home/rows', async (_req: Request, res: Response) => {
  const result = await callMovieBoxApi('/home/rows', { requiresAuth: true });
  if (!result.ok) return res.status(result.status || 500).json(result);
  res.json(result.data);
});

app.get('/api/moviebox/home/subjects', async (req: Request, res: Response) => {
  const opId = req.query.opId;
  if (!opId) return res.status(400).json({ error: 'opId query parameter is required' });

  const result = await callMovieBoxApi('/home/subjects', {
    params: { opId: String(opId) },
    requiresAuth: true,
  });

  if (!result.ok) return res.status(result.status || 500).json(result);
  res.json(result.data);
});

// ─── Direct H5 Web Client Helper ──────────────────────────────────────────────
async function fetchH5SubjectDetail(subjectId: string): Promise<any | null> {
  const hosts = ['https://h5.aoneroom.com', 'https://netnaija.film', 'https://moviebox.pk'];
  const headers = {
    'X-Client-Info': '{"timezone":"Africa/Lagos"}',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0',
    'X-Forwarded-For': '197.210.65.1',
  };

  for (const host of hosts) {
    try {
      const res = await fetch(`${host}/wefeed-h5-bff/web/subject/detail?subjectId=${encodeURIComponent(subjectId)}`, {
        headers,
        signal: AbortSignal.timeout(7000),
      });
      if (!res.ok) continue;
      const json = await res.json() as any;
      if (json && json.code === 0 && json.data) {
        return json.data;
      }
    } catch {}
  }
  return null;
}

app.get('/api/moviebox/info/:subjectId', async (req: Request, res: Response) => {
  const subjectId = req.params.subjectId;
  // 1. Try worker mobile endpoint
  const result = await callMovieBoxApi(`/info/${encodeURIComponent(subjectId)}`, { requiresAuth: true });
  if (result.ok && result.data && !result.data.error) {
    return res.json(result.data);
  }

  // 2. Fallback to direct H5 subject detail
  const h5Data = await fetchH5SubjectDetail(subjectId);
  if (h5Data?.subject) {
    const s = h5Data.subject;
    const staffList = (h5Data.stars || []).map((star: any) => ({
      name: star.name || star.starName,
      role: star.character || star.role || 'Actor',
      avatar: star.avatar?.url || star.headImg || null,
    }));
    return res.json({
      subjectId: s.subjectId,
      subjectType: s.subjectType,
      type: s.subjectType === 2 ? 'tv' : 'movie',
      title: s.title,
      description: s.description || '',
      releaseDate: s.releaseDate || null,
      runtime: s.duration && s.duration > 0 ? Math.round(s.duration / 60) : null,
      genre: s.genre || null,
      poster: s.cover?.url || null,
      country: s.countryName || null,
      rating: s.imdbRatingValue ? parseFloat(s.imdbRatingValue) : null,
      hasResource: Boolean(s.hasResource),
      language: s.subtitles || null,
      staff: staffList,
      source: 'moviebox-h5-detail',
    });
  }

  return res.status(result.status || 404).json(result.data || { error: 'Not found', code: 'HTTP_404' });
});

app.get('/api/moviebox/season/:subjectId', async (req: Request, res: Response) => {
  const subjectId = req.params.subjectId;
  // 1. Try worker mobile endpoint
  const result = await callMovieBoxApi(`/season/${encodeURIComponent(subjectId)}`, { requiresAuth: true });
  if (result.ok && result.data?.seasons && result.data.seasons.length > 0) {
    return res.json(result.data);
  }

  // 2. Fallback to direct H5 detail which embeds resource seasons
  const h5Data = await fetchH5SubjectDetail(subjectId);
  if (h5Data?.resource?.seasons && h5Data.resource.seasons.length > 0) {
    const seasons = h5Data.resource.seasons.map((s: any) => {
      const maxEp = s.maxEp || 1;
      return {
        season: s.se,
        totalEpisode: maxEp,
        episodesAvailable: maxEp,
        resolutions: s.resolutions || [],
        episodes: Array.from({ length: maxEp }, (_, i) => ({
          episode: i + 1,
          seasonNumber: s.se,
          episodeNumber: i + 1,
          title: `Episode ${i + 1}`,
        })),
      };
    });
    return res.json({ seasons, source: 'moviebox-h5-resource-seasons' });
  }

  if (result.ok) {
    return res.json(result.data || { seasons: [] });
  }
  return res.status(result.status || 500).json(result);
});

app.get('/api/moviebox/stream/:subjectId', async (req: Request, res: Response) => {
  const se = req.query.se !== undefined ? String(req.query.se) : '0';
  const ep = req.query.ep !== undefined ? String(req.query.ep) : '0';
  const subjectId = req.params.subjectId;

  // 1. Try worker mobile endpoint
  const result = await callMovieBoxApi(`/stream/${encodeURIComponent(subjectId)}`, {
    params: { se, ep },
    requiresAuth: true,
  });

  if (result.ok && result.data && (typeof result.data.url === 'string' || (Array.isArray(result.data.streams) && result.data.streams.length > 0))) {
    return res.json(result.data);
  }

  // Playback must use the configured Worker result; do not fall back to a
  // separate provider endpoint when the Worker reports no accessible stream.
  if (!result.ok) return res.status(result.status || 500).json(result);
  return res.status(502).json({ error: 'MovieBox returned an invalid or empty stream response.', code: 'INVALID_STREAM_RESPONSE' });
});

app.get('/api/moviebox/stream/:subjectId/all', async (req: Request, res: Response) => {
  const result = await callMovieBoxApi(`/stream/${encodeURIComponent(req.params.subjectId)}/all`, { requiresAuth: true });
  if (!result.ok) return res.status(result.status || 500).json(result);
  res.json(result.data);
});

app.get('/api/moviebox/download/:subjectId', async (req: Request, res: Response) => {
  const result = await callMovieBoxApi(`/download/${encodeURIComponent(req.params.subjectId)}`, { requiresAuth: true });
  if (!result.ok) return res.status(result.status || 500).json(result);
  res.json(result.data);
});

// ==================== VITE SPA SETUP ====================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CRATOR streaming server listening on http://0.0.0.0:${PORT}`);
    console.log(`MovieBox API target: ${getMovieBoxUrl()}`);
    console.log(`MovieBox process.env.MOVIEBOX_SECRET exists: ${'MOVIEBOX_SECRET' in process.env}`);
    console.log(`MovieBox process.env.MOVIEBOX_SECRET length > 0: ${(process.env.MOVIEBOX_SECRET || '').trim().length > 0}`);
    console.log(`MovieBox Secret loaded internally: ${Boolean(getMovieBoxSecret())}`);
    console.log(`TMDB API configured: ${Boolean(getTmdbKey())}`);

    // Synchronize discovered MovieBox homepage catalogue index
    if (getMovieBoxSecret()) {
      syncMovieBoxDiscoveredCatalog().catch((e) => {
        console.warn('Initial catalogue sync error:', e);
      });
    }
  });
}

startServer().catch((err) => {
  console.error('Failed to start CRATOR server:', err);
  process.exit(1);
});
