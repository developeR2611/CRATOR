import { Episode, MediaItem } from '../types';

export type NavTab = 'home' | 'movies' | 'tv' | 'discover' | 'mylist' | 'search';

export type AppRoute =
  | { name: 'home' }
  | { name: 'movies' }
  | { name: 'tv' }
  | { name: 'discover' }
  | { name: 'mylist' }
  | { name: 'search'; query: string }
  | { name: 'title'; mediaType: 'movie' | 'tv' | 'auto'; id: string }
  | { name: 'watch'; mediaType: 'movie' | 'tv'; id: string; season?: number; episode?: number }
  | { name: 'notfound'; pathname: string };

export const TAB_PATHS: Record<NavTab, string> = {
  home: '/',
  movies: '/movies',
  tv: '/tv',
  discover: '/discover',
  mylist: '/my-list',
  search: '/search',
};

export function isItemTv(item: Pick<MediaItem, 'type'>): boolean {
  return item.type === 'series' || item.type === 'anime' || (item.type as string) === 'tv';
}

export function buildTitlePath(item: MediaItem): string {
  const mediaType = isItemTv(item) ? 'tv' : 'movie';
  const rawId = item.tmdbId ? String(item.tmdbId) : item.id.replace(/^tmdb-(movie|tv|series)-/i, '');
  return `/${mediaType}/${encodeURIComponent(rawId)}`;
}

export function buildWatchPath(item: MediaItem, episode?: Episode): string {
  const mediaType = isItemTv(item) ? 'tv' : 'movie';
  const rawId = item.tmdbId ? String(item.tmdbId) : item.id.replace(/^tmdb-(movie|tv|series)-/i, '');
  if (mediaType === 'tv') {
    const season = episode?.seasonNumber || 1;
    const ep = episode?.episodeNumber || 1;
    return `/watch/tv/${encodeURIComponent(rawId)}/${season}/${ep}`;
  }
  return `/watch/movie/${encodeURIComponent(rawId)}`;
}

export function parseAppRoute(pathname: string, search: string = ''): AppRoute {
  const normalized = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');

  if (normalized === '/' || normalized === '/index.html') {
    return { name: 'home' };
  }
  if (normalized === '/movies') {
    return { name: 'movies' };
  }
  if (normalized === '/tv') {
    return { name: 'tv' };
  }
  if (normalized === '/discover') {
    return { name: 'discover' };
  }
  if (normalized === '/my-list' || normalized === '/mylist') {
    return { name: 'mylist' };
  }
  if (normalized === '/search') {
    const params = new URLSearchParams(search);
    return { name: 'search', query: params.get('q') || '' };
  }

  const segments = normalized.split('/').filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });

  // /movie/:id or /tv/:id
  if (segments.length === 2 && (segments[0] === 'movie' || segments[0] === 'tv')) {
    return {
      name: 'title',
      mediaType: segments[0],
      id: segments[1],
    };
  }

  // /title/:id or /title/:type/:id
  if (segments[0] === 'title') {
    if (segments.length === 2) {
      return { name: 'title', mediaType: 'auto', id: segments[1] };
    }
    if (segments.length === 3 && (segments[1] === 'movie' || segments[1] === 'tv' || segments[1] === 'series')) {
      return {
        name: 'title',
        mediaType: segments[1] === 'movie' ? 'movie' : 'tv',
        id: segments[2],
      };
    }
  }

  // /watch/:type/:id or /watch/:type/:id/:season/:episode
  if (segments[0] === 'watch' && segments.length >= 3) {
    const rawType = segments[1].toLowerCase();
    if (rawType === 'movie' || rawType === 'tv' || rawType === 'series' || rawType === 'anime') {
      const mediaType: 'movie' | 'tv' = rawType === 'movie' ? 'movie' : 'tv';
      const id = segments[2];
      const seasonNum = segments[3] ? Number(segments[3]) : undefined;
      const episodeNum = segments[4] ? Number(segments[4]) : undefined;
      return {
        name: 'watch',
        mediaType,
        id,
        season: seasonNum && Number.isInteger(seasonNum) && seasonNum > 0 ? seasonNum : undefined,
        episode: episodeNum && Number.isInteger(episodeNum) && episodeNum > 0 ? episodeNum : undefined,
      };
    }
  }

  return { name: 'notfound', pathname: normalized };
}
