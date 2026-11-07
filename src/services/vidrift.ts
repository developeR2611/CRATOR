/**
 * VidRift Streaming Provider Service
 * 
 * Official Documentation: https://vidrift.net/docs
 * 
 * Embed Formats:
 * - Movies: https://embed.vidrift.net/embed/movie/{tmdb_id}
 * - TV:     https://embed.vidrift.net/embed/tv/{tmdb_id}/{season}/{episode}
 * - Anime:  https://embed.vidrift.net/embed/anilist/{anilist_id}/{episode}
 * 
 * Communication:
 * - Origin: https://embed.vidrift.net
 * - postMessage bidirectional protocol
 * 
 * CRITICAL EMBED REQUIREMENT:
 * - Do NOT add a sandbox attribute to the iframe. Sandboxing blocks video playback.
 * - allow="autoplay; fullscreen"
 */

import { MediaItem } from '../types';

export const VIDRIFT_BASE_ORIGIN = 'https://embed.vidrift.net';

export interface VidRiftCustomizationOptions {
  brand?: string;
  brandColor?: string; // 6-digit hex without #, e.g. 'f3f0ea' or 'ffffff'
  brandLogo?: string;
  showTitle?: boolean;
  exit?: boolean;
  autoplay?: boolean;
  watermark?: boolean;
  title?: string;
  poster?: string;
  uiScale?: number;
  caps?: boolean;
  controlBg?: 'solid' | 'gradient';
}

export interface VidRiftProgressEvent {
  type: 'vidrift:progress';
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  currentTime: number;
  duration: number;
  anilist?: { id: number; mal: number; episode: number } | null;
}

export interface VidRiftEpisodeEvent {
  type: 'vidrift:episode';
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  season: number;
  episode: number;
  anilist?: { id: number; mal: number; episode: number } | null;
}

export interface VidRiftPausedEvent {
  type: 'vidrift:paused';
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  currentTime: number;
}

export interface VidRiftUnpausedEvent {
  type: 'vidrift:unpaused';
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  currentTime: number;
}

export interface VidRiftEndedEvent {
  type: 'vidrift:ended';
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
}

export interface VidRiftExitEvent {
  type: 'vidrift:exit';
}

export interface VidRiftFullscreenEvent {
  type: 'vidrift:fullscreen';
  on: boolean;
}

export interface VidRiftStateEvent {
  type: 'vidrift:state';
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  currentTime?: number;
  duration?: number;
  paused?: boolean;
  volume?: number;
  muted?: boolean;
  [key: string]: any;
}

export type VidRiftIncomingMessage =
  | VidRiftProgressEvent
  | VidRiftEpisodeEvent
  | VidRiftPausedEvent
  | VidRiftUnpausedEvent
  | VidRiftEndedEvent
  | VidRiftExitEvent
  | VidRiftFullscreenEvent
  | VidRiftStateEvent
  | { type: 'vidrift:nextup'; [key: string]: any }
  | { type: 'vidrift:nextup-play'; [key: string]: any }
  | { type: 'vidrift:ui-visible' }
  | { type: 'vidrift:ui-hidden' }
  | { type: 'vidrift:command-error'; command: string; field?: string; reason: string };

export type VidRiftOutgoingMessage =
  | { type: 'vidrift:play' }
  | { type: 'vidrift:pause' }
  | { type: 'vidrift:skip'; seconds: number }
  | { type: 'vidrift:resume'; currentTime: number }
  | { type: 'vidrift:get-state' }
  | { type: 'vidrift:set'; [key: string]: any }
  | { type: 'vidrift:quality-preference'; label: string }
  | { type: 'vidrift:fullscreen-state'; on: boolean };

export interface VidRiftPlaybackResult {
  embedUrl: string;
  tmdbId: number | null;
  season?: number;
  episode?: number;
  error?: string;
  errorCode?: string;
}

/**
 * Validates that an incoming postMessage originated strictly from VidRift's embed domain.
 */
export function isVidRiftOrigin(origin: string): boolean {
  if (!origin) return false;
  return origin.toLowerCase() === VIDRIFT_BASE_ORIGIN.toLowerCase();
}

/**
 * Safely sends a command to the VidRift iframe window with strict origin targeting.
 */
export function sendVidRiftCommand(targetWindow: Window, message: VidRiftOutgoingMessage): void {
  try {
    targetWindow.postMessage(message, VIDRIFT_BASE_ORIGIN);
  } catch (err) {
    console.warn('[VidRift] Failed to postMessage to iframe:', err);
  }
}

/**
 * Extracts and validates a numeric TMDB ID from a MediaItem or raw ID string.
 */
