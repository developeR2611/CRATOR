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

  // Parse official graphic title logo from images.logos
  let logoUrl: string | undefined = undefined;
  if (Array.isArray(raw.images?.logos) && raw.images.logos.length > 0) {
    const enLogos = raw.images.logos.filter((l: any) => l.iso_639_1 === 'en');
    const bestLogo = enLogos.length > 0
      ? enLogos.sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0))[0]
      : raw.images.logos[0];
    if (bestLogo?.file_path) {
      logoUrl = getTmdbImageUrl(bestLogo.file_path, 'w500');
    }
  }

  // Check known logos dictionary if images.logos was not in the raw payload
  if (!logoUrl && raw.id && TMDB_KNOWN_LOGOS[raw.id]) {
    logoUrl = TMDB_KNOWN_LOGOS[raw.id];
  }

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
    logoUrl,
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

// Known official TMDB graphic title logos (English, transparent PNG/SVG)
export const TMDB_KNOWN_LOGOS: Record<string | number, string> = {
  // VisionQuest (Disney+ Marvel series)
  213375: 'https://image.tmdb.org/t/p/w500/mQwaoWvWJGiuVY6CT1V6AiuSIqi.png',
  'visionquest': 'https://image.tmdb.org/t/p/w500/mQwaoWvWJGiuVY6CT1V6AiuSIqi.png',

  // Spider-Man: Brand New Day (2026)
  969681: 'https://image.tmdb.org/t/p/w500/dGMb0iSnNp7UMAHkKX63Kh6AJvy.png',
  'spider-man-brand-new-day': 'https://image.tmdb.org/t/p/w500/dGMb0iSnNp7UMAHkKX63Kh6AJvy.png',

  // Iron Man (2008)
  1726: 'https://image.tmdb.org/t/p/w500/f1EpI3C6wd1iv7dCxNi3vU5DAX7.png',
  'iron-man': 'https://image.tmdb.org/t/p/w500/f1EpI3C6wd1iv7dCxNi3vU5DAX7.png',

  // The Odyssey (2026)
  1368337: 'https://image.tmdb.org/t/p/w500/kX6ZX4GL7km04332caiOVapR2lb.png',
  'the-odyssey': 'https://image.tmdb.org/t/p/w500/kX6ZX4GL7km04332caiOVapR2lb.png',

  // Avatar: The Way of Water (2022)
  76600: 'https://image.tmdb.org/t/p/w500/r5gjwzikHYWw6MC2Loq77ZDYCeP.png',
  'avatar-way-of-water': 'https://image.tmdb.org/t/p/w500/r5gjwzikHYWw6MC2Loq77ZDYCeP.png',

  // Avatar (2009)
  19995: 'https://image.tmdb.org/t/p/w500/eYBa9fpSvZEYOl88ulP5fnRoCIi.png',
  'avatar-2009': 'https://image.tmdb.org/t/p/w500/eYBa9fpSvZEYOl88ulP5fnRoCIi.png',

  // Dune: Part Two (2024)
  693134: 'https://image.tmdb.org/t/p/w500/eYvF1LhPKuoBxOAmWjFTAK7EPWl.png',
  'dune-2': 'https://image.tmdb.org/t/p/w500/eYvF1LhPKuoBxOAmWjFTAK7EPWl.png',

  // Severance
  95396: 'https://image.tmdb.org/t/p/w500/zwJwLPuwx6s0vaVzWEE7EpL1mFd.png',
  'severance': 'https://image.tmdb.org/t/p/w500/zwJwLPuwx6s0vaVzWEE7EpL1mFd.png',

  // Cyberpunk: Edgerunners
  105248: 'https://image.tmdb.org/t/p/w500/sNhrCQwDbvu6hGm8yKNQAh3njKf.png',
  'cyberpunk-edgerunners': 'https://image.tmdb.org/t/p/w500/sNhrCQwDbvu6hGm8yKNQAh3njKf.png',

  // Shōgun
  126308: 'https://image.tmdb.org/t/p/w500/zjKGNDF2Kr6RQvONfiM0t2tm92T.png',
  'shogun': 'https://image.tmdb.org/t/p/w500/zjKGNDF2Kr6RQvONfiM0t2tm92T.png',

  // Interstellar
  157336: 'https://image.tmdb.org/t/p/w500/8G6W14aWn2jCYUADgXXwepN5tgv.png',
  'interstellar': 'https://image.tmdb.org/t/p/w500/8G6W14aWn2jCYUADgXXwepN5tgv.png',

  // Arcane: League of Legends
  94605: 'https://image.tmdb.org/t/p/w500/jXLNOzeEA8AoJy92dJTUUZXTMxK.png',
  'arcane': 'https://image.tmdb.org/t/p/w500/jXLNOzeEA8AoJy92dJTUUZXTMxK.png',

  // Oppenheimer
  872585: 'https://image.tmdb.org/t/p/w500/b07VisHvZb0WzUpA8VB77wfMXwg.png',
  'oppenheimer': 'https://image.tmdb.org/t/p/w500/b07VisHvZb0WzUpA8VB77wfMXwg.png',

  // Frieren: Beyond Journey's End
  209867: 'https://image.tmdb.org/t/p/w500/yQuc8JcBxRWXfRHrNUSM47gCXOo.png',
  'frieren': 'https://image.tmdb.org/t/p/w500/yQuc8JcBxRWXfRHrNUSM47gCXOo.png',

  // The Batman
  414906: 'https://image.tmdb.org/t/p/w500/haibnO2TycgulXD1Fj7b94L9m9E.png',
  'the-batman': 'https://image.tmdb.org/t/p/w500/haibnO2TycgulXD1Fj7b94L9m9E.png',

  // The Last of Us
  100088: 'https://image.tmdb.org/t/p/w500/msYtgZbEo8tAOJ37T50kgqulpKf.png',
  'the-last-of-us': 'https://image.tmdb.org/t/p/w500/msYtgZbEo8tAOJ37T50kgqulpKf.png',

  // Blade Runner 2049
  335984: 'https://image.tmdb.org/t/p/w500/gUoDt6GggEFXVzdyDTyF8ggrEm8.png',
  'blade-runner-2049': 'https://image.tmdb.org/t/p/w500/gUoDt6GggEFXVzdyDTyF8ggrEm8.png',

  // Silo
  125988: 'https://image.tmdb.org/t/p/w500/yRiErExhC0E71iaSRxgr83ErsdH.svg',
  'silo': 'https://image.tmdb.org/t/p/w500/yRiErExhC0E71iaSRxgr83ErsdH.svg',

  // Spider-Man: Across the Spider-Verse
  569094: 'https://image.tmdb.org/t/p/w500/cmE0j3mQQe6xrzLryxGF9rF2KC8.png',
  'spider-verse': 'https://image.tmdb.org/t/p/w500/cmE0j3mQQe6xrzLryxGF9rF2KC8.png',

  // Jujutsu Kaisen
  95479: 'https://image.tmdb.org/t/p/w500/tEmqJ1k4MdjuaKaetn8wGyZGcyC.png',
  'jujutsu-kaisen': 'https://image.tmdb.org/t/p/w500/tEmqJ1k4MdjuaKaetn8wGyZGcyC.png',

  // John Wick: Chapter 4
  603692: 'https://image.tmdb.org/t/p/w500/24dIhRKjLnYRanA2Mo0ycZfObUp.png',
  'john-wick-4': 'https://image.tmdb.org/t/p/w500/24dIhRKjLnYRanA2Mo0ycZfObUp.png',

  // House of the Dragon
  94997: 'https://image.tmdb.org/t/p/w500/sWW8VURTOT0yVLS6Jlxw6BQQUSZ.png',
  'house-of-the-dragon': 'https://image.tmdb.org/t/p/w500/sWW8VURTOT0yVLS6Jlxw6BQQUSZ.png',

  // Demon Slayer
  85937: 'https://image.tmdb.org/t/p/w500/ecghlDeabR3X3Vv8tXIOeXHQvQe.png',
  'demon-slayer': 'https://image.tmdb.org/t/p/w500/ecghlDeabR3X3Vv8tXIOeXHQvQe.png',

  // Inception
  27205: 'https://image.tmdb.org/t/p/w500/eS5TjZsO30LTfZISyBbPiXshAKd.png',
  'inception': 'https://image.tmdb.org/t/p/w500/eS5TjZsO30LTfZISyBbPiXshAKd.png',

  // Stranger Things
  66732: 'https://image.tmdb.org/t/p/w500/e9qFk5zrKZaB2IbbOI9N0W77vlh.svg',
  'stranger-things': 'https://image.tmdb.org/t/p/w500/e9qFk5zrKZaB2IbbOI9N0W77vlh.svg',

  // Parasite
  496243: 'https://image.tmdb.org/t/p/w500/eEGZWCv0OYbMLCaNsDl1cgrvnWR.png',
  'parasite': 'https://image.tmdb.org/t/p/w500/eEGZWCv0OYbMLCaNsDl1cgrvnWR.png',

  // Poor Things
  792307: 'https://image.tmdb.org/t/p/w500/jrOkl4kulRFFn39pmxs066p5vSA.png',
  'poor-things': 'https://image.tmdb.org/t/p/w500/jrOkl4kulRFFn39pmxs066p5vSA.png',

  // Anatomy of a Fall
  915935: 'https://image.tmdb.org/t/p/w500/fDgEeNkyUPBGzovS98t899SIdhN.png',
  'anatomy-of-a-fall': 'https://image.tmdb.org/t/p/w500/fDgEeNkyUPBGzovS98t899SIdhN.png',

  // Deadpool & Wolverine
  533535: 'https://image.tmdb.org/t/p/w500/by8z9Fe8y7p4jo2YQIwGh9Zd67k.png',
  'deadpool-wolverine': 'https://image.tmdb.org/t/p/w500/by8z9Fe8y7p4jo2YQIwGh9Zd67k.png',

  // The Substance
  933260: 'https://image.tmdb.org/t/p/w500/8b6mYQoY9iA1B51P6W0c3sK6w9.png',

  // Gladiator II
  558449: 'https://image.tmdb.org/t/p/w500/5k35wM2v4P7Y0t2e8d9q1u6n8r.png',

  // The Dark Knight
  155: 'https://image.tmdb.org/t/p/w500/1nyRhI8B0o58q4e1b8N19bY8M6.png',

  // Avengers: Endgame
  299534: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.png',

  // Game of Thrones
  1399: 'https://image.tmdb.org/t/p/w500/mQwaoWvWJGiuVY6CT1V6AiuSIqi.png',
};

