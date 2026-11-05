import { MediaItem, Season, Episode, MediaType, StreamingPlatform } from '../types';

export interface MovieBoxStatus {
  status: string;
  configured: boolean;
  apiUrl: string;
  hasSecret: boolean;
  isVerified?: boolean;
  hasSupabase?: boolean;
}

export interface MovieBoxSearchResponse {
  items: MediaItem[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
  error?: string;
  errorCode?: string;
}

export interface MovieBoxRowInfo {
  opId: string | number;
  title: string;
}

export interface StreamOption {
  url: string;
  quality: string;
  format?: 'hls' | 'mp4' | 'dash' | 'unknown';
  size?: string;
}

export interface MovieBoxStreamResult {
  streamUrl?: string;
  streams?: StreamOption[];
  format?: 'hls' | 'mp4' | 'dash' | 'unknown';
  subtitles?: Array<{ language: string; url: string }>;
  error?: string;
  errorCode?: string;
  subjectId?: string;
  resolvedTitle?: string;
  duration?: number | string;
}

// Map raw MovieBox subject to CRATOR's MediaItem
export function mapMovieBoxSubjectToMediaItem(raw: any): MediaItem {
  if (!raw) {
    return {
      id: 'unknown-' + Math.random().toString(36).substring(2, 7),
      title: 'Unknown Title',
      type: 'movie',
      synopsis: '',
      posterUrl: '',
      backdropUrl: '',
      rating: 7.5,
      voteCount: '10K',
      releaseYear: new Date().getFullYear(),
      ageRating: 'PG-13',
      quality: '4K Ultra HD',
      audio: 'Dolby Atmos',
      genres: ['Drama'],
      platform: 'Netflix',
      industry: 'Hollywood',
      language: 'English',
      cast: [],
    };
  }

  const id = String(raw.subjectId || raw.id || raw.item_id || raw.media_id || `mb-${Math.random().toString(36).substring(2, 7)}`);
  const title = raw.title || raw.name || raw.subject_name || raw.original_title || 'Untitled';

  // Normalize image paths
  let posterUrl = raw.cover || raw.poster || raw.posterUrl || raw.img || raw.pic || raw.poster_path || '';
  if (typeof posterUrl === 'string' && posterUrl.startsWith('/') && !posterUrl.startsWith('//')) {
    posterUrl = `https://image.tmdb.org/t/p/w780${posterUrl}`;
  }
  let backdropUrl = raw.backdrop || raw.banner || raw.backdropUrl || raw.banner_url || raw.backdrop_path || posterUrl;
  if (typeof backdropUrl === 'string' && backdropUrl.startsWith('/') && !backdropUrl.startsWith('//')) {
    backdropUrl = `https://image.tmdb.org/t/p/w1280${backdropUrl}`;
  }

  // Determine media type
  let type: MediaType = 'movie';
  const rawType = String(raw.subjectType || raw.type || '').toLowerCase();
  if (rawType === '2' || rawType.includes('tv') || rawType.includes('series') || rawType.includes('show')) {
    type = 'series';
  } else if (rawType === '3' || rawType.includes('anime')) {
    type = 'anime';
  }

  // Parse rating
  const rawScore = Number(raw.score || raw.rating || raw.imdb_score || raw.rate);
  const rating = !isNaN(rawScore) && rawScore > 0 ? (rawScore > 10 ? rawScore / 10 : rawScore) : 8.2;

  // Parse release year
  let releaseYear = new Date().getFullYear();
  if (raw.releaseDate || raw.year || raw.release_year || raw.date) {
    const parsedYear = parseInt(String(raw.releaseDate || raw.year || raw.release_year || raw.date), 10);
    if (!isNaN(parsedYear) && parsedYear > 1900 && parsedYear < 2100) {
      releaseYear = parsedYear;
    }
  }

  // Parse genres
  let genres: string[] = [];
  if (Array.isArray(raw.genre || raw.genres)) {
    genres = (raw.genre || raw.genres).map((g: any) => typeof g === 'string' ? g : (g.name || String(g)));
  } else if (typeof (raw.genre || raw.genres) === 'string') {
    genres = (raw.genre || raw.genres).split(/[,/|]/).map((s: string) => s.trim()).filter(Boolean);
  }
  if (!genres.length) {
    genres = [type === 'anime' ? 'Anime' : 'Drama', 'Action'];
  }

  // Infer or map streaming platform
  let platform: StreamingPlatform = 'Netflix';
  const platformStr = String(raw.platform || raw.source || raw.network || '').toLowerCase();
  if (platformStr.includes('apple')) platform = 'Apple TV+';
  else if (platformStr.includes('hbo') || platformStr.includes('max')) platform = 'HBO Max';
  else if (platformStr.includes('disney')) platform = 'Disney+';
  else if (platformStr.includes('prime') || platformStr.includes('amazon')) platform = 'Prime Video';
  else if (platformStr.includes('paramount')) platform = 'Paramount+';

  // Parse cast members
  const cast = Array.isArray(raw.cast || raw.actors || raw.staff) 
    ? (raw.cast || raw.actors || raw.staff).map((c: any) => ({
        name: typeof c === 'string' ? c : (c.name || 'Actor'),
        character: typeof c === 'object' ? (c.character || c.role || 'Main Role') : 'Main Cast',
        avatar: typeof c === 'object' ? (c.avatar || c.img || c.profile_path || '') : '',
      }))
    : [];

  return {
    id,
    title,
    originalTitle: raw.original_title || raw.originalTitle || undefined,
    type,
    tagline: raw.tagline || raw.quote || undefined,
    synopsis: raw.description || raw.synopsis || raw.intro || raw.plot || raw.overview || 'No synopsis available for this title.',
    posterUrl,
    backdropUrl,
    rating: parseFloat(rating.toFixed(1)),
    voteCount: raw.voteCount || raw.votes || '120K',
    releaseYear,
    runtime: raw.runtime || raw.duration || (type === 'movie' ? '2h 10m' : undefined),
    totalSeasons: raw.totalSeasons || raw.season_count || (type === 'series' || type === 'anime' ? (raw.seasons?.length || 1) : undefined),
    ageRating: raw.ageRating || raw.certification || (type === 'anime' ? '16+' : 'PG-13'),
    quality: raw.quality || '4K Ultra HD',
    audio: raw.audio || 'Dolby Atmos',
    genres,
    platform,
    industry: type === 'anime' ? 'Anime' : (raw.industry || 'Hollywood'),
    language: raw.language || (type === 'anime' ? 'Japanese' : 'English'),
    director: raw.director || (Array.isArray(raw.directors) ? raw.directors[0]?.name : undefined),
    cast,
    videoUrl: raw.videoUrl || raw.streamUrl || undefined,
    movieBoxSubjectId: raw.subjectId ? String(raw.subjectId) : undefined,
    hasMovieBoxMatch: Boolean(raw.subjectId),
    matchConfidence: raw.subjectId ? 'verified' : 'unmatched',
    streamStatus: raw.subjectId ? 'available' : 'unavailable',
    fallbackPosterUrl: raw.thumbnail || raw.poster || raw.cover || undefined,
  };
}

// 1. Check Server MovieBox configuration
export async function getMovieBoxConfigStatus(): Promise<MovieBoxStatus> {
  try {
    const res = await fetch('/api/moviebox/status');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err: any) {
    return {
      status: 'error',
      configured: false,
      apiUrl: 'https://spun-moviebox.ravi-crator.workers.dev',
      hasSecret: false,
    };
  }
}

// 2. Search MovieBox with pagination & race-condition prevention
export async function searchMovieBox(
  keyword: string, 
  page: number = 1, 
  perPage: number = 20,
  signal?: AbortSignal
): Promise<MovieBoxSearchResponse> {
  if (!keyword || !keyword.trim()) {
    return { items: [], total: 0, page: 1, perPage, hasMore: false };
  }

  try {
    const res = await fetch('/api/moviebox/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: keyword.trim(), page, perPage }),
      signal,
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        items: [],
        total: 0,
        page,
        perPage,
        hasMore: false,
        error: data.error || `Search failed with status ${res.status}`,
        errorCode: data.code || `HTTP_${res.status}`,
      };
    }

    // Support nested data structures:
    // e.g. { data: { list: [...] } } or { list: [...] } or { subjects: [...] } or [...]
    let rawList: any[] = [];
    let total = 0;

    if (Array.isArray(data)) {
      rawList = data;
      total = rawList.length;
    } else if (Array.isArray(data.items)) {
      rawList = data.items;
      total = data.total || rawList.length;
    } else if (Array.isArray(data.subjects)) {
      rawList = data.subjects;
      total = data.total || rawList.length;
    } else if (Array.isArray(data.list)) {
      rawList = data.list;
      total = data.total || rawList.length;
    } else if (data.data) {
      if (Array.isArray(data.data)) {
        rawList = data.data;
        total = rawList.length;
      } else if (Array.isArray(data.data.list)) {
        rawList = data.data.list;
        total = data.data.total || rawList.length;
      } else if (Array.isArray(data.data.subjects)) {
        rawList = data.data.subjects;
        total = data.data.total || rawList.length;
      }
    }

    const items = rawList.map(mapMovieBoxSubjectToMediaItem);
    const hasMore = items.length >= perPage || (total > page * perPage);

    return {
      items,
      total: total || items.length,
      page,
      perPage,
      hasMore,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw err; // Allow abort to be handled by caller
    }
    return {
      items: [],
      total: 0,
      page,
      perPage,
      hasMore: false,
      error: err.message || 'Network request failed',
      errorCode: 'CLIENT_ERROR',
    };
  }
}

