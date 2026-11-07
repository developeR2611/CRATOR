import { MediaItem } from '../../types';
import { ProviderResolutionResult, CineSrcMessageEvent } from './types';

export const CINESRC_BASE_ORIGIN = 'https://cinesrc.st';

/**
 * Built-in lookup mapping for CRATOR catalog items ensuring instant zero-latency
 * TMDB ID resolution for bundled movies, series, and anime.
 */
const KNOWN_TMDB_MAPPINGS: Record<string, number> = {
  // Movies
  'avatar-way-of-water': 76600,
  'avatar-2009': 19995,
  'dune-2': 693134,
  'dune-part-two': 693134,
  'interstellar': 157336,
  'oppenheimer': 872585,
  'the-batman': 414906,
  'blade-runner-2049': 335984,
  'spider-man-across-spider-verse': 569094,
  'john-wick-4': 603692,
  'inception': 27205,
  'poor-things': 792307,
  // Series & Anime
  'severance': 95396,
  'cyberpunk-edgerunners': 105248,
  'shogun': 126308,
  'arcane': 94605,
  'frieren-beyond-journeys-end': 209867,
  'the-last-of-us': 100088,
  'silo': 125988,
  'jujutsu-kaisen-shibuya-incident': 95479,
  'house-of-the-dragon': 94997,
  'demon-slayer-hashira-training-arc': 85937,
  'stranger-things': 66732,
  'stranger-things-4': 66732,
  'the-remarried-empress': 278148,
  'one-piece': 37854,
  'tulsa-king': 153312,
  'the-terminal-list': 120998,
};

// Memory cache for runtime-resolved TMDB IDs
const runtimeTmdbCache = new Map<string, number>();

/**
 * Validate a TMDB ID. Must be a positive integer.
 */
export function validateTmdbId(tmdbId: unknown): { valid: boolean; id?: number; error?: string } {
  if (tmdbId === null || tmdbId === undefined || tmdbId === '') {
    return { valid: false, error: 'TMDB ID is required for CineSRC playback.' };
  }

  const numericId = typeof tmdbId === 'number' ? tmdbId : parseInt(String(tmdbId).trim(), 10);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return { valid: false, error: `Invalid TMDB ID: "${tmdbId}". Must be a positive integer.` };
  }

  return { valid: true, id: numericId };
}

/**
 * Validate season and episode numbers for TV show playback.
 */
export function validateSeasonEpisode(
  season: unknown,
  episode: unknown
): { valid: boolean; season: number; episode: number; error?: string } {
  const s = Number(season);
  const e = Number(episode);

  const cleanSeason = Number.isInteger(s) && s > 0 ? s : 1;
  const cleanEpisode = Number.isInteger(e) && e > 0 ? e : 1;

  return { valid: true, season: cleanSeason, episode: cleanEpisode };
}

/**
 * Resolves the numeric TMDB ID for any CRATOR MediaItem:
 * 1. Checks item.tmdbId directly.
 * 2. Parses ID string if prefixed with "tmdb-movie-" or "tmdb-tv-".
 * 3. Checks the static mapping table for bundled items.
 * 4. Checks memory cache.
 * 5. Queries CRATOR TMDB search API as dynamic fallback.
 */
export async function resolveTmdbId(item: MediaItem): Promise<number | null> {
  // 1. Direct tmdbId property
  if (item.tmdbId) {
    const check = validateTmdbId(item.tmdbId);
    if (check.valid && check.id) return check.id;
  }

  // 2. Parse from item.id pattern: "tmdb-movie-693134" or "tmdb-tv-95396"
  if (typeof item.id === 'string' && item.id.startsWith('tmdb-')) {
    const match = item.id.match(/^tmdb-(?:movie|tv|series)-(\d+)$/);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (parsed > 0) return parsed;
    }
  }

  // 3. Static known mappings
  const normalizedSlug = item.id.toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (KNOWN_TMDB_MAPPINGS[normalizedSlug]) {
    return KNOWN_TMDB_MAPPINGS[normalizedSlug];
  }

  // Title-based key
  const titleKey = item.title.toLowerCase().trim();
  for (const [slug, id] of Object.entries(KNOWN_TMDB_MAPPINGS)) {
    if (titleKey.includes(slug.replace(/-/g, ' '))) {
      return id;
    }
  }

  // 4. Memory cache
  if (runtimeTmdbCache.has(item.id)) {
    return runtimeTmdbCache.get(item.id)!;
  }

  // 5. Dynamic fallback: Query TMDB search via CRATOR backend
  try {
    const query = encodeURIComponent(item.title);
    const res = await fetch(`/api/tmdb/search?query=${query}`);
    if (res.ok) {
      const searchData = await res.json();
      const results = searchData.results || [];
      if (results.length > 0) {
        // Filter by media type if possible
        const isTv = item.type === 'series' || item.type === 'anime' || (item.type as any) === 'tv';
        const expectedType = isTv ? 'tv' : 'movie';
        const matched = results.find((r: any) => r.media_type === expectedType) || results[0];
        if (matched && matched.id) {
          const foundId = Number(matched.id);
          runtimeTmdbCache.set(item.id, foundId);
          return foundId;
        }
      }
    }
  } catch (err) {
    console.warn('[CineSRC] Fallback TMDB search failed for:', item.title, err);
  }

  return null;
}