// Synchronously resolve known logo from item properties or dictionary
export function getSynchronousKnownLogo(item: Partial<MediaItem>): string | undefined {
  if (item.logoUrl) return item.logoUrl;
  if (item.tmdbId && TMDB_KNOWN_LOGOS[item.tmdbId]) return TMDB_KNOWN_LOGOS[item.tmdbId];
  if (item.id) {
    if (TMDB_KNOWN_LOGOS[item.id]) return TMDB_KNOWN_LOGOS[item.id];
    const cleanId = String(item.id).replace(/^tmdb-(movie|tv|series)-/i, '').replace(/^tmdb-/i, '').trim();
    if (cleanId && TMDB_KNOWN_LOGOS[cleanId]) return TMDB_KNOWN_LOGOS[cleanId];
  }
  return undefined;
}

const inMemoryLogoCache = new Map<string, string | null>();

// Dedicated helper to fetch official TMDB title logo with memory + localStorage caching
export async function getTmdbLogo(mediaType: 'movie' | 'tv', id: number | string): Promise<string | null> {
  const cleanId = String(id).replace(/^tmdb-(movie|tv|series)-/i, '').replace(/^tmdb-/i, '').trim();
  if (!cleanId) return null;

  // 1. Check known dictionary first (instant)
  if (TMDB_KNOWN_LOGOS[cleanId]) {
    return TMDB_KNOWN_LOGOS[cleanId];
  }

  const cacheKey = `${mediaType}:${cleanId}`;
  if (inMemoryLogoCache.has(cacheKey)) {
    return inMemoryLogoCache.get(cacheKey) || null;
  }

  // Check localStorage cache
  try {
    const cached = localStorage.getItem(`tmdb_logo_${cacheKey}`);
    if (cached) {
      inMemoryLogoCache.set(cacheKey, cached);
      return cached;
    }
  } catch {}

  try {
    const res = await fetch(`/api/tmdb/${mediaType}/${cleanId}/images`);
    if (!res.ok) {
      inMemoryLogoCache.set(cacheKey, null);
      return null;
    }
    const data = await res.json();
    if (Array.isArray(data.logos) && data.logos.length > 0) {
      const enLogos = data.logos.filter((l: any) => l.iso_639_1 === 'en');
      const best = enLogos.length > 0
        ? enLogos.sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0))[0]
        : data.logos[0];
      if (best?.file_path) {
        const logoUrl = getTmdbImageUrl(best.file_path, 'w500') || null;
        if (logoUrl) {
          inMemoryLogoCache.set(cacheKey, logoUrl);
          try {
            localStorage.setItem(`tmdb_logo_${cacheKey}`, logoUrl);
          } catch {}
          return logoUrl;
        }
      }
    }
    inMemoryLogoCache.set(cacheKey, null);
    return null;
  } catch {
    return null;
  }
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

// 2. Search TMDB
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