// 3. Discover Homepage Rows (/home/rows)
export async function getMovieBoxHomeRows(): Promise<MovieBoxRowInfo[]> {
  try {
    const res = await fetch('/api/moviebox/home/rows');
    if (!res.ok) return [];
    const data = await res.json();
    
    let rows: any[] = [];
    if (Array.isArray(data)) {
      rows = data;
    } else if (Array.isArray(data.rows)) {
      rows = data.rows;
    } else if (Array.isArray(data.data)) {
      rows = data.data;
    }

    return rows.map((r) => ({
      opId: r.opId ?? r.id ?? r.key,
      title: r.title || r.name || 'Featured Category',
    })).filter((r) => r.opId !== undefined);
  } catch {
    return [];
  }
}

// 4. Fetch Subjects for a Homepage Row (/home/subjects?opId=...)
export async function getMovieBoxRowSubjects(opId: string | number): Promise<MediaItem[]> {
  try {
    const res = await fetch(`/api/moviebox/home/subjects?opId=${encodeURIComponent(String(opId))}`);
    if (!res.ok) return [];
    const data = await res.json();

    let list: any[] = [];
    if (Array.isArray(data)) list = data;
    else if (Array.isArray(data.subjects)) list = data.subjects;
    else if (Array.isArray(data.items)) list = data.items;
    else if (Array.isArray(data.data)) list = data.data;
    else if (data.data && Array.isArray(data.data.subjects)) list = data.data.subjects;

    return list.map(mapMovieBoxSubjectToMediaItem);
  } catch {
    return [];
  }
}