export function extractTmdbNumericId(itemOrId: MediaItem | string | number): number | null {
  if (typeof itemOrId === 'number' && Number.isInteger(itemOrId) && itemOrId > 0) {
    return itemOrId;
  }

  let raw = '';
  if (typeof itemOrId === 'object' && itemOrId !== null) {
    if (typeof itemOrId.tmdbId === 'number' && itemOrId.tmdbId > 0) {
      return itemOrId.tmdbId;
    }
    raw = String(itemOrId.tmdbId || itemOrId.id || '');
  } else {
    raw = String(itemOrId || '');
  }

  // Strip prefixes like 'tmdb-movie-', 'tmdb-tv-', 'tmdb-series-', 'tmdb-'
  const clean = raw.replace(/^tmdb-(movie|tv|series)-/i, '').replace(/^tmdb-/i, '').trim();

  // Check if remaining characters form a valid positive integer
  if (/^\d+$/.test(clean)) {
    const parsed = parseInt(clean, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

/**
 * Builds the query string for VidRift customization options.
 */
function buildCustomizationQuery(options?: VidRiftCustomizationOptions): string {
  const params = new URLSearchParams();

  // Branding: default to CRATOR
  params.set('brand', options?.brand || 'CRATOR');

  // Brand Color: CRATOR's neutral paper accent (#f3f0ea) or custom hex
  const color = (options?.brandColor || 'f3f0ea').replace(/^#/, '');
  if (/^[0-9a-fA-F]{3,6}$/.test(color)) {
    params.set('brandColor', color);
  }

  if (options?.brandLogo) {
    params.set('brandLogo', options.brandLogo);
  }

  if (options?.showTitle !== false) {
    params.set('showTitle', '1');
  }

  // Exit button: Enabled by default so the viewer can exit the player back to CRATOR
  if (options?.exit !== false) {
    params.set('exit', '1');
  }

  // Autoplay: 0 by default, or 1 if explicitly set
  if (options?.autoplay === false) {
    params.set('autoplay', '0');
  }

  if (options?.watermark && options?.brandLogo) {
    params.set('watermark', '1');
  }

  if (options?.title) {
    params.set('title', options.title);
  }

  if (options?.poster) {
    params.set('poster', options.poster);
  }

  if (options?.uiScale && options.uiScale >= 0.5 && options.uiScale <= 2.5) {
    params.set('uiScale', String(options.uiScale));
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Generates an official VidRift movie embed URL.
 * Format: https://embed.vidrift.net/embed/movie/{tmdb_id}
 */
export function buildVidRiftMovieUrl(
  tmdbId: number | string,
  options?: VidRiftCustomizationOptions
): string {
  const numericId = extractTmdbNumericId(tmdbId);
  if (!numericId) {
    throw new Error(`Invalid TMDB movie ID: ${tmdbId}`);
  }

  const query = buildCustomizationQuery(options);
  return `${VIDRIFT_BASE_ORIGIN}/embed/movie/${numericId}${query}`;
}

/**
 * Generates an official VidRift TV show episode embed URL.
 * Format: https://embed.vidrift.net/embed/tv/{tmdb_id}/{season}/{episode}
 */
export function buildVidRiftTvUrl(
  tmdbId: number | string,
  season: number,
  episode: number,
  options?: VidRiftCustomizationOptions
): string {
  const numericId = extractTmdbNumericId(tmdbId);
  if (!numericId) {
    throw new Error(`Invalid TMDB TV ID: ${tmdbId}`);
  }

  const safeSeason = Math.max(1, Math.floor(season || 1));
  const safeEpisode = Math.max(1, Math.floor(episode || 1));

  const query = buildCustomizationQuery(options);
  return `${VIDRIFT_BASE_ORIGIN}/embed/tv/${numericId}/${safeSeason}/${safeEpisode}${query}`;
}

/**
 * Generates an official VidRift anime embed URL via AniList ID.
 * Format: https://embed.vidrift.net/embed/anilist/{anilist_id}/{episode}
 */
export function buildVidRiftAnimeUrl(
  anilistId: number | string,
  episode: number,
  options?: VidRiftCustomizationOptions
): string {
  const cleanId = typeof anilistId === 'string' ? anilistId.replace(/^anilist-/i, '').trim() : String(anilistId);
  const numericId = parseInt(cleanId, 10);
  if (isNaN(numericId) || numericId <= 0) {
    throw new Error(`Invalid AniList ID: ${anilistId}`);
  }

  const safeEpisode = Math.max(1, Math.floor(episode || 1));
  const query = buildCustomizationQuery(options);
  return `${VIDRIFT_BASE_ORIGIN}/embed/anilist/${numericId}/${safeEpisode}${query}`;
}

/**
 * Resolves the VidRift playback embed URL for any given MediaItem.
 */
export function resolveVidRiftPlayback(
  item: MediaItem,
  season: number = 1,
  episode: number = 1,
  options?: VidRiftCustomizationOptions
): VidRiftPlaybackResult {
  if (!item) {
    return {
      embedUrl: '',
      tmdbId: null,
      error: 'No media item provided for playback.',
      errorCode: 'NO_MEDIA_ITEM',
    };
  }

  const tmdbId = extractTmdbNumericId(item);
  const isTv = item.type === 'series' || item.type === 'anime' || (item.type as any) === 'tv';

  const mergedOptions: VidRiftCustomizationOptions = {
    title: item.title,
    poster: item.backdropUrl || item.posterUrl,
    brand: 'CRATOR',
    brandColor: 'f3f0ea',
    showTitle: true,
    exit: true,
    ...options,
  };

  // If item contains an AniList ID and is anime
  if (item.type === 'anime' && (item as any).anilistId) {
    try {
      const url = buildVidRiftAnimeUrl((item as any).anilistId, episode, mergedOptions);
      return {
        embedUrl: url,
        tmdbId,
        season,
        episode,
      };
    } catch (e: any) {
      console.warn('[VidRift] Could not resolve AniList ID, falling back to TMDB:', e.message);
    }
  }

  if (!tmdbId) {
    return {
      embedUrl: '',
      tmdbId: null,
      error: `Could not resolve a valid TMDB ID for "${item.title}".`,
      errorCode: 'INVALID_TMDB_ID',
    };
  }

  try {
    let embedUrl = '';
    if (isTv) {
      embedUrl = buildVidRiftTvUrl(tmdbId, season, episode, mergedOptions);
    } else {
      embedUrl = buildVidRiftMovieUrl(tmdbId, mergedOptions);
    }

    return {
      embedUrl,
      tmdbId,
      season: isTv ? season : undefined,
      episode: isTv ? episode : undefined,
    };
  } catch (err: any) {
    return {
      embedUrl: '',
      tmdbId,
      error: err.message || 'Failed to generate VidRift embed URL.',
      errorCode: 'VIDRIFT_URL_GENERATION_FAILED',
    };
  }
}
