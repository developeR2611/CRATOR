import { MediaItem, Season, Episode, MediaType, StreamingPlatform } from '../types';

export interface TmdbStatus {
  status: string;
  configured: boolean;
  hasKey: boolean;
  isVerified?: boolean;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export const getTmdbImageUrl = (path: string | null | undefined, size: 'w500' | 'w780' | 'w1280' | 'original' = 'w780') => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path.startsWith('/') ? path : `/${path}`}`;
};

// Map TMDB genre IDs to human-readable names
const TMDB_GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

// Convert TMDB movie/TV object to CRATOR MediaItem
export function mapTmdbToMediaItem(raw: any, defaultType?: MediaType): MediaItem {
  if (!raw) {
    return {
      id: `tmdb-${Math.random().toString(36).substring(2, 7)}`,
      title: 'Unknown Title',
      type: 'movie',
      synopsis: '',
      posterUrl: '',
      backdropUrl: '',
      rating: 8.0,
      voteCount: '10K',
      releaseYear: new Date().getFullYear(),
      ageRating: 'PG-13',
      quality: '4K Ultra HD',
      audio: 'Dolby Atmos 7.1',
      genres: ['Action', 'Drama'],
      platform: 'Netflix',
      industry: 'Hollywood',
      language: 'English',
      cast: [],
    };
  }

  const isTv = raw.media_type === 'tv' || raw.first_air_date !== undefined || defaultType === 'series';
  const type: MediaType = defaultType || (isTv ? 'series' : 'movie');

  const title = raw.title || raw.name || raw.original_title || raw.original_name || 'Untitled';
  const originalTitle = raw.original_title || raw.original_name;

  const posterPath = raw.poster_path || raw.poster || raw.cover;
  const backdropPath = raw.backdrop_path || raw.backdrop || raw.banner;

  const posterUrl = getTmdbImageUrl(posterPath, 'w780');
  const backdropUrl = getTmdbImageUrl(backdropPath, 'w1280') || posterUrl;

  const releaseDate = raw.release_date || raw.first_air_date || '';
  let releaseYear = new Date().getFullYear();
  if (releaseDate) {
    const yr = parseInt(releaseDate.split('-')[0], 10);
    if (!isNaN(yr)) releaseYear = yr;
  }

  // Parse genres
  let genres: string[] = [];
  if (Array.isArray(raw.genres)) {
    genres = raw.genres.map((g: any) => typeof g === 'string' ? g : g.name).filter(Boolean);
  } else if (Array.isArray(raw.genre_ids)) {
    genres = raw.genre_ids.map((id: number) => TMDB_GENRES[id]).filter(Boolean);
  }
  if (!genres.length) {
    genres = ['Drama', 'Action'];
  }

  // Parse rating
  const rawScore = Number(raw.vote_average || raw.score || raw.rating);
  const rating = !isNaN(rawScore) && rawScore > 0 ? parseFloat(rawScore.toFixed(1)) : 8.2;
  const voteCount = raw.vote_count ? `${Math.round(raw.vote_count / 1000)}K` : '50K';

  // Parse cast
  const cast = Array.isArray(raw.credits?.cast)
    ? raw.credits.cast.slice(0, 8).map((c: any) => ({
        name: c.name || 'Actor',
        character: c.character || 'Character',
        avatar: getTmdbImageUrl(c.profile_path, 'w500'),
      }))
    : [];

  // Parse director
  let director: string | undefined = undefined;
  if (Array.isArray(raw.credits?.crew)) {
    const dir = raw.credits.crew.find((c: any) => c.job === 'Director');
    if (dir) director = dir.name;
  }

  // Platform guessing based on networks/production
  let platform: StreamingPlatform = 'Netflix';
  const networkName = raw.networks?.[0]?.name?.toLowerCase() || '';
  if (networkName.includes('apple')) platform = 'Apple TV+';
  else if (networkName.includes('hbo') || networkName.includes('max')) platform = 'HBO Max';
  else if (networkName.includes('disney')) platform = 'Disney+';
  else if (networkName.includes('amazon') || networkName.includes('prime')) platform = 'Prime Video';
  else if (networkName.includes('paramount')) platform = 'Paramount+';

  return {
    id: `tmdb-${type}-${raw.id}`,
    tmdbId: raw.id,
    streamStatus: 'available',
    title,
    originalTitle: originalTitle !== title ? originalTitle : undefined,
    type,
    tagline: raw.tagline || undefined,
    synopsis: raw.overview || 'No synopsis available.',
    posterUrl,
    backdropUrl,
    rating,
    voteCount,
    releaseYear,
    runtime: raw.runtime ? `${Math.floor(raw.runtime / 60)}h ${raw.runtime % 60}m` : undefined,
    totalSeasons: raw.number_of_seasons || (type === 'series' ? 1 : undefined),
    ageRating: raw.adult ? '18+' : 'PG-13',
    quality: '4K Ultra HD',
    audio: 'Dolby Atmos 7.1',
    genres,
    platform,
    industry: genres.includes('Animation') && raw.original_language === 'ja' ? 'Anime' : 'Hollywood',
    language: raw.original_language === 'ja' ? 'Japanese' : (raw.original_language === 'ko' ? 'Korean' : 'English'),
    director,
    cast,
  };
}

// 1. Check TMDB status on server
export async function getTmdbStatus(): Promise<TmdbStatus> {
  try {
    const res = await fetch('/api/tmdb/status');
    if (!res.ok) return { status: 'error', configured: false, hasKey: false };
    return await res.json();
  } catch {
    return { status: 'error', configured: false, hasKey: false };
  }
}

// 2. Set/Update TMDB key on server
export async function updateTmdbServerKey(apiKey: string): Promise<{ success: boolean; verified: boolean; message: string }> {
  try {
    const res = await fetch('/api/tmdb/set-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      verified: false,
      message: err.message || 'Failed to update TMDB key',
    };
  }
}

// 3. Search TMDB
export async function searchTmdb(query: string, page: number = 1): Promise<{ items: MediaItem[]; total: number; hasMore: boolean }> {
  try {
    const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(query)}&page=${page}`);
    if (!res.ok) return { items: [], total: 0, hasMore: false };
    const data = await res.json();

    const results = Array.isArray(data.results) ? data.results : [];
    const items = results
      .filter((r: any) => (r.media_type === 'movie' || r.media_type === 'tv') && (r.poster_path || r.backdrop_path))
      .map((r: any) => mapTmdbToMediaItem(r));

    return {
      items,
      total: data.total_results || items.length,
      hasMore: data.page < (data.total_pages || 1),
    };
  } catch {
    return { items: [], total: 0, hasMore: false };
  }
}

