import { MediaItem } from '../../types';
import { PlaybackProviderId, ProviderInfo, ProviderResolutionResult } from './types';
import { resolveCineSrcPlayback, resolveTmdbId } from './cinesrc';
import { resolveMovieBoxPlayback } from './moviebox';

export const REGISTERED_PROVIDERS: ProviderInfo[] = [
  {
    id: 'cinesrc',
    name: 'CineSRC',
    badge: 'Primary 4K',
    tagline: 'High-speed 4K/1080p Embed Player with Multi-Server Failover',
    type: 'embed',
    isPrimary: true,
    status: 'active',
  },
  {
    id: 'moviebox',
    name: 'MovieBox',
    badge: 'Alternative',
    tagline: 'Direct Stream Catalogue & Raw MP4 Delivery',
    type: 'direct',
    isPrimary: false,
    status: 'alternative',
  },
];

/**
 * Returns available providers for an item with capability assessment.
 */
export async function getAvailableProviders(item: MediaItem): Promise<ProviderInfo[]> {
  const tmdbId = await resolveTmdbId(item);
  const hasMovieBox = Boolean(item.movieBoxSubjectId || item.hasMovieBoxMatch);

  return REGISTERED_PROVIDERS.map((p) => {
    if (p.id === 'cinesrc') {
      return {
        ...p,
        status: tmdbId ? 'active' : 'degraded',
      };
    }
    if (p.id === 'moviebox') {
      return {
        ...p,
        status: hasMovieBox ? 'alternative' : 'degraded',
      };
    }
    return p;
  });
}

/**
 * Resolves playback using the designated or default provider (CineSRC first).
 * Supports explicit fallback switching without breaking state.
 */
export async function resolvePlayback(
  item: MediaItem,
  season = 1,
  episode = 1,
  preferredProvider: PlaybackProviderId = 'cinesrc'
): Promise<ProviderResolutionResult> {
  if (preferredProvider === 'moviebox') {
    return resolveMovieBoxPlayback(item, season, episode);
  }

  // CineSRC is Primary
  const cineSrcResult = await resolveCineSrcPlayback(item, season, episode);

  // If CineSRC succeeded, return it immediately
  if (!cineSrcResult.error && cineSrcResult.embedUrl) {
    return cineSrcResult;
  }

  // If CineSRC failed, return the CineSRC result with its specific error,
  // allowing the user/player to explicitly inspect the error and choose MovieBox fallback.
  return cineSrcResult;
}
