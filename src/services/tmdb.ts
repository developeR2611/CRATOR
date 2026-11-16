import {
  MediaItem,
  Season,
  Episode,
  MediaType,
  StreamingPlatform,
  TrailerVideo,
  PersonDetails,
  PersonKnownForItem,
} from '../types';

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

  // Parse cast (preserve TMDB person ID so cast bio details can be opened)
  const cast = Array.isArray(raw.credits?.cast)
    ? raw.credits.cast.slice(0, 12).map((c: any) => ({
        id: typeof c.id === 'number' && c.id > 0 ? c.id : undefined,
        name: c.name || 'Actor',
        character: c.character || 'Role',
        avatar: getTmdbImageUrl(c.profile_path, 'w500'),
      }))
    : [];

  // Parse YouTube trailers/videos if appended
  const trailers = Array.isArray(raw.videos?.results)
    ? pickYouTubeTrailers(raw.videos.results)
    : undefined;

  // Parse director / creator
  let director: string | undefined = undefined;
  if (Array.isArray(raw.created_by) && raw.created_by.length > 0) {
    director = raw.created_by.map((c: any) => c.name).filter(Boolean).slice(0, 2).join(', ');
  } else if (Array.isArray(raw.credits?.crew)) {
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
  let logoUrl: string | undefined = pickBestTmdbLogo(raw.images?.logos);

  // Check known logos dictionary if images.logos was not in the raw payload
  if (!logoUrl && raw.id && TMDB_KNOWN_LOGOS[raw.id]) {
    logoUrl = TMDB_KNOWN_LOGOS[raw.id];
  }

  // Parse seasons list if provided by TMDB TV detail
  const seasons: Season[] | undefined = Array.isArray(raw.seasons) && raw.seasons.length > 0
    ? raw.seasons
        .filter((s: any) => typeof s.season_number === 'number' && s.season_number >= 1)
        .map((s: any) => ({
          seasonNumber: s.season_number,
          title: s.name || `Season ${s.season_number}`,
          episodeCount: s.episode_count || 0,
          airDate: s.air_date || undefined,
          episodes: [],
        }))
    : undefined;

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
    releaseDate: releaseDate || undefined,
    tmdbStatus: raw.status || undefined,
    runtime: raw.runtime ? `${Math.floor(raw.runtime / 60)}h ${raw.runtime % 60}m` : undefined,
    totalSeasons: raw.number_of_seasons || (seasons ? seasons.length : (type === 'series' ? 1 : undefined)),
    seasons,
    ageRating: raw.adult ? '18+' : 'PG-13',
    quality: '4K Ultra HD',
    audio: 'Dolby Atmos 7.1',
    genres,
    platform,
    industry: genres.includes('Animation') && raw.original_language === 'ja' ? 'Anime' : 'Hollywood',
    language: raw.original_language === 'ja' ? 'Japanese' : (raw.original_language === 'ko' ? 'Korean' : 'English'),
    director,
    cast,
    trailers,
  };
}

