import { MediaItem } from '../types';
import { searchTmdb } from './tmdb';
import { searchMovieBox } from './moviebox';

export interface DualSearchResponse {
  items: MediaItem[];
  total: number;
  hasMore: boolean;
  tmdbCount: number;
  movieBoxCount: number;
  matchedCount: number;
  isUsingFallback?: boolean;
  error?: string;
}

// 1. Title Normalizer (Removes broadcast tags, punctuation, articles, normalizes Roman numerals & sequel numbering)
export function normalizeTitleForMatching(title: string): string {
  if (!title) return '';
  return title
    .toLowerCase()
    // Strip broadcast/format tags like [English], [Netflix], [Dubbed], (Dub)
    .replace(/\[(english|netflix|dubbed|subbed|hindi|dual audio|uncut|hd|4k)\]/gi, '')
    .replace(/\((english|netflix|dubbed|subbed|hindi|dual audio|uncut|hd|4k|dub)\)/gi, '')
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/part\s+two\b/gi, 'part 2')
    .replace(/part\s+one\b/gi, 'part 1')
    .replace(/chapter\s+iv\b/gi, 'chapter 4')
    .replace(/chapter\s+iii\b/gi, 'chapter 3')
    .replace(/chapter\s+ii\b/gi, 'chapter 2')
    .replace(/chapter\s+i\b/gi, 'chapter 1')
    .replace(/[:\-–—.,'"!]/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 2. Strict & Confident Matching Algorithm
export function findBestMovieBoxMatch(
  tmdbItem: MediaItem, 
  movieBoxCandidates: MediaItem[]
): { match: MediaItem | null; confidence: 'verified' | 'unmatched' | 'ambiguous'; candidates: MediaItem[] } {
  if (!movieBoxCandidates || movieBoxCandidates.length === 0) {
    return { match: null, confidence: 'unmatched', candidates: [] };
  }

  const normTmdb = normalizeTitleForMatching(tmdbItem.title);
  const normTmdbOrig = tmdbItem.originalTitle ? normalizeTitleForMatching(tmdbItem.originalTitle) : '';
  const isTmdbTv = tmdbItem.type === 'series' || tmdbItem.type === 'anime';

  const scored = movieBoxCandidates.map((cand) => {
    // REQUIREMENT: Must have a valid native MovieBox subject ID
    const candSubjectId = cand.movieBoxSubjectId || (cand.id && /^\d+$/.test(cand.id) ? cand.id : '');
    if (!candSubjectId) {
      return { cand, score: -9999 };
    }

    const normCand = normalizeTitleForMatching(cand.title);
    const normCandOrig = cand.originalTitle ? normalizeTitleForMatching(cand.originalTitle) : '';
    const isCandTv = cand.type === 'series' || cand.type === 'anime';

    // REQUIREMENT 1: Hard Media Type Veto (A movie must never match a TV series, and vice versa)
    if (isTmdbTv !== isCandTv) {
      return { cand, score: -9999 };
    }

    // REQUIREMENT 2: Hard Year Compatibility Veto (Max tolerance 1 year)
    if (tmdbItem.releaseYear && cand.releaseYear) {
      const yearDiff = Math.abs(tmdbItem.releaseYear - cand.releaseYear);
      if (yearDiff > 1) {
        return { cand, score: -9999 };
      }
    }

    // REQUIREMENT 3: Subtitle / Spinoff Protection
    // Words that indicate a distinct sequel, prequel, or spinoff title
    const distinctiveTokens = ['prophecy', 'havens', 'seven', 'two', 'one', 'three', 'four', 'part', 'chapter', 'revelations', 'beginnings'];
    const tmdbDistinct = distinctiveTokens.filter((t) => normTmdb.includes(t));
    const candDistinct = distinctiveTokens.filter((t) => normCand.includes(t));
    const distinctMismatch = tmdbDistinct.some((t) => !candDistinct.includes(t)) || candDistinct.some((t) => !tmdbDistinct.includes(t));
    if (distinctMismatch && normCand !== normTmdb) {
      return { cand, score: -9999 };
    }

    let score = 0;

    // Priority 1: Exact normalized title
    if (normCand === normTmdb) {
      score += 100;
    }
    // Priority 2: Exact original title
    else if ((normTmdbOrig && normCand === normTmdbOrig) || (normCandOrig && normCandOrig === normTmdb)) {
      score += 90;
    }
    // Priority 3: Exact alternate title
    else if (normTmdbOrig && normCandOrig && normCandOrig === normTmdbOrig) {
      score += 85;
    }
    // Priority 4: Strong title similarity with identical words
    else {
      const tmdbWords = normTmdb.split(/\s+/).filter(Boolean);
      const candWords = normCand.split(/\s+/).filter(Boolean);
      const allWordsMatch = tmdbWords.length === candWords.length && tmdbWords.every((w, i) => w === candWords[i]);
      if (allWordsMatch) {
        score += 80;
      } else {
        return { cand, score: -9999 };
      }
    }

    // Year compatibility bonus
    if (tmdbItem.releaseYear && cand.releaseYear) {
      const yearDiff = Math.abs(tmdbItem.releaseYear - cand.releaseYear);
      if (yearDiff === 0) score += 10;
      else if (yearDiff === 1) score += 5;
    }

    return { cand, score };
  });

  // Confident threshold is 80 (requires exact or full-word verified match)
  const passing = scored.filter((s) => s.score >= 80).sort((a, b) => b.score - a.score);

  if (passing.length === 0) {
    return { match: null, confidence: 'unmatched', candidates: [] };
  }

  if (passing.length === 1) {
    return { match: passing[0].cand, confidence: 'verified', candidates: [passing[0].cand] };
  }

  // If top candidate is significantly ahead of second candidate
  if (passing[0].score - passing[1].score >= 10) {
    return { match: passing[0].cand, confidence: 'verified', candidates: passing.map((p) => p.cand) };
  }

  // Ambiguous: multiple close candidates
  return { match: passing[0].cand, confidence: 'ambiguous', candidates: passing.map((p) => p.cand) };
}

// 3. Dual Provider Search Orchestrator
export async function executeDualSearch(
  query: string,
  page: number = 1,
  fallbackCatalog: MediaItem[] = [],
  signal?: AbortSignal
): Promise<DualSearchResponse> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return { items: [], total: 0, hasMore: false, tmdbCount: 0, movieBoxCount: 0, matchedCount: 0 };
  }

  // Run both requests concurrently
  const [tmdbResult, movieBoxResult] = await Promise.allSettled([
    searchTmdb(cleanQuery, page),
    searchMovieBox(cleanQuery, page, 24, signal),
  ]);

  const tmdbItems: MediaItem[] = tmdbResult.status === 'fulfilled' ? tmdbResult.value.items : [];
  const tmdbHasMore: boolean = tmdbResult.status === 'fulfilled' ? tmdbResult.value.hasMore : false;
  const tmdbTotal: number = tmdbResult.status === 'fulfilled' ? tmdbResult.value.total : 0;

  const movieBoxItems: MediaItem[] = movieBoxResult.status === 'fulfilled' ? movieBoxResult.value.items : [];
  const movieBoxHasMore: boolean = movieBoxResult.status === 'fulfilled' ? movieBoxResult.value.hasMore : false;
  const movieBoxTotal: number = movieBoxResult.status === 'fulfilled' ? movieBoxResult.value.total : 0;

  // Track matched MovieBox IDs to append remaining unmatched MovieBox catalogue titles
  const matchedMovieBoxIds = new Set<string>();
  let matchedCount = 0;

  // Process TMDB items as primary presentation layer
  const combined: MediaItem[] = tmdbItems.map((tmdbItem) => {
    const { match, confidence } = findBestMovieBoxMatch(tmdbItem, movieBoxItems);

    if (match) {
      const subjectId = match.movieBoxSubjectId || match.id.replace(/^mb-/, '');
      matchedMovieBoxIds.add(match.id);
      matchedMovieBoxIds.add(subjectId);
      matchedCount++;

      return {
        ...tmdbItem,
        movieBoxSubjectId: subjectId,
        hasMovieBoxMatch: true,
        matchConfidence: confidence,
        streamStatus: 'unverified',
        fallbackPosterUrl: match.posterUrl || undefined,
        fallbackBackdropUrl: match.backdropUrl || undefined,
      };
    }

    // Also check local curated catalog for known verified matches
    const localMatch = fallbackCatalog.find((loc) => {
      const isTv = tmdbItem.type === 'series' || tmdbItem.type === 'anime';
      const isLocTv = loc.type === 'series' || loc.type === 'anime';
      return isTv === isLocTv && normalizeTitleForMatching(loc.title) === normalizeTitleForMatching(tmdbItem.title);
    });

    if (localMatch) {
      return {
        ...tmdbItem,
        localCratorId: localMatch.id,
        movieBoxSubjectId: localMatch.movieBoxSubjectId,
        hasMovieBoxMatch: Boolean(localMatch.movieBoxSubjectId),
        matchConfidence: localMatch.movieBoxSubjectId ? 'verified' : 'unmatched',
        streamStatus: localMatch.movieBoxSubjectId ? 'unverified' : 'unavailable',
        fallbackPosterUrl: localMatch.posterUrl,
      };
    }

    return {
      ...tmdbItem,
      hasMovieBoxMatch: false,
      matchConfidence: 'unmatched',
      streamStatus: 'unavailable',
    };
  });

  // Append remaining unmatched MovieBox results as additional streaming catalogue items
  for (const mbItem of movieBoxItems) {
    const rawId = mbItem.movieBoxSubjectId || mbItem.id.replace(/^mb-/, '');
    if (!matchedMovieBoxIds.has(mbItem.id) && !matchedMovieBoxIds.has(rawId)) {
      combined.push({
        ...mbItem,
        movieBoxSubjectId: rawId,
        hasMovieBoxMatch: true,
        matchConfidence: 'verified',
        streamStatus: 'unverified',
      });
    }
  }

  // Graceful degradation: If both external APIs failed or returned zero items, use curated catalog
  if (combined.length === 0) {
    const qLower = cleanQuery.toLowerCase();
    const fallbackMatches = fallbackCatalog.filter((item) => {
      return item.title.toLowerCase().includes(qLower) ||
             (item.originalTitle && item.originalTitle.toLowerCase().includes(qLower)) ||
             item.synopsis.toLowerCase().includes(qLower) ||
             item.genres.some((g) => g.toLowerCase().includes(qLower));
    });

    return {
      items: fallbackMatches,
      total: fallbackMatches.length,
      hasMore: false,
      tmdbCount: 0,
      movieBoxCount: 0,
      matchedCount: 0,
      isUsingFallback: true,
    };
  }

  // Final deduplication by (normalized title + releaseYear + type)
  const seenKeys = new Set<string>();
  const deduplicatedItems: MediaItem[] = [];

  for (const item of combined) {
    const key = `${normalizeTitleForMatching(item.title)}_${item.releaseYear}_${item.type}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      deduplicatedItems.push(item);
    }
  }

  return {
    items: deduplicatedItems,
    total: Math.max(tmdbTotal, movieBoxTotal, deduplicatedItems.length),
    hasMore: tmdbHasMore || movieBoxHasMore,
    tmdbCount: tmdbItems.length,
    movieBoxCount: movieBoxItems.length,
    matchedCount,
    isUsingFallback: false,
  };
}
