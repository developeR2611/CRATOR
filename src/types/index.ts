export type MediaType = 'movie' | 'series' | 'anime';

export type StreamingPlatform = 
  | 'Netflix' 
  | 'Apple TV+' 
  | 'HBO Max' 
  | 'Disney+' 
  | 'Prime Video' 
  | 'Paramount+';

export interface CastMember {
  name: string;
  character: string;
  avatar: string;
}

export interface Episode {
  id: string;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  runtime: string;
  synopsis: string;
  thumbnail: string;
  videoUrl?: string;
  releaseDate?: string;
}

export interface Season {
  seasonNumber: number;
  title: string;
  episodeCount: number;
  episodes: Episode[];
}

export interface MediaItem {
  id: string;
  title: string;
  originalTitle?: string;
  type: MediaType;
  tagline?: string;
  synopsis: string;
  posterUrl: string;
  backdropUrl: string;
  logoUrl?: string;
  rating: number; // e.g. 8.8
  voteCount: string; // e.g. "245K"
  releaseYear: number;
  runtime?: string; // for movies: "2h 46m"
  totalSeasons?: number; // for series: 4
  ageRating: string; // "TV-MA", "PG-13", "16+", "18+"
  quality: string; // "4K Ultra HD", "Dolby Vision", "HDR10+"
  audio: string; // "Dolby Atmos 7.1", "5.1 Surround"
  genres: string[];
  platform: StreamingPlatform;
  industry: 'Hollywood' | 'Anime' | 'Asian Cinema' | 'European' | 'Indie';
  language: string;
  director?: string;
  cast: CastMember[];
  seasons?: Season[];
  videoUrl?: string;
  topTenRank?: number; // 1-10 if in top ten
  isTrending?: boolean;
  isFresh?: boolean;
  isPopularSeries?: boolean;
  isEditorPick?: boolean;
  featuredInHero?: boolean;
  // Provider Identifiers & Stream Linkage (VidRift TMDB Integration)
  tmdbId?: number | string;
  anilistId?: number | string;
  localCratorId?: string;
  fallbackPosterUrl?: string;
  fallbackBackdropUrl?: string;
  streamStatus?: 'available' | 'unavailable' | 'unverified';
}

export interface ContinueWatchingItem {
  mediaId: string;
  progressPercent: number; // e.g. 64
  currentTime: string; // e.g. "1h 14m"
  totalDuration: string; // e.g. "2h 46m"
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  lastWatchedTimestamp: number;
}

export interface FilterState {
  type: 'all' | 'movie' | 'series' | 'anime';
  industry: string;
  platform: string;
  genre: string;
  language: string;
  year: string;
  sortBy: 'popularity' | 'rating' | 'newest' | 'title';
  searchQuery: string;
}