export interface CineSrcEmbedOptions {
  autoplay?: boolean;
  back?: 'close' | boolean;
}

/**
 * Generate official CineSRC movie embed URL:
 * https://cinesrc.st/embed/movie/{tmdb_id}
 */
export function getCineSrcMovieUrl(
  tmdbId: number | string,
  options: CineSrcEmbedOptions = { autoplay: true, back: 'close' }
): string {
  const check = validateTmdbId(tmdbId);
  if (!check.valid || !check.id) {
    throw new Error(check.error || 'Invalid TMDB ID');
  }

  const url = new URL(`${CINESRC_BASE_ORIGIN}/embed/movie/${check.id}`);
  if (options.autoplay !== false) {
    url.searchParams.set('autoplay', '1');
  }
  if (options.back) {
    url.searchParams.set('back', typeof options.back === 'string' ? options.back : 'close');
  }

  return url.toString();
}

/**
 * Generate official CineSRC TV show episode embed URL:
 * https://cinesrc.st/embed/tv/{tmdb_id}?s={season}&e={episode}
 */
export function getCineSrcTvUrl(
  tmdbId: number | string,
  season = 1,
  episode = 1,
  options: CineSrcEmbedOptions = { autoplay: true, back: 'close' }
): string {
  const check = validateTmdbId(tmdbId);
  if (!check.valid || !check.id) {
    throw new Error(check.error || 'Invalid TMDB ID');
  }

  const seCheck = validateSeasonEpisode(season, episode);

  const url = new URL(`${CINESRC_BASE_ORIGIN}/embed/tv/${check.id}`);
  url.searchParams.set('s', String(seCheck.season));
  url.searchParams.set('e', String(seCheck.episode));

  if (options.autoplay !== false) {
    url.searchParams.set('autoplay', '1');
  }
  if (options.back) {
    url.searchParams.set('back', typeof options.back === 'string' ? options.back : 'close');
  }

  return url.toString();
}

/**
 * Resolves playback for a MediaItem using CineSRC as primary provider.
 */
export async function resolveCineSrcPlayback(
  item: MediaItem,
  season = 1,
  episode = 1
): Promise<ProviderResolutionResult> {
  const isTv = item.type === 'series' || item.type === 'anime' || (item.type as any) === 'tv';
  const cleanSeason = season > 0 ? season : 1;
  const cleanEpisode = episode > 0 ? episode : 1;

  try {
    const tmdbId = await resolveTmdbId(item);

    if (!tmdbId) {
      return {
        provider: 'cinesrc',
        mode: 'embed',
        title: item.title,
        seasonNumber: isTv ? cleanSeason : undefined,
        episodeNumber: isTv ? cleanEpisode : undefined,
        error: `Could not resolve a valid TMDB ID for "${item.title}". CineSRC requires a TMDB ID to stream.`,
        errorCode: 'CINESRC_TMDB_ID_NOT_FOUND',
      };
    }

    const embedUrl = isTv
      ? getCineSrcTvUrl(tmdbId, cleanSeason, cleanEpisode)
      : getCineSrcMovieUrl(tmdbId);

    return {
      provider: 'cinesrc',
      mode: 'embed',
      embedUrl,
      format: 'embed',
      tmdbId,
      title: item.title,
      seasonNumber: isTv ? cleanSeason : undefined,
      episodeNumber: isTv ? cleanEpisode : undefined,
    };
  } catch (err: any) {
    return {
      provider: 'cinesrc',
      mode: 'embed',
      title: item.title,
      seasonNumber: isTv ? cleanSeason : undefined,
      episodeNumber: isTv ? cleanEpisode : undefined,
      error: err.message || 'Failed to initialize CineSRC player.',
      errorCode: 'CINESRC_INIT_ERROR',
    };
  }
}

/**
 * Security: Validates incoming postMessage origin.
 * Must match exactly https://cinesrc.st.
 */
export function isCineSrcOrigin(origin: string): boolean {
  return origin === CINESRC_BASE_ORIGIN;
}

/**
 * Parses and validates an incoming CineSRC postMessage event.
 */
export function parseCineSrcMessage(event: MessageEvent): CineSrcMessageEvent | null {
  if (!isCineSrcOrigin(event.origin)) {
    return null;
  }

  const data = event.data;
  if (!data || typeof data !== 'object' || typeof data.type !== 'string') {
    return null;
  }

  if (!data.type.startsWith('cinesrc:')) {
    return null;
  }

  return data as CineSrcMessageEvent;
}

/**
 * Sends a player command to the CineSRC embedded iframe window.
 */
export function sendCineSrcCommand(
  iframeWindow: Window,
  command: 'play' | 'pause' | 'seek' | 'setVolume' | 'getCurrentTime' | 'getDuration',
  args: any[] = []
): void {
  try {
    iframeWindow.postMessage(
      {
        type: 'cinesrc:command',
        command,
        args,
      },
      CINESRC_BASE_ORIGIN
    );
  } catch (e) {
    console.warn('[CineSRC] Failed to send postMessage command:', command, e);
  }
}