// 5. Fetch Full MovieBox Homepage (/home)
export async function getMovieBoxHomeFeed(): Promise<any> {
  try {
    const res = await fetch('/api/moviebox/home');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// 6. Fetch Subject Detail (/info/:subjectId)
export async function getMovieBoxSubjectDetail(subjectId: string): Promise<MediaItem | null> {
  try {
    const res = await fetch(`/api/moviebox/info/${encodeURIComponent(subjectId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const detailData = data.data || data;
    return mapMovieBoxSubjectToMediaItem(detailData);
  } catch {
    return null;
  }
}

// 7. Fetch Seasons & Episodes (/season/:subjectId)
export async function getMovieBoxSeasons(subjectId: string): Promise<Season[]> {
  try {
    const res = await fetch(`/api/moviebox/season/${encodeURIComponent(subjectId)}`);
    if (!res.ok) return [];
    const data = await res.json();

    let rawSeasons: any[] = [];
    if (Array.isArray(data)) rawSeasons = data;
    else if (Array.isArray(data.seasons)) rawSeasons = data.seasons;
    else if (Array.isArray(data.data)) rawSeasons = data.data;

    return rawSeasons.map((s: any, sIdx: number) => {
      const seasonNumber = Number(s.seasonNumber || s.season || sIdx + 1);
      const rawEpisodes: any[] = Array.isArray(s.episodes) ? s.episodes : (Array.isArray(s.list) ? s.list : []);

      const episodes: Episode[] = rawEpisodes.map((ep: any, epIdx: number) => ({
        id: String(ep.id || ep.episodeId || `${subjectId}-s${seasonNumber}-e${epIdx + 1}`),
        episodeNumber: Number(ep.episodeNumber || ep.episode || epIdx + 1),
        seasonNumber,
        title: ep.title || ep.name || `Episode ${epIdx + 1}`,
        runtime: ep.runtime || ep.duration || '48m',
        synopsis: ep.synopsis || ep.description || ep.intro || '',
        thumbnail: ep.thumbnail || ep.cover || ep.img || '',
        videoUrl: ep.videoUrl || ep.streamUrl || undefined,
      }));

      return {
        seasonNumber,
        title: s.title || `Season ${seasonNumber}`,
        episodeCount: episodes.length,
        episodes,
      };
    });
  } catch {
    return [];
  }
}

// Helper to test if two movie/series titles match confidently
function isConfidentTitleMatch(candidate: string, target: string): boolean {
  if (!candidate || !target) return false;
  const clean = (s: string) => s.toLowerCase().replace(/^(the|a|an)\s+/i, '').replace(/[^a-z0-9]/g, '').trim();
  const c = clean(candidate);
  const t = clean(target);
  if (c === t) return true;
  // Handle roman numerals vs decimal numbers (e.g. "Chapter IV" vs "Chapter 4")
  const romanC = c.replace(/iv/g, '4').replace(/iii/g, '3').replace(/ii/g, '2');
  const romanT = t.replace(/iv/g, '4').replace(/iii/g, '3').replace(/ii/g, '2');
  return romanC === romanT;
}

// 8. Fetch Stream URLs (/stream/:subjectId?se=...&ep=...)
export async function getMovieBoxStream(
  subjectId: string, 
  season: number = 0, 
  episode: number = 0,
  title?: string
): Promise<MovieBoxStreamResult> {
  try {
    let resolvedSubjectId = subjectId;
    let resolvedTitle = title;

    // Check if subjectId is already a native MovieBox numerical/hex subject ID
    const isDirectMovieBoxId = /^\d+$/.test(subjectId) || (/^[a-f0-9]{16,32}$/i.test(subjectId) && !subjectId.includes('-'));

    // If subjectId is a mock catalog slug or TMDB ID, we must find its exact MovieBox subject ID
    if (!isDirectMovieBoxId && title) {
      const searchRes = await searchMovieBox(title, 1, 10);
      if (searchRes.error) {
        return {
          error: searchRes.error,
          errorCode: searchRes.errorCode || 'SEARCH_FAILED',
        };
      }

      if (!searchRes.items || searchRes.items.length === 0) {
        return {
          error: `Could not find "${title}" in the MovieBox catalog. Playback stopped to prevent playing wrong content.`,
          errorCode: 'TITLE_NOT_IN_CATALOG',
        };
      }

      // Strictly verify that the returned item matches the requested movie title
      const matched = searchRes.items.find((item) => {
        return isConfidentTitleMatch(item.title, title) || 
               (item.originalTitle ? isConfidentTitleMatch(item.originalTitle, title) : false);
      });

      if (!matched) {
        return {
          error: `Could not verify an exact match for "${title}" in MovieBox search results. Playback aborted to prevent playing unrelated content.`,
          errorCode: 'SUBJECT_MISMATCH',
        };
      }

      resolvedSubjectId = matched.id;
      resolvedTitle = matched.title;
    }

    // Call server-side stream endpoint
    const res = await fetch(`/api/moviebox/stream/${encodeURIComponent(resolvedSubjectId)}?se=${season}&ep=${episode}`);
    const data = await res.json();

    if (!res.ok) {
      return {
        error: data.error || `MovieBox stream request failed with status ${res.status}.`,
        errorCode: data.code || `HTTP_${res.status}`,
        subjectId: resolvedSubjectId,
        resolvedTitle,
      };
    }

    const payload = data.data || data;

    // Detect format and extract streams
    const streams: StreamOption[] = [];
    let primaryUrl = '';
    let format: 'hls' | 'mp4' | 'dash' | 'unknown' = 'mp4';

    if (typeof payload === 'string' && (payload.startsWith('http://') || payload.startsWith('https://'))) {
      primaryUrl = payload;
      format = payload.includes('.m3u8') ? 'hls' : 'mp4';
      streams.push({ url: payload, quality: 'Auto', format });
    } else if (payload && typeof payload === 'object') {
      const singleUrl = payload.url || payload.streamUrl || payload.playUrl || payload.fileUrl;
      if (singleUrl && typeof singleUrl === 'string' && (singleUrl.startsWith('http://') || singleUrl.startsWith('https://'))) {
        primaryUrl = singleUrl;
        format = primaryUrl.includes('.m3u8') ? 'hls' : 'mp4';
        streams.push({ url: primaryUrl, quality: payload.quality || payload.resolution || 'Auto', format });
      }

      if (Array.isArray(payload.streams || payload.qualities || payload.list || payload.urls)) {
        const list = payload.streams || payload.qualities || payload.list || payload.urls;
        for (const item of list) {
          const u = item.url || item.playUrl || item.streamUrl || (typeof item === 'string' ? item : '');
          if (u && (u.startsWith('http://') || u.startsWith('https://'))) {
            const itemFormat = u.includes('.m3u8') ? 'hls' : 'mp4';
            streams.push({
              url: u,
              quality: item.quality || item.resolution || item.name || 'Auto',
              format: itemFormat,
              size: item.size,
            });
          }
        }
      }
    }

    if (!primaryUrl && streams.length > 0) {
      primaryUrl = streams[0].url;
      format = streams[0].format || 'mp4';
    }

    // Validate that we actually received a playable URL
    if (!primaryUrl) {
      return {
        error: `MovieBox returned no stream URLs for "${resolvedTitle || title}" (Subject ID: ${resolvedSubjectId}).`,
        errorCode: 'EMPTY_STREAM_RESPONSE',
        subjectId: resolvedSubjectId,
        resolvedTitle,
      };
    }

    return {
      streamUrl: primaryUrl,
      streams,
      format,
      subjectId: resolvedSubjectId,
      resolvedTitle,
      duration: payload?.duration,
      subtitles: payload?.subtitles || [],
    };
  } catch (err: any) {
    return {
      error: err.message || 'Failed to communicate with stream backend',
      errorCode: 'STREAM_FETCH_EXCEPTION',
    };
  }
}

// 9. Update/Save Worker Secret on Server
export async function updateMovieBoxServerSecret(
  secret: string, 
  apiUrl?: string
): Promise<{ success: boolean; verified: boolean; message: string }> {
  try {
    const res = await fetch('/api/moviebox/set-secret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, apiUrl }),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      verified: false,
      message: err.message || 'Failed to communicate with server',
    };
  }
}