// 4. Get Trending on TMDB
export async function getTmdbTrending(): Promise<MediaItem[]> {
  try {
    const res = await fetch('/api/tmdb/trending');
    if (!res.ok) return [];
    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];
    return results
      .filter((r: any) => r.poster_path || r.backdrop_path)
      .map((r: any) => mapTmdbToMediaItem(r));
  } catch {
    return [];
  }
}

// 5. Get TMDB Details
export async function getTmdbDetail(type: 'movie' | 'tv', id: string | number): Promise<MediaItem | null> {
  try {
    const cleanId = String(id).replace(/^tmdb-(movie|tv|series)-/, '');
    const res = await fetch(`/api/tmdb/${type}/${cleanId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return mapTmdbToMediaItem(data, type === 'tv' ? 'series' : 'movie');
  } catch {
    return null;
  }
}

// 6. Get TV Show Seasons & Episodes from TMDB
export async function getTmdbSeasonEpisodes(tvId: string | number, seasonNumber: number = 1): Promise<Episode[]> {
  try {
    const cleanId = String(tvId).replace(/^tmdb-(movie|tv|series)-/, '');
    const res = await fetch(`/api/tmdb/tv/${cleanId}/season/${seasonNumber}`);
    if (!res.ok) return [];
    const data = await res.json();
    const episodes = Array.isArray(data.episodes) ? data.episodes : [];

    return episodes.map((ep: any) => ({
      id: `tmdb-ep-${ep.id || ep.episode_number}`,
      episodeNumber: ep.episode_number,
      seasonNumber,
      title: ep.name || `Episode ${ep.episode_number}`,
      runtime: ep.runtime ? `${ep.runtime}m` : '48m',
      synopsis: ep.overview || '',
      thumbnail: getTmdbImageUrl(ep.still_path, 'w780'),
    }));
  } catch {
    return [];
  }
}

// 7. Get Popular Titles from TMDB
export async function getTmdbPopular(type: 'movie' | 'tv' = 'movie', page: number = 1): Promise<MediaItem[]> {
  try {
    const res = await fetch(`/api/tmdb/popular/${type}?page=${page}`);
    if (!res.ok) return [];
    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];
    return results
      .filter((r: any) => r.poster_path || r.backdrop_path)
      .map((r: any) => mapTmdbToMediaItem(r, type === 'tv' ? 'series' : 'movie'));
  } catch {
    return [];
  }
}

// 8. Get Top Rated Titles from TMDB
export async function getTmdbTopRated(type: 'movie' | 'tv' = 'movie', page: number = 1): Promise<MediaItem[]> {
  try {
    const res = await fetch(`/api/tmdb/top_rated/${type}?page=${page}`);
    if (!res.ok) return [];
    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];
    return results
      .filter((r: any) => r.poster_path || r.backdrop_path)
      .map((r: any) => mapTmdbToMediaItem(r, type === 'tv' ? 'series' : 'movie'));
  } catch {
    return [];
  }
}

// 9. Get Recommendations & Similar Titles from TMDB
export async function getTmdbRecommendations(type: 'movie' | 'tv', id: string | number): Promise<MediaItem[]> {
  try {
    const cleanId = String(id).replace(/^tmdb-(movie|tv|series)-/, '');
    const res = await fetch(`/api/tmdb/${type}/${cleanId}/recommendations`);
    if (!res.ok) return [];
    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];
    return results
      .filter((r: any) => r.poster_path || r.backdrop_path)
      .map((r: any) => mapTmdbToMediaItem(r, type === 'tv' ? 'series' : 'movie'));
  } catch {
    return [];
  }
}