// Prioritize safe official YouTube trailers/teasers from TMDB video results
export function pickYouTubeTrailers(rawVideos?: any[]): TrailerVideo[] {
  if (!Array.isArray(rawVideos) || rawVideos.length === 0) return [];

  const typeScore = (videoType?: string) => {
    switch ((videoType || '').toLowerCase()) {
      case 'trailer':
        return 4;
      case 'teaser':
        return 3;
      case 'clip':
        return 2;
      case 'featurette':
        return 1;
      default:
        return 0;
    }
  };

  const seenKeys = new Set<string>();
  const valid = rawVideos.filter((v: any) => {
    if (!v || String(v.site || '').toLowerCase() !== 'youtube') return false;
    const key = typeof v.key === 'string' ? v.key.trim() : '';
    // Restrict strictly to safe YouTube video ID characters
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(key)) return false;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  const sorted = [...valid].sort((a: any, b: any) => {
    const tDiff = typeScore(b.type) - typeScore(a.type);
    if (tDiff !== 0) return tDiff;
    const offDiff = (b.official ? 1 : 0) - (a.official ? 1 : 0);
    if (offDiff !== 0) return offDiff;
    const enDiff = (b.iso_639_1 === 'en' ? 1 : 0) - (a.iso_639_1 === 'en' ? 1 : 0);
    if (enDiff !== 0) return enDiff;
    return String(b.published_at || '').localeCompare(String(a.published_at || ''));
  });

  return sorted.map((v: any) => ({
    id: String(v.id || v.key),
    key: String(v.key).trim(),
    name: String(v.name || 'Trailer'),
    site: 'YouTube',
    type: String(v.type || 'Trailer'),
    official: Boolean(v.official),
    publishedAt: v.published_at || undefined,
    iso6391: v.iso_639_1 || undefined,
  }));
}

// Pick the highest quality official TMDB logo (English > neutral > any, PNG preferred over SVG)
export function pickBestTmdbLogo(logos?: any[]): string | undefined {
  if (!Array.isArray(logos) || logos.length === 0) return undefined;

  const valid = logos.filter((l: any) => Boolean(l?.file_path));
  if (valid.length === 0) return undefined;

  const enLogos = valid.filter((l: any) => l.iso_639_1 === 'en');
  const neutralLogos = valid.filter((l: any) => l.iso_639_1 === null || l.iso_639_1 === '');
  const pool = enLogos.length > 0 ? enLogos : (neutralLogos.length > 0 ? neutralLogos : valid);

  const sorted = [...pool].sort((a: any, b: any) => {
    const aSvg = String(a.file_path).toLowerCase().endsWith('.svg') ? 1 : 0;
    const bSvg = String(b.file_path).toLowerCase().endsWith('.svg') ? 1 : 0;
    if (aSvg !== bSvg) return aSvg - bSvg; // Prefer crisp raster PNGs over SVG when tied
    const scoreDiff = (b.vote_average || 0) - (a.vote_average || 0);
    if (Math.abs(scoreDiff) > 0.01) return scoreDiff;
    return (b.vote_count || 0) - (a.vote_count || 0);
  });

  const bestPath = sorted[0]?.file_path;
  if (!bestPath) return undefined;
  const isSvg = String(bestPath).toLowerCase().endsWith('.svg');
  return getTmdbImageUrl(bestPath, isSvg ? 'original' : 'w500') || undefined;
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
export async function getTmdbLogo(
  mediaType: 'movie' | 'tv',
  id: number | string,
  forceRefresh: boolean = false
): Promise<string | null> {
  const cleanId = String(id).replace(/^tmdb-(movie|tv|series)-/i, '').replace(/^tmdb-/i, '').trim();
  if (!cleanId) return null;

  const cacheKey = `${mediaType}:${cleanId}`;

  if (!forceRefresh) {
    // 1. Check verified known dictionary first (instant)
    if (TMDB_KNOWN_LOGOS[cleanId]) {
      return TMDB_KNOWN_LOGOS[cleanId];
    }

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
  } else {
    inMemoryLogoCache.delete(cacheKey);
    try {
      localStorage.removeItem(`tmdb_logo_${cacheKey}`);
    } catch {}
  }

  try {
    const res = await fetch(`/api/tmdb/${mediaType}/${cleanId}/images`);
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    const logoUrl = pickBestTmdbLogo(data.logos) || null;
    if (logoUrl) {
      inMemoryLogoCache.set(cacheKey, logoUrl);
      try {
        localStorage.setItem(`tmdb_logo_${cacheKey}`, logoUrl);
      } catch {}
      return logoUrl;
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

    return episodes
      .sort((a: any, b: any) => (a.episode_number || 0) - (b.episode_number || 0))
      .map((ep: any) => ({
        id: `tmdb-ep-${ep.id || `${seasonNumber}-${ep.episode_number}`}`,
        episodeNumber: ep.episode_number,
        seasonNumber,
        title: ep.name || `Episode ${ep.episode_number}`,
        runtime: ep.runtime ? `${ep.runtime}m` : '45m',
        synopsis: ep.overview || '',
        thumbnail: getTmdbImageUrl(ep.still_path, 'w780'),
        releaseDate: ep.air_date || undefined,
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

// 10. Get TMDB Trailers & Videos for a Movie or TV Show
export async function getTmdbVideos(
  type: 'movie' | 'tv',
  id: string | number
): Promise<{ videos: TrailerVideo[]; error?: string }> {
  const cleanId = String(id || '').replace(/^tmdb-(movie|tv|series)-/i, '').replace(/^tmdb-/i, '').trim();
  if (!/^\d+$/.test(cleanId)) {
    return { videos: [], error: 'Valid numeric TMDB ID is required to fetch trailers.' };
  }

  try {
    const res = await fetch(`/api/tmdb/${type}/${cleanId}/videos`);
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok || !data || typeof data !== 'object' || !Array.isArray(data.results)) {
      return {
        videos: [],
        error: data?.error || `Failed to load trailers (HTTP ${res.status}).`,
      };
    }

    return {
      videos: pickYouTubeTrailers(data.results),
    };
  } catch {
    return {
      videos: [],
      error: 'Unable to reach TMDB trailer service right now.',
    };
  }
}

const personDetailsCache = new Map<string, PersonDetails>();

// Resolve a TMDB person ID from a cast member's name when ID wasn't initially attached
export async function searchTmdbPersonId(name: string): Promise<number | null> {
  const cleanName = String(name || '').trim();
  if (!cleanName) return null;

  try {
    const res = await fetch(`/api/tmdb/person/search?query=${encodeURIComponent(cleanName)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    const exactMatch = results.find(
      (r: any) => typeof r?.id === 'number' && String(r.name || '').toLowerCase() === cleanName.toLowerCase()
    );
    const best = exactMatch || results.find((r: any) => typeof r?.id === 'number' && r.id > 0);
    return best ? Number(best.id) : null;
  } catch {
    return null;
  }
}

// 11. Get TMDB Person Details & Known-For Credits
export async function getTmdbPerson(
  personId: number | string
): Promise<{ person: PersonDetails | null; error?: string }> {
  const cleanId = String(personId || '').replace(/^tmdb-person-/i, '').trim();
  if (!/^\d+$/.test(cleanId) || Number(cleanId) <= 0) {
    return { person: null, error: 'Valid cast member ID is required.' };
  }

  if (personDetailsCache.has(cleanId)) {
    return { person: personDetailsCache.get(cleanId)! };
  }

  try {
    const res = await fetch(`/api/tmdb/person/${cleanId}`);
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok || !data || typeof data !== 'object' || typeof data.id !== 'number' || data.id <= 0) {
      return {
        person: null,
        error: data?.error || `Failed to load cast details (HTTP ${res.status}).`,
      };
    }

    const castCredits = Array.isArray(data?.combined_credits?.cast) ? data.combined_credits.cast : [];
    const crewCredits = Array.isArray(data?.combined_credits?.crew) ? data.combined_credits.crew : [];
    const creditPool = castCredits.length > 0 ? castCredits : crewCredits;

    const seenCredits = new Set<string>();
    const filteredCredits = creditPool.filter((c: any) => {
      if (!c || !c.id) return false;
      const mType = c.media_type === 'tv' ? 'tv' : (c.media_type === 'movie' ? 'movie' : null);
      if (!mType) return false;
      const key = `${mType}:${c.id}`;
      if (seenCredits.has(key)) return false;
      seenCredits.add(key);
      return Boolean(c.title || c.name);
    });

    const sortedCredits = [...filteredCredits].sort((a: any, b: any) => {
      // Deprioritize Talk Show / News self-appearances so signature film/series roles surface first
      const isTalkA = Array.isArray(a.genre_ids) && (a.genre_ids.includes(10767) || a.genre_ids.includes(10763)) ? 1 : 0;
      const isTalkB = Array.isArray(b.genre_ids) && (b.genre_ids.includes(10767) || b.genre_ids.includes(10763)) ? 1 : 0;
      if (isTalkA !== isTalkB) return isTalkA - isTalkB;

      const scoreA = (Number(a.vote_count) || 0) * 0.4 + (Number(a.popularity) || 0) * 10;
      const scoreB = (Number(b.vote_count) || 0) * 0.4 + (Number(b.popularity) || 0) * 10;
      return scoreB - scoreA;
    });

    const knownFor: PersonKnownForItem[] = sortedCredits.slice(0, 8).map((c: any) => {
      const mType: 'movie' | 'tv' = c.media_type === 'tv' ? 'tv' : 'movie';
      const mapped = mapTmdbToMediaItem(c, mType === 'tv' ? 'series' : 'movie');
      return {
        id: Number(c.id),
        mediaType: mType,
        title: mapped.title,
        posterUrl: mapped.posterUrl,
        backdropUrl: mapped.backdropUrl,
        releaseYear: mapped.releaseYear,
        releaseDate: mapped.releaseDate,
        character: c.character || c.job || undefined,
        voteAverage: mapped.rating,
        mediaItem: mapped,
      };
    });

    const person: PersonDetails = {
      id: Number(data.id),
      name: String(data.name || 'Cast Member'),
      biography: typeof data.biography === 'string' ? data.biography.trim() : '',
      birthday: data.birthday || undefined,
      deathday: data.deathday || undefined,
      placeOfBirth: data.place_of_birth || undefined,
      knownForDepartment: data.known_for_department || undefined,
      profileUrl: getTmdbImageUrl(data.profile_path, 'w500'),
      knownFor,
    };

    personDetailsCache.set(cleanId, person);
    return { person };
  } catch {
    return {
      person: null,
      error: 'Unable to load cast member biography right now.',
    };
  }
}
