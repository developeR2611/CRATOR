import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// AI Studio dev server and preview reverse proxy must run on port 3000
const PORT = 3000;

app.use(express.json());

// ==================== TMDB API CONFIGURATION ====================
const getTmdbKey = () => {
  return (
    process.env.TMDB_API_KEY ||
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
    'User-Agent': 'CRATOR-Cinema-4K/3.0',
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

// ==================== HEALTH & STATUS ROUTE ====================
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    streamingProvider: 'VidRift',
    metadataProvider: 'TMDB',
    hasTmdbKey: Boolean(getTmdbKey()),
  });
});

// ==================== VIDRIFT AVAILABILITY REGISTRY ====================
const availabilityCache = new Map<string, { available: boolean; reason: string; timestamp: number }>();

app.get('/api/vidrift/availability', (req: Request, res: Response) => {
  const tmdbId = req.query.tmdbId ? String(req.query.tmdbId) : '';
  const type = req.query.type ? String(req.query.type) : 'movie';

  if (!tmdbId) {
    return res.status(400).json({ error: 'tmdbId query parameter required' });
  }

  const key = `${type}:${tmdbId}`;
  const record = availabilityCache.get(key);

  if (record) {
    return res.json({ found: true, ...record });
  }

  res.json({ found: false, tmdbId, type, checkedAt: Date.now() });
});

app.post('/api/vidrift/availability', (req: Request, res: Response) => {
  const { tmdbId, type = 'movie', available = true, reason = 'client_verified' } = req.body || {};
  if (!tmdbId) {
    return res.status(400).json({ error: 'tmdbId required in body' });
  }

  const key = `${type}:${tmdbId}`;
  availabilityCache.set(key, {
    available: Boolean(available),
    reason: String(reason),
    timestamp: Date.now(),
  });

  res.json({ success: true, key, available });
});

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

// 4. Movie Details (including credits, recommendations, and official logos)
app.get('/api/tmdb/movie/:id', async (req: Request, res: Response) => {
  const result = await callTmdbApi(`/movie/${req.params.id}`, {
    append_to_response: 'credits,videos,recommendations,images',
    include_image_language: 'en,null',
    language: 'en-US',
  });
  if (!result.ok) return res.status(result.status || 500).json(result);
  res.json(result.data);
});

// 5. TV Show Details (including credits, recommendations, and official logos)
app.get('/api/tmdb/tv/:id', async (req: Request, res: Response) => {
  const result = await callTmdbApi(`/tv/${req.params.id}`, {
    append_to_response: 'credits,videos,recommendations,images',
    include_image_language: 'en,null',
    language: 'en-US',
  });
  if (!result.ok) return res.status(result.status || 500).json(result);
  res.json(result.data);
});

// 5b. Dedicated Movie/TV Images & Logos endpoint
app.get('/api/tmdb/:type/:id/images', async (req: Request, res: Response) => {
  const type = req.params.type === 'tv' || req.params.type === 'series' ? 'tv' : 'movie';
  const result = await callTmdbApi(`/${type}/${req.params.id}/images`, {
    include_image_language: 'en,null',
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

// ==================== VITE SPA SETUP ====================
async function startServer() {
  if (process.env.VERCEL === '1') return;

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
    console.log(`Streaming provider: VidRift (Keyless Embed)`);
    console.log(`TMDB metadata API configured: ${Boolean(getTmdbKey())}`);
  });
}

export default app;

if (process.env.VERCEL !== '1') {
  startServer().catch((err) => {
    console.error('Failed to start CRATOR server:', err);
    process.exit(1);
  });
}
